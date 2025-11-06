import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { generateToken } from '@/lib/auth/jwt'
import { verifyCode } from '@/lib/email'

const WEAPP_PROVIDER = 'wechat_miniprogram'
const PLACEHOLDER_SUFFIX = '@wechat-placeholder.local'

export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const email = (body?.email as string | undefined)?.trim()
    const code = (body?.code as string | undefined)?.trim()
    const keep = (body?.keep as 'mini' | 'web' | undefined) ?? 'mini'

    if (!email || !code) {
      return NextResponse.json(
        { error: '请提供邮箱和验证码' },
        { status: 400 }
      )
    }

    if (!verifyCode(email, code)) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
      include: {
        accounts: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    if (currentUser.email === email) {
      const token = generateToken({
        id: currentUser.id,
        email: currentUser.email,
        callsign: currentUser.callsign ?? undefined,
      })

      return NextResponse.json({
        success: true,
        message: '邮箱已绑定',
        data: {
          token,
          user: {
            id: currentUser.id,
            email: currentUser.email,
            callsign: currentUser.callsign,
          },
        },
      })
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
      },
    })

    // 没有冲突，直接更新当前用户邮箱
    if (!targetUser) {
      const updated = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          email,
          emailVerified: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: '邮箱绑定成功',
        data: {
          token: generateToken({
            id: updated.id,
            email: updated.email,
            callsign: updated.callsign ?? undefined,
          }),
          user: {
            id: updated.id,
            email: updated.email,
            callsign: updated.callsign,
          },
        },
      })
    }

    if (targetUser.id === currentUser.id) {
      const token = generateToken({
        id: currentUser.id,
        email: currentUser.email,
        callsign: currentUser.callsign ?? undefined,
      })

      return NextResponse.json({
        success: true,
        message: '邮箱已绑定',
        data: {
          token,
          user: {
            id: currentUser.id,
            email: currentUser.email,
            callsign: currentUser.callsign,
          },
        },
      })
    }

    if (!['mini', 'web'].includes(keep)) {
      return NextResponse.json(
        { error: '请选择保留数据的来源（mini 或 web）' },
        { status: 400 }
      )
    }

    if (keep === 'mini') {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.user.delete({
          where: { id: targetUser.id },
        })

        return tx.user.update({
          where: { id: currentUser.id },
          data: {
            email,
            emailVerified: new Date(),
          },
        })
      })

      const token = generateToken({
        id: updated.id,
        email: updated.email,
        callsign: updated.callsign ?? undefined,
      })

      return NextResponse.json({
        success: true,
        message: '已保留小程序数据并绑定邮箱',
        data: {
          token,
          user: {
            id: updated.id,
            email: updated.email,
            callsign: updated.callsign,
          },
        },
      })
    }

    // keep === 'web'
    const weappAccounts = currentUser.accounts.filter(
      (account) => account.provider === WEAPP_PROVIDER
    )

    if (weappAccounts.length === 0) {
      return NextResponse.json(
        { error: '当前账户未关联微信登录信息' },
        { status: 400 }
      )
    }

    const finalUser = await prisma.$transaction(async (tx) => {
      for (const account of weappAccounts) {
        await tx.account.update({
          where: { id: account.id },
          data: {
            userId: targetUser.id,
          },
        })
      }

      await tx.user.delete({
        where: { id: currentUser.id },
      })

      return tx.user.findUnique({
        where: { id: targetUser.id },
      })
    })

    if (!finalUser) {
      return NextResponse.json(
        { error: '未能完成数据迁移，请重试' },
        { status: 500 }
      )
    }

    const token = generateToken({
      id: finalUser.id,
      email: finalUser.email,
      callsign: finalUser.callsign ?? undefined,
    })

    return NextResponse.json({
      success: true,
      message: '已保留邮箱数据并绑定微信账号',
      data: {
        token,
        user: {
          id: finalUser.id,
          email: finalUser.email,
          callsign: finalUser.callsign,
        },
      },
    })
  } catch (error) {
    console.error('[WeAppBindEmail] unexpected error:', error)
    return NextResponse.json(
      { error: '绑定邮箱失败，请稍后再试' },
      { status: 500 }
    )
  }
}
