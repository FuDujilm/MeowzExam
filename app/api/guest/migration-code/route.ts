import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'
import { createGuestMigrationCode } from '@/lib/auth/guest-migration'

export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request, { allowGuest: true })

    if (!resolvedUser?.isGuest) {
      return NextResponse.json(
        { error: '当前不是匿名用户，无需生成迁移码。' },
        { status: 400 },
      )
    }

    const code = await createGuestMigrationCode(resolvedUser.id)
    return attachGuestCookieIfNeeded(
      NextResponse.json({
        code: code.code,
        expiresAt: code.expiresAt.toISOString(),
      }),
      resolvedUser,
    )
  } catch (error) {
    console.error('Create guest migration code failed:', error)
    return NextResponse.json({ error: '生成迁移码失败。' }, { status: 500 })
  }
}
