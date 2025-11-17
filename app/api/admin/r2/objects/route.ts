import { NextRequest, NextResponse } from 'next/server'

import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import {
  R2ConfigurationError,
  R2RequestError,
  getR2StatusSummary,
  listR2Objects,
  uploadR2Object,
} from '@/lib/server/r2-storage'

export const runtime = 'nodejs'

function buildErrorResponse(error: unknown) {
  if (error instanceof R2ConfigurationError) {
    return {
      status: 400,
      body: { error: error.message, missing: error.missing },
    }
  }
  if (error instanceof R2RequestError) {
    const details = typeof error.details === 'string' ? error.details : undefined
    return {
      status: error.status ?? 502,
      body: {
        error: error.message,
        code: error.code ?? 'R2_REQUEST_FAILED',
        details,
      },
    }
  }
  if (error instanceof Error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }
  return {
    status: 500,
    body: { error: '未知错误' },
  }
}

export async function GET(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status ?? 401 })
  }

  const status = getR2StatusSummary()
  if (!status.configured) {
    return NextResponse.json(
      { success: false, error: 'Cloudflare R2 尚未配置', status },
      { status: 200 },
    )
  }

  const searchParams = request.nextUrl.searchParams
  const prefix = searchParams.get('prefix') ?? ''
  const limitParam = searchParams.get('limit')
  const continuationToken = searchParams.get('token')
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined

  try {
    const result = await listR2Objects({
      prefix,
      continuationToken: continuationToken || undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[admin:r2] 列表请求失败', {
      prefix,
      limit: parsedLimit,
      token: continuationToken,
      message: (error as Error)?.message,
    })
    const { status, body } = buildErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status ?? 401 })
  }

  const status = getR2StatusSummary()
  if (!status.configured) {
    return NextResponse.json(
      { success: false, error: 'Cloudflare R2 尚未配置', status },
      { status: 200 },
    )
  }

  try {
    const formData = await request.formData()
    const fileEntry = formData.get('file')
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: '请上传需要保存的文件' }, { status: 400 })
    }

    const folderEntry = formData.get('folder')
    const customNameEntry = formData.get('filename')

    const providedName =
      typeof customNameEntry === 'string' && customNameEntry.trim()
        ? customNameEntry.trim()
        : fileEntry.name?.trim()

    const fileName = providedName && providedName.length > 0 ? providedName : `upload-${Date.now()}`
    const arrayBuffer = await fileEntry.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await uploadR2Object({
      fileName,
      folder: typeof folderEntry === 'string' ? folderEntry : undefined,
      contentType: fileEntry.type || undefined,
      body: buffer,
    })

    return NextResponse.json({
      success: true,
      key: result.key,
      size: buffer.length,
      etag: result.etag,
      publicUrl: result.publicUrl,
    })
  } catch (error) {
    console.error('[admin:r2] 上传失败', {
      message: (error as Error)?.message,
    })
    const { status, body } = buildErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
