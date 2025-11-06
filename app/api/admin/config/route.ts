import { NextResponse } from 'next/server'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { getAdminEmails } from '@/lib/auth/admin'

/**
 * GET /api/admin/config
 * 获取管理员配置信息
 */
export async function GET() {
  try {
    // 验证管理员权限
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    const adminEmails = getAdminEmails()
    
    return NextResponse.json({
      success: true,
      data: {
        adminEmails,
        currentUser: adminCheck.user?.email,
        totalAdmins: adminEmails.length
      }
    })

  } catch (error: any) {
    console.error('Get admin config error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get admin config' },
      { status: 500 }
    )
  }
}
