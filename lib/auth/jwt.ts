import jwt from 'jsonwebtoken'
import { AuthUser } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret'

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      callsign: user.callsign,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

type DecodedToken = {
  id?: string | null
  email?: string | null
  callsign?: string | null
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken
    if (!decoded?.id || !decoded?.email) {
      return null
    }
    return {
      id: decoded.id,
      email: decoded.email,
      callsign: decoded.callsign ?? undefined,
    }
  } catch {
    return null
  }
}

export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization) return null

  const parts = authorization.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}
