import { NextRequest, NextResponse } from 'next/server'

import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { R2ConfigurationError, R2RequestError, deleteR2Object, getR2StatusSummary } from '@/lib/server/r2-storage'

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

export async function DELETE(request: NextRequest) {
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
    let key: string | null = null
    try {
      const payload = await request.json()
      if (payload && typeof payload.key === 'string') {
        key = payload.key
      }
    } catch (error) {
      console.warn('[admin:r2] Failed to parse delete payload', error)
    }

    if (!key) {
      const queryKey = request.nextUrl.searchParams.get('key')
      key = queryKey
    }

    if (!key || !key.trim()) {
      return NextResponse.json({ error: '缺少要删除的对象 key' }, { status: 400 })
    }

    const result = await deleteR2Object(key)
    return NextResponse.json({ success: true, key: result.key })
  } catch (error) {
    console.error('[admin:r2] 删除失败', {
      key: request.nextUrl.searchParams.get('key'),
      message: (error as Error)?.message,
    })
    const { status, body } = buildErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
