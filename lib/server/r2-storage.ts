import crypto from 'crypto'

import { XMLParser } from 'fast-xml-parser'
import process from 'process'
import type { Dispatcher } from 'undici'

const AWS_REGION = 'auto'
const AWS_SERVICE = 's3'
const DEFAULT_BASE_PREFIX = 'question-images'
const MAX_LIST_LIMIT = 500

type R2EnvConfig = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicBaseUrl: string
  basePrefix: string
}

type R2ResolvedEnvironment = {
  config: R2EnvConfig
  endpoint: string
  hostname: string
  publicBaseUrl: string
  configured: boolean
  missing: string[]
}

type R2RequestOptions = {
  method: 'GET' | 'PUT' | 'DELETE'
  key?: string
  query?: Record<string, string | undefined>
  headers?: Record<string, string | undefined>
  body?: Buffer | Uint8Array | string | null
}

export type R2ObjectSummary = {
  key: string
  size: number
  lastModified: string | null
  etag: string | null
  publicUrl: string | null
}

export type R2ListResponse = {
  objects: R2ObjectSummary[]
  hasMore: boolean
  continuationToken: string | null
}

export type R2UploadResult = {
  key: string
  etag: string | null
  publicUrl: string | null
}

export type R2StatusSummary = {
  configured: boolean
  accountId?: string
  bucketName?: string
  endpoint?: string
  basePrefix?: string
  publicBaseUrl?: string | null
  samplePublicUrl?: string | null
  missing: string[]
}

export class R2ConfigurationError extends Error {
  missing: string[]

  constructor(message: string, missing: string[] = []) {
    super(message)
    this.name = 'R2ConfigurationError'
    this.missing = missing
  }
}

export class R2RequestError extends Error {
  status?: number
  code?: string
  details?: unknown

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message)
    this.name = 'R2RequestError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
  parseTagValue: false,
})

function readEnvValue(keys: string[]) {
  for (const key of keys) {
    const raw = process.env[key]
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim()
    }
  }
  return ''
}

function sanitizeKeySegment(segment: string) {
  const trimmed = segment.trim().replace(/^[\/]+|[\/]+$/g, '')
  if (!trimmed || trimmed === '.' || trimmed === '..') {
    return ''
  }
  return trimmed.replace(/[\u0000-\u001f\u007f]/g, '')
}

function sanitizeKeyPrefix(value?: string | null) {
  if (!value) return ''
  const parts = value
    .replace(/\\/g, '/')
    .split('/')
    .map(sanitizeKeySegment)
    .filter(Boolean)
  return parts.join('/')
}

function sanitizeFileName(value: string) {
  const fallback = `asset-${Date.now()}`
  if (!value) return fallback
  const base = value.replace(/\\/g, '/').split('/').pop() ?? ''
  const trimmed = base.trim().replace(/[\u0000-\u001f\u007f]/g, '')
  if (!trimmed || trimmed === '.' || trimmed === '..') {
    return fallback
  }
  return trimmed
}

function joinKeyParts(parts: Array<string | undefined | null>) {
  return parts
    .map((part) => sanitizeKeyPrefix(part ?? ''))
    .filter(Boolean)
    .join('/')
}

function resolveR2Environment(): R2ResolvedEnvironment {
  const accountId = readEnvValue(['CF_R2_ACCOUNT_ID', 'R2_ACCOUNT_ID'])
  const accessKeyId = readEnvValue(['CF_R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID'])
  const secretAccessKey = readEnvValue(['CF_R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY'])
  const bucketName = readEnvValue(['CF_R2_BUCKET_NAME', 'R2_BUCKET_NAME'])
  const rawPublicBase = readEnvValue(['CF_R2_PUBLIC_BASE_URL', 'R2_PUBLIC_BASE_URL'])
  const prefixCandidate = readEnvValue(['CF_R2_BASE_PREFIX', 'R2_BASE_PREFIX'])

  const missing: string[] = []
  if (!accountId) missing.push('CF_R2_ACCOUNT_ID')
  if (!accessKeyId) missing.push('CF_R2_ACCESS_KEY_ID')
  if (!secretAccessKey) missing.push('CF_R2_SECRET_ACCESS_KEY')
  if (!bucketName) missing.push('CF_R2_BUCKET_NAME')

  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''
  const basePrefix = sanitizeKeyPrefix(prefixCandidate || DEFAULT_BASE_PREFIX)
  const publicBaseCandidate = rawPublicBase || (endpoint && bucketName ? `${endpoint}/${bucketName}` : '')
  const publicBaseUrl = publicBaseCandidate ? publicBaseCandidate.replace(/\/+$/, '') : ''

  return {
    config: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicBaseUrl,
      basePrefix,
    },
    endpoint,
    hostname: endpoint ? new URL(endpoint).host : '',
    publicBaseUrl,
    configured: missing.length === 0,
    missing,
  }
}

function ensureR2Environment(): R2ResolvedEnvironment {
  const env = resolveR2Environment()
  if (!env.configured) {
    throw new R2ConfigurationError('Cloudflare R2 尚未配置完成', env.missing)
  }
  return env
}

function toBuffer(data?: Buffer | Uint8Array | string | null) {
  if (!data) return Buffer.alloc(0)
  if (typeof data === 'string') return Buffer.from(data)
  if (Buffer.isBuffer(data)) return data
  return Buffer.from(data)
}

function bufferToArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length)
  new Uint8Array(arrayBuffer).set(buffer)
  return arrayBuffer
}

function sha256Hex(data: Buffer) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function hmacSha256(key: crypto.BinaryLike, data: string) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function buildCanonicalQuery(query: Record<string, string | undefined>) {
  const pairs = Object.entries(query)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value as string)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
  return pairs.map(([key, value]) => `${key}=${value}`).join('&')
}

function encodeKeyPath(bucket: string, key?: string) {
  const bucketSegment = encodeURIComponent(bucket)
  if (!key) {
    return `/${bucketSegment}`
  }
  const segments = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `/${bucketSegment}/${segments}`
}

function buildCanonicalHeaders(hostname: string, extra: Record<string, string>) {
  const headerEntries = Object.entries({ host: hostname, ...extra })
    .map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([a], [b]) => a.localeCompare(b))

  const canonicalHeaders = headerEntries.map(([key, value]) => `${key}:${value}\n`).join('')
  const signedHeaders = headerEntries.map(([key]) => key).join(';')

  return { canonicalHeaders, signedHeaders }
}

function buildSigningKey(secret: string, dateStamp: string) {
  const kSecret = `AWS4${secret}`
  const kDate = hmacSha256(kSecret, dateStamp)
  const kRegion = hmacSha256(kDate, AWS_REGION)
  const kService = hmacSha256(kRegion, AWS_SERVICE)
  return hmacSha256(kService, 'aws4_request')
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return false
}

function normaliseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseListObjectsResponse(env: R2ResolvedEnvironment, xml: string): R2ListResponse {
  const parsed = xmlParser.parse(xml)
  const result = parsed?.ListBucketResult
  if (!result) {
    throw new R2RequestError('无法解析 R2 返回结果', { details: xml })
  }
  const contents: unknown[] = Array.isArray(result.Contents)
    ? result.Contents
    : result.Contents
    ? [result.Contents]
    : []

  const objects: R2ObjectSummary[] = contents
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const entry = item as Record<string, unknown>
      const key = typeof entry.Key === 'string' ? entry.Key : ''
      if (!key) return null

      const sizeRaw = typeof entry.Size === 'number'
        ? entry.Size
        : typeof entry.Size === 'string'
          ? Number.parseInt(entry.Size, 10)
          : Number.NaN

      const lastModifiedValue = typeof entry.LastModified === 'string' ? entry.LastModified : null
      const etagRaw = typeof entry.ETag === 'string' ? entry.ETag : null

      return {
        key,
        size: Number.isNaN(sizeRaw) ? 0 : sizeRaw,
        lastModified: normaliseDate(lastModifiedValue),
        etag: etagRaw ? etagRaw.replace(/"/g, '') : null,
        publicUrl: buildPublicUrl(env, key),
      }
    })
    .filter((item): item is R2ObjectSummary => Boolean(item))

  return {
    objects,
    hasMore: parseBoolean(result.IsTruncated),
    continuationToken: typeof result.NextContinuationToken === 'string' ? result.NextContinuationToken : null,
  }
}

function parseErrorResponse(body: string) {
  try {
    const parsed = xmlParser.parse(body)
    if (parsed?.Error) {
      return parsed.Error
    }
  } catch (error) {
    console.error('[r2] Failed to parse error response', error)
  }
  return null
}

async function sendR2Request(env: R2ResolvedEnvironment, options: R2RequestOptions) {
  const bodyBuffer = toBuffer(options.body ?? null)
  const payloadHash = sha256Hex(bodyBuffer)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const additionalHeaders: Record<string, string> = {}
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (value != null && value !== '') {
        additionalHeaders[key] = value
      }
    }
  }

  const canonicalQuery = buildCanonicalQuery(options.query ?? {})
  const canonicalHeaders = buildCanonicalHeaders(env.hostname, {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...additionalHeaders,
  })

  const canonicalRequest = [
    options.method,
    encodeKeyPath(env.config.bucketName, options.key),
    canonicalQuery,
    canonicalHeaders.canonicalHeaders,
    canonicalHeaders.signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/aws4_request`,
    sha256Hex(Buffer.from(canonicalRequest)),
  ].join('\n')

  const signingKey = buildSigningKey(env.config.secretAccessKey, dateStamp)
  const signature = hmacSha256(signingKey, stringToSign).toString('hex')

  const authorization = `AWS4-HMAC-SHA256 Credential=${env.config.accessKeyId}/${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/aws4_request, SignedHeaders=${canonicalHeaders.signedHeaders}, Signature=${signature}`

  const requestHeaders = new Headers()
  requestHeaders.set('x-amz-content-sha256', payloadHash)
  requestHeaders.set('x-amz-date', amzDate)
  requestHeaders.set('authorization', authorization)
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    requestHeaders.set(key, value)
  })

  const url = `${env.endpoint}${encodeKeyPath(env.config.bucketName, options.key)}${canonicalQuery ? `?${canonicalQuery}` : ''}`

  const disableProxy = parseBoolean(process.env.CF_R2_DISABLE_PROXY ?? process.env.R2_DISABLE_PROXY)
  const proxyUrl = disableProxy
    ? null
    : process.env.CF_R2_HTTP_PROXY ?? process.env.R2_HTTP_PROXY ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? null

  let response: Response
  try {
    const fetchBody = bodyBuffer.length ? bufferToArrayBuffer(bodyBuffer) : undefined

    const fetchOptions: RequestInit & { dispatcher?: Dispatcher } = {
      method: options.method,
      headers: requestHeaders,
      body: fetchBody,
    }

    if (proxyUrl) {
      try {
        const { ProxyAgent } = await import('undici')
        fetchOptions.dispatcher = new ProxyAgent(proxyUrl)
      } catch (error) {
        console.warn('[r2] ProxyAgent 加载失败，继续使用默认网络', error)
      }
    }

    response = await fetch(url, fetchOptions)
  } catch (error) {
    console.error('[r2] 请求失败：无法连接', {
      method: options.method,
      key: options.key,
      message: (error as Error)?.message,
      proxy: proxyUrl ?? null,
    })
    throw new R2RequestError('无法连接到 Cloudflare R2', { details: error })
  }

  if (!response.ok) {
    const errorBody = await response.text()
    const errorInfo = parseErrorResponse(errorBody)
    console.error('[r2] 请求失败：响应异常', {
      method: options.method,
      key: options.key,
      status: response.status,
      code: errorInfo?.Code,
      message: errorInfo?.Message ?? errorBody,
    })
    throw new R2RequestError(errorInfo?.Message ?? 'Cloudflare R2 请求失败', {
      status: response.status,
      code: errorInfo?.Code,
      details: errorInfo ?? errorBody,
    })
  }

  return response
}

function buildPublicUrl(env: R2ResolvedEnvironment, key: string) {
  if (!env.publicBaseUrl) return null
  const encoded = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${env.publicBaseUrl}/${encoded}`
}

function ensureKeyWithinPrefix(env: R2ResolvedEnvironment, key: string) {
  const sanitized = key.replace(/\\/g, '/').replace(/^\/+/, '').trim()
  if (!sanitized) {
    throw new Error('对象键不能为空')
  }
  const normalised = sanitized
    .split('/')
    .map(sanitizeKeySegment)
    .filter(Boolean)
    .join('/')
  if (!normalised) {
    throw new Error('对象键不合法')
  }
  if (env.config.basePrefix && normalised !== env.config.basePrefix && !normalised.startsWith(`${env.config.basePrefix}/`)) {
    throw new Error('对象键超出允许的前缀范围')
  }
  return normalised
}

export function getR2StatusSummary(): R2StatusSummary {
  const env = resolveR2Environment()
  const sampleKey = env.config.basePrefix
    ? `${env.config.basePrefix}/示例图片.png`
    : '示例图片.png'
  return {
    configured: env.configured,
    accountId: env.config.accountId || undefined,
    bucketName: env.config.bucketName || undefined,
    endpoint: env.endpoint || undefined,
    basePrefix: env.config.basePrefix || undefined,
    publicBaseUrl: env.publicBaseUrl || null,
    samplePublicUrl: env.publicBaseUrl ? `${env.publicBaseUrl}/${sampleKey}` : null,
    missing: env.missing,
  }
}

export function buildR2PublicUrl(key: string) {
  const env = resolveR2Environment()
  if (!env.configured || !key) {
    return null
  }
  return buildPublicUrl(env, key)
}

export async function uploadR2Object(options: {
  fileName: string
  folder?: string
  contentType?: string
  body: Buffer | Uint8Array | string
}): Promise<R2UploadResult> {
  const env = ensureR2Environment()
  const folder = sanitizeKeyPrefix(options.folder ?? '')
  const finalKey = joinKeyParts([
    env.config.basePrefix,
    folder,
    sanitizeFileName(options.fileName),
  ])

  if (!finalKey) {
    throw new Error('无法生成上传对象键，请检查文件名或目录设置')
  }

  const headers: Record<string, string | undefined> = {}
  if (options.contentType) {
    headers['content-type'] = options.contentType
  }

  const response = await sendR2Request(env, {
    method: 'PUT',
    key: finalKey,
    headers,
    body: toBuffer(options.body),
  })

  const etag = response.headers.get('etag')

  return {
    key: finalKey,
    etag: etag ? etag.replace(/"/g, '') : null,
    publicUrl: buildPublicUrl(env, finalKey),
  }
}

export async function listR2Objects(options: {
  prefix?: string
  limit?: number
  continuationToken?: string | null
} = {}): Promise<R2ListResponse> {
  const env = ensureR2Environment()
  const userPrefix = sanitizeKeyPrefix(options.prefix ?? '')
  const finalPrefix = joinKeyParts([env.config.basePrefix, userPrefix])
  const limit = Math.min(Math.max(options.limit ?? 50, 1), MAX_LIST_LIMIT)

  const response = await sendR2Request(env, {
    method: 'GET',
    key: undefined,
    query: {
      'list-type': '2',
      'max-keys': limit.toString(),
      prefix: finalPrefix || undefined,
      'continuation-token': options.continuationToken || undefined,
    },
  })

  const body = await response.text()
  return parseListObjectsResponse(env, body)
}

export async function deleteR2Object(key: string) {
  const env = ensureR2Environment()
  const normalisedKey = ensureKeyWithinPrefix(env, key)
  await sendR2Request(env, {
    method: 'DELETE',
    key: normalisedKey,
  })
  return { key: normalisedKey }
}
