import { prisma } from '@/lib/db'

export class AiQuotaExceededError extends Error {
  constructor(message = 'AI 配额已用完') {
    super(message)
    this.name = 'AiQuotaExceededError'
  }
}

/**
 * 检查并扣除用户的 AI 配额
 * @param userId 用户ID
 * @param count 扣除数量，默认为 1
 * @param bypassLimit 是否跳过限额检查（如管理员），跳过时仅记录使用量不拦截
 * @throws AiQuotaExceededError 如果配额不足且 bypassLimit 为 false
 */
export async function checkAndIncrementAiQuota(userId: string, count = 1, bypassLimit = false): Promise<void> {
  // 使用事务确保原子性
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { aiQuotaLimit: true, aiQuotaUsed: true },
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 如果设置了限额 (不为 null) 且未开启跳过检查，则检查剩余额度
    if (!bypassLimit && user.aiQuotaLimit !== null) {
      if (user.aiQuotaUsed + count > user.aiQuotaLimit) {
        throw new AiQuotaExceededError(
          `AI 配额不足。上限：${user.aiQuotaLimit}，已用：${user.aiQuotaUsed}，本次请求：${count}`
        )
      }
    }

    // 递增已使用次数
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        aiQuotaUsed: {
          increment: count,
        },
      },
      select: {
        id: true,
        email: true,
        aiQuotaUsed: true
      }
    })
    console.log(`[AI Quota] Updated user ${updatedUser.email} (${updatedUser.id}): Used = ${updatedUser.aiQuotaUsed} (+${count})`)
  })
}

/**
 * 仅获取配额状态，不扣除
 */
export async function getAiQuotaStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiQuotaLimit: true, aiQuotaUsed: true },
  })

  if (!user) return null

  return {
    limit: user.aiQuotaLimit,
    used: user.aiQuotaUsed,
    remaining: user.aiQuotaLimit === null ? Infinity : Math.max(0, user.aiQuotaLimit - user.aiQuotaUsed),
  }
}
