import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { getSiteConfig, updateSiteConfig } from '@/lib/site-config'
import { isAdminEmail } from '@/lib/auth/admin'

export async function GET() {
  const config = await getSiteConfig()
  return NextResponse.json(config)
}

export async function PUT(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: '权限不足：需要管理员权限' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const payload = {
      siteTitle: typeof body.siteTitle === 'string' ? body.siteTitle : undefined,
      siteDescription: typeof body.siteDescription === 'string' ? body.siteDescription : undefined,
      seoKeywords: typeof body.seoKeywords === 'string' ? body.seoKeywords : undefined,
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : undefined,
      faviconUrl: typeof body.faviconUrl === 'string' ? body.faviconUrl : undefined,
      ogImageUrl: typeof body.ogImageUrl === 'string' ? body.ogImageUrl : undefined,
      headerContent: typeof body.headerContent === 'string' ? body.headerContent : undefined,
      footerContent: typeof body.footerContent === 'string' ? body.footerContent : undefined,
      gravatarMirrorUrl: typeof body.gravatarMirrorUrl === 'string' ? body.gravatarMirrorUrl : undefined,
    }

    const updated = await updateSiteConfig(payload)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[site-config] 更新失败:', error)
    return NextResponse.json({ error: '更新站点信息失败' }, { status: 500 })
  }
}
