import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { migrateGuestDataByCode } from '@/lib/auth/guest-migration'

async function getSessionUserId() {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userType: true,
        migrationPromptedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      required: user.userType !== 'GUEST' && !user.migrationPromptedAt,
    })
  } catch (error) {
    console.error('Get guest migration status failed:', error)
    return NextResponse.json({ error: '无法获取迁移状态。' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' ? body.action : 'migrate'

    if (action === 'skip') {
      await prisma.user.update({
        where: { id: userId },
        data: { migrationPromptedAt: new Date() },
      })
      return NextResponse.json({ success: true, skipped: true })
    }

    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!code) {
      return NextResponse.json({ error: '请输入迁移码。' }, { status: 400 })
    }

    await migrateGuestDataByCode(code, userId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Guest migration failed:', error)
    return NextResponse.json(
      { error: error?.message ?? '迁移失败，请稍后再试。' },
      { status: 400 },
    )
  }
}
