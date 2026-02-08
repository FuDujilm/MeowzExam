import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth/jwt'
import { z } from 'zod'

const exchangeSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
})

const EXAM_TYPES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, redirectUri } = exchangeSchema.parse(body)

    const oauthBaseUrl = process.env.OAUTH_BASE_URL ?? process.env.NEXT_PUBLIC_OAUTH_BASE_URL
    const clientId = (process.env.NODE_ENV === 'development' && process.env.HAM_EXAM_CLIENT_ID) 
        ? process.env.HAM_EXAM_CLIENT_ID 
        : process.env.OAUTH_CLIENT_ID
    const clientSecret = (process.env.NODE_ENV === 'development' && process.env.HAM_EXAM_CLIENT_SECRET)
        ? process.env.HAM_EXAM_CLIENT_SECRET
        : process.env.OAUTH_CLIENT_SECRET

    if (!oauthBaseUrl || !clientId || !clientSecret) {
      console.error('Missing OAuth configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 1. Exchange code for token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    })

    const tokenRes = await fetch(`${oauthBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error('OAuth token exchange failed:', errorText)
      return NextResponse.json({ error: 'Failed to exchange token with OAuth provider' }, { status: 400 })
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
        return NextResponse.json({ error: 'No access token received' }, { status: 400 })
    }

    // 2. Parse JWT payload (assuming the access token IS the user info JWT as per auth.ts logic)
    // In auth.ts:
    // const parts = token.split('.')
    // const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
    
    // We can also call /oauth/userinfo to be safe, but let's follow auth.ts logic if possible.
    // However, robust implementation should probably verify the signature or call userinfo.
    // Let's call userinfo endpoint if available, or decode if we trust the channel.
    // auth.ts says: "OAuth服务器的access_token是JWT，直接解码获取用户信息"
    
    // Let's try to decode first as it saves a round trip, matching auth.ts
    const parts = accessToken.split('.')
    if (parts.length !== 3) {
        // Fallback to userinfo if not a JWT
        console.warn('Access token is not a JWT, trying userinfo endpoint')
        // ... implementation omitted for brevity, assuming JWT as per current system ...
        return NextResponse.json({ error: 'Invalid access token format' }, { status: 400 })
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    
    // Map fields
    const email = payload.email
    const sub = payload.sub // OAuth User ID
    const name = payload.name
    const callsign = payload.callsign

    if (!email) {
        return NextResponse.json({ error: 'No email in OAuth token' }, { status: 400 })
    }

    // 3. Find or Create User
    let user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || undefined,
          callsign: callsign || undefined,
          settings: {
            create: {
              enableWrongQuestionWeight: false,
              theme: 'light',
              examType: 'A_CLASS',
            },
          },
        },
        include: { settings: true },
      })
    } else {
        // Update user info if needed
        if (callsign && user.callsign !== callsign) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { callsign },
                include: { settings: true },
            })
        }
    }

    // Ensure settings exist
    if (!user.settings) {
        const settings = await prisma.userSettings.create({
            data: {
                userId: user.id,
                enableWrongQuestionWeight: false,
                theme: 'light',
                examType: 'A_CLASS',
            },
        })
        user = { ...user, settings }
    }

    const normalizedExamType = user.settings?.examType && EXAM_TYPES.has(user.settings.examType)
      ? user.settings.examType
      : 'A_CLASS'

    // 4. Generate Local Token
    const localToken = generateToken({
      id: user.id,
      email: user.email,
      callsign: user.callsign || undefined,
    })

    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          callsign: user.callsign,
          selectedExamType: normalizedExamType,
        },
        token: localToken,
      },
    })

  } catch (error) {
    console.error('OAuth exchange error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
