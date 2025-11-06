import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { extractTokenFromHeader, verifyToken } from './jwt'

export interface ResolvedUser {
  id: string
  email: string
  callsign?: string | null
  authType: 'session' | 'token'
}

export async function resolveRequestUser(
  request: NextRequest
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
      }
    }
  }

  // 其次尝试读取移动端 JWT
  const tokenFromHeader = extractTokenFromHeader(
    request.headers.get('authorization') ?? undefined
  )

  if (!tokenFromHeader) {
    return null
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
  }
}
