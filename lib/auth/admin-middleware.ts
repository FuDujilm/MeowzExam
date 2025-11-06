import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { validateAdminPermission } from './admin'

/**
 * 管理员权限中间件
 * 用于保护需要管理员权限的API路由
 */
export async function withAdminAuth(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      // 获取用户session
      const session = await auth()
      
      if (!session?.user) {
        return NextResponse.json(
          { 
            error: 'Unauthorized',
            message: '请先登录'
          },
          { status: 401 }
        )
      }
      
      // 验证管理员权限
      const { isAdmin, error } = validateAdminPermission(session.user.email)
      
      if (!isAdmin) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: error || '权限不足'
          },
          { status: 403 }
        )
      }
      
      // 权限验证通过，执行原始处理函数
      return handler(request)
      
    } catch (error) {
      console.error('Admin auth middleware error:', error)
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: '服务器内部错误'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 简化的管理员权限检查函数
 * 用于在API路由中快速检查权限
 */
export async function checkAdminPermission(): Promise<{
  success: boolean
  user?: any
  error?: string
  status?: number
}> {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return {
        success: false,
        error: '请先登录',
        status: 401
      }
    }
    
    const { isAdmin, error } = validateAdminPermission(session.user.email)
    
    if (!isAdmin) {
      return {
        success: false,
        error: error || '权限不足',
        status: 403
      }
    }
    
    return {
      success: true,
      user: session.user
    }
    
  } catch (error) {
    console.error('Admin permission check error:', error)
    return {
      success: false,
      error: '服务器内部错误',
      status: 500
    }
  }
}
