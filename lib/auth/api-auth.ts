import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { extractTokenFromHeader, verifyToken } from './jwt'
import { getOrCreateGuestUser } from './guest-user'

export interface ResolvedUser {
  id: string
  email: string
  callsign?: string | null
  authType: 'session' | 'token' | 'guest'
  isGuest: boolean
  guestKey?: string
  shouldSetGuestCookie?: boolean
}

export async function resolveRequestUser(
  request: NextRequest,
  options: { allowGuest?: boolean } = {},
): Promise<ResolvedUser | null> {
  // 优先使用 NextAuth 会话（Web 端）
  const session = await auth()
  const sessionEmail = session?.user?.email

  if (sessionEmail) {
    const user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: {
        id: true,
        email: true,
        callsign: true,
      },
    })

    if (user) {
      return {
        ...user,
        authType: 'session',
        isGuest: false,
      }
    }
  }

  // 其次尝试读取移动端 JWT
  const tokenFromHeader = extractTokenFromHeader(
    request.headers.get('authorization') ?? undefined
  )

  if (!tokenFromHeader) {
    if (!options.allowGuest) return null

    const guest = await getOrCreateGuestUser(request)
    return {
      id: guest.user.id,
      email: guest.user.email,
      callsign: guest.user.callsign,
      authType: 'guest',
      isGuest: true,
      guestKey: guest.guestKey,
      shouldSetGuestCookie: guest.isNewCookie,
    }
  }

  const decoded = verifyToken(tokenFromHeader)
  if (!decoded?.email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: decoded.email },
    select: {
      id: true,
      email: true,
      callsign: true,
    },
  })

  if (!user) {
    return null
  }

  return {
    ...user,
    authType: 'token',
    isGuest: false,
  }
}
