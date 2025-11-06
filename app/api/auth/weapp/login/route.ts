import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth/jwt'

const WECHAT_API = 'https://api.weixin.qq.com/sns/jscode2session'
const WEAPP_PROVIDER = 'wechat_miniprogram'
const PLACEHOLDER_SUFFIX = '@wechat-placeholder.local'

interface WeappLoginResponse {
  openid: string
  session_key: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = body?.code as string | undefined

    if (!code) {
      return NextResponse.json(
        { success: false, message: '缺少微信登录 code' },
        { status: 400 }
      )
    }

    const appId = process.env.WECHAT_MINIAPP_APPID
    const appSecret = process.env.WECHAT_MINIAPP_SECRET

    if (!appId || !appSecret) {
      console.error('[WeAppLogin] Missing app credentials')
      return NextResponse.json(
        { success: false, message: '未配置微信小程序凭证' },
        { status: 500 }
      )
    }

    const sessionRes = await fetch(
      `${WECHAT_API}?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`,
      { cache: 'no-store' }
    )

    if (!sessionRes.ok) {
      const text = await sessionRes.text()
      console.error('[WeAppLogin] Failed to exchange code:', text)
      return NextResponse.json(
        { success: false, message: '微信鉴权失败' },
        { status: 502 }
      )
    }

    const sessionData = (await sessionRes.json()) as WeappLoginResponse

    if (sessionData.errcode) {
      console.error('[WeAppLogin] Error from WeChat:', sessionData)
      return NextResponse.json(
        { success: false, message: sessionData.errmsg || '微信鉴权失败' },
        { status: 400 }
      )
    }

    const openId = sessionData.openid
    const sessionKey = sessionData.session_key

    if (!openId || !sessionKey) {
      console.error('[WeAppLogin] Missing openid/session_key:', sessionData)
      return NextResponse.json(
        { success: false, message: '微信鉴权信息不完整' },
        { status: 400 }
      )
    }

    const placeholderEmail = `wechat_${openId}${PLACEHOLDER_SUFFIX}`

    const result = await prisma.$transaction(async (tx) => {
      const existingAccount = await tx.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: WEAPP_PROVIDER,
            providerAccountId: openId,
          },
        },
        include: {
          user: {
            include: {
              settings: true,
            },
          },
        },
      })

      if (existingAccount?.user) {
        await tx.account.update({
          where: { id: existingAccount.id },
          data: {
            access_token: sessionKey,
            scope: sessionData.unionid ?? existingAccount.scope ?? undefined,
          },
        })

        const token = generateToken({
          id: existingAccount.user.id,
          email: existingAccount.user.email,
          callsign: existingAccount.user.callsign ?? undefined,
        })

        return {
          user: existingAccount.user,
          token,
        }
      }

      const createdUser = await tx.user.create({
        data: {
          email: placeholderEmail,
          accounts: {
            create: {
              provider: WEAPP_PROVIDER,
              providerAccountId: openId,
              type: 'oauth',
              access_token: sessionKey,
              scope: sessionData.unionid,
            },
          },
          settings: {
            create: {
              enableWrongQuestionWeight: false,
              theme: 'light',
              examType: 'A_CLASS',
            },
          },
        },
        include: {
          settings: true,
        },
      })

      const token = generateToken({
        id: createdUser.id,
        email: createdUser.email,
        callsign: createdUser.callsign ?? undefined,
      })

      return {
        user: createdUser,
        token,
      }
    })

    const userWithSettings = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: {
        settings: true,
      },
    })

    if (!userWithSettings) {
      return NextResponse.json(
        { success: false, message: '用户信息获取失败' },
        { status: 500 }
      )
    }

    const needsEmailBinding = userWithSettings.email.endsWith(PLACEHOLDER_SUFFIX)

    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: userWithSettings.id,
          email: userWithSettings.email,
          callsign: userWithSettings.callsign,
          selectedExamType: userWithSettings.settings?.examType ?? 'A_CLASS',
        },
        needsEmailBinding,
      },
    })
  } catch (error) {
    console.error('[WeAppLogin] unexpected error:', error)
    return NextResponse.json(
      { success: false, message: '微信登录失败，请稍后再试' },
      { status: 500 }
    )
  }
}
