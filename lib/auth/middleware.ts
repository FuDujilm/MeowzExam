import { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt'
import { AuthUser } from '@/types'

export function withAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)

      if (!token) {
        return new Response(JSON.stringify({
          success: false,
          message: '未提供认证令牌'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const user = verifyToken(token)

      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          message: '认证令牌无效或已过期'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return handler(request, user)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return new Response(JSON.stringify({
        success: false,
        message: '认证失败'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}