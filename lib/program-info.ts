import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

import { XMLBuilder, XMLParser } from 'fast-xml-parser'

export interface ProgramMetadata {
  name: string
  author: string
  contactEmail?: string
  homepage?: string
  supportLink?: string
  repository?: string
  lastUpdated?: string
}

export interface ProgramDocument {
  format: string
  content: string
}

export interface ProgramDocuments {
  termsOfService: ProgramDocument
  privacyPolicy: ProgramDocument
  changelog?: ProgramDocument
}

export interface ProgramVersionInfo {
  packageVersion: string
  gitCommit: string
  combined: string
}

export interface ProgramInfo {
  metadata: ProgramMetadata
  documents: ProgramDocuments
  version: ProgramVersionInfo
}

export interface ProgramInfoUpdate {
  metadata?: Partial<ProgramMetadata>
  documents?: Partial<Record<'termsOfService' | 'privacyPolicy' | 'changelog', Partial<ProgramDocument> & { content: string }>>
}

const PROGRAM_INFO_PATH = path.join(process.cwd(), 'config/program-info.xml')

const DEFAULT_PROGRAM_INFO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<programInfo>
  <metadata>
    <name>中国业余无线电刷题系统</name>
    <author>项目维护者</author>
    <contactEmail>support@example.com</contactEmail>
    <homepage>https://example.com</homepage>
    <supportLink>https://example.com/support</supportLink>
    <repository>https://example.com/repo</repository>
    <lastUpdated>2025-01-01</lastUpdated>
  </metadata>
  <documents>
    <termsOfService format="markdown"><![CDATA[
## 服务条款

感谢使用“中国业余无线电刷题系统”。使用本系统即表示您同意以下条款：

1. 本系统仅用于学习和考前练习，不提供任何形式的考试答案泄露。
2. 请勿将本系统用于任何商业用途，除非获得项目维护者的书面授权。
3. 系统提供的题目、解析及其他内容仅做参考，如与官方考试要求有差异，请以官方说明为准。
4. 使用过程中如需收集个人信息（如邮箱），仅用于身份验证及学习数据统计，未经许可不会对外披露。
5. 任何因使用本系统而产生的直接或间接损失，项目维护者不承担法律责任。

如有疑问，请联系 support@example.com。
    ]]></termsOfService>
    <privacyPolicy format="markdown"><![CDATA[
## 隐私政策

我们非常重视用户的隐私保护，相关说明如下：

- **收集内容**：注册或登录时可能收集您的邮箱、昵称和日志数据；练习及考试过程中可能记录您的答题记录、错题本以及积分信息。
- **数据用途**：用于提供题库练习、错题分析、积分计算等核心功能，以改进学习体验。
- **数据安全**：所有数据仅供本系统内部使用，未经允许不会对外分享；我们将采取合理措施保护您的数据安全。
- **第三方服务**：若启用 AI 解析等功能，我们可能会将匿名化的题目内容发送至第三方 AI 服务提供商，且不会包含与个人身份相关的信息。
- **用户权利**：您可以随时发起数据导出或删除请求，我们将在合理时间内处理。

如需了解更多隐私相关问题，请发送邮件至 support@example.com。
    ]]></privacyPolicy>
    <changelog format="markdown"><![CDATA[
## 更新记录

- 2025-01-01：初始化项目配置与法律文档。
    ]]></changelog>
  </documents>
</programInfo>
`

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  cdataPropName: '__cdata',
  trimValues: true,
  textNodeName: '__text',
} as const

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  cdataPropName: '__cdata',
  format: true,
  suppressEmptyNode: true,
} as const

type RawProgramInfo = {
  programInfo: {
    metadata: Record<string, string | undefined>
    documents: Record<string, unknown>
  }
}

type RawDocument = {
  format?: string
  __cdata?: string
  __text?: string
} | string | undefined

async function ensureProgramInfoFile(): Promise<void> {
  await fs.mkdir(path.dirname(PROGRAM_INFO_PATH), { recursive: true })
  try {
    await fs.access(PROGRAM_INFO_PATH)
  } catch {
    await fs.writeFile(PROGRAM_INFO_PATH, DEFAULT_PROGRAM_INFO_XML, 'utf-8')
  }
}

function normaliseDocument(rawDoc: RawDocument, fallbackFormat = 'markdown'): ProgramDocument {
  if (rawDoc == null) {
    return {
      format: fallbackFormat,
      content: '',
    }
  }

  if (typeof rawDoc === 'string') {
    return {
      format: fallbackFormat,
      content: rawDoc,
    }
  }

  const format = rawDoc.format?.trim() || fallbackFormat
  const content = rawDoc.__cdata ?? rawDoc.__text ?? ''

  return {
    format,
    content,
  }
}

function toRawDocument(doc: ProgramDocument, fallback: RawDocument | null = null): { format?: string; __cdata: string } {
  const fallbackFormat =
    typeof fallback === 'object' && fallback !== null && 'format' in fallback && fallback.format
      ? String(fallback.format)
      : undefined

  const format = doc.format?.trim() || (fallbackFormat ?? 'markdown')
  const content = doc.content ?? ''

  return {
    format,
    __cdata: content,
  }
}

async function readRawProgramInfo(): Promise<RawProgramInfo> {
  await ensureProgramInfoFile()
  const xml = await fs.readFile(PROGRAM_INFO_PATH, 'utf-8')
  const parser = new XMLParser(parserOptions)
  const parsed = parser.parse(xml) as Partial<RawProgramInfo> & { '?xml'?: unknown }

  if (!parsed || !parsed.programInfo) {
    throw new Error('Invalid program-info.xml structure')
  }

  return parsed as RawProgramInfo
}

async function computeVersionInfo(): Promise<ProgramVersionInfo> {
  let packageVersion = '0.0.0'
  let gitCommit = 'unknown'

  try {
    const pkgRaw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw) as { version?: string }
    if (pkg.version) {
      packageVersion = pkg.version
    }
  } catch (error) {
    console.error('[program-info] Failed to read package.json version:', error)
  }

  try {
    gitCommit = execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      encoding: 'utf-8',
    })
      .trim()
      .replace(/\s+/g, '')
    if (!gitCommit) {
      gitCommit = 'unknown'
    }
  } catch (error) {
    console.error('[program-info] Failed to resolve git commit hash:', error)
  }

  const combined = gitCommit === 'unknown' ? packageVersion : `${packageVersion} (${gitCommit})`

  return {
    packageVersion,
    gitCommit,
    combined,
  }
}

function sanitiseMetadata(raw: Record<string, string | undefined>): ProgramMetadata {
  return {
    name: raw.name?.trim() ?? '中国业余无线电刷题系统',
    author: raw.author?.trim() ?? '项目维护者',
    contactEmail: raw.contactEmail?.trim(),
    homepage: raw.homepage?.trim(),
    supportLink: raw.supportLink?.trim(),
    repository: raw.repository?.trim(),
    lastUpdated: raw.lastUpdated?.trim(),
  }
}

export async function getProgramInfo(): Promise<ProgramInfo> {
  const raw = await readRawProgramInfo()
  const metadata = sanitiseMetadata(raw.programInfo.metadata ?? {})
  const documentsRaw = raw.programInfo.documents ?? {}

  const terms = normaliseDocument(documentsRaw.termsOfService, 'markdown')
  const privacy = normaliseDocument(documentsRaw.privacyPolicy, 'markdown')
  const changelogDoc = documentsRaw.changelog ? normaliseDocument(documentsRaw.changelog, 'markdown') : undefined

  return {
    metadata,
    documents: {
      termsOfService: terms,
      privacyPolicy: privacy,
      ...(changelogDoc ? { changelog: changelogDoc } : {}),
    },
    version: await computeVersionInfo(),
  }
}

export async function updateProgramInfo(update: ProgramInfoUpdate): Promise<ProgramInfo> {
  const raw = await readRawProgramInfo()

  const metadataRaw = raw.programInfo.metadata ?? {}
  const documentsRaw = raw.programInfo.documents ?? {}

  const nextMetadata: Record<string, string> = {
    ...metadataRaw,
  }

  if (update.metadata) {
    for (const [key, value] of Object.entries(update.metadata)) {
      if (typeof value === 'string') {
        nextMetadata[key] = value.trim()
      } else if (value === undefined || value === null) {
        delete nextMetadata[key]
      }
    }
  }

  const nextDocuments: Record<string, RawDocument> = {
    ...documentsRaw,
  }

  if (update.documents) {
    for (const [docKey, docValue] of Object.entries(update.documents)) {
      if (!docValue) {
        continue
      }
      const existingRaw = documentsRaw[docKey]
      const format =
        typeof docValue.format === 'string' && docValue.format.trim().length > 0
          ? docValue.format.trim()
          : undefined
      const content = docValue.content ?? ''

      nextDocuments[docKey] = toRawDocument(
        {
          format: format ?? normaliseDocument(existingRaw).format,
          content,
        },
        existingRaw ?? null
      )
    }
  }

  const builder = new XMLBuilder(builderOptions)
  const xmlObject = {
    programInfo: {
      metadata: nextMetadata,
      documents: nextDocuments,
    },
  }

  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(xmlObject)}`
  await fs.writeFile(PROGRAM_INFO_PATH, xmlString, 'utf-8')

  return getProgramInfo()
}
