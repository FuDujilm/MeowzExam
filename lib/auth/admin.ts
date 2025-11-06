/**
 * 管理员权限检查工具
 */

/**
 * 检查邮箱是否为管理员邮箱
 * @param email 用户邮箱
 * @returns 是否为管理员
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS
  
  if (!adminEmails) {
    console.warn('ADMIN_EMAILS environment variable is not set')
    return false
  }
  
  // 将环境变量中的邮箱列表分割并清理空格
  const adminEmailList = adminEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0)
  
  return adminEmailList.includes(email.toLowerCase())
}

/**
 * 获取管理员邮箱列表
 * @returns 管理员邮箱数组
 */
export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS
  
  if (!adminEmails) {
    return []
  }
  
  return adminEmails
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0)
}

/**
 * 验证用户是否有管理员权限
 * @param userEmail 用户邮箱
 * @returns 权限验证结果
 */
export function validateAdminPermission(userEmail?: string | null): {
  isAdmin: boolean
  error?: string
} {
  if (!userEmail) {
    return {
      isAdmin: false,
      error: '用户邮箱不存在'
    }
  }
  
  const isAdmin = isAdminEmail(userEmail)
  
  if (!isAdmin) {
    return {
      isAdmin: false,
      error: '权限不足：需要管理员权限'
    }
  }
  
  return {
    isAdmin: true
  }
}
