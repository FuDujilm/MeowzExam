import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/db'
import { generateExplanation } from '@/lib/ai/unified'
import { generateSimpleExplanation } from '@/lib/ai/openai'
import { checkAndIncrementAiQuota, AiQuotaExceededError } from '@/lib/ai/quota'
import { createAuditLog } from '@/lib/audit'
import { calculateWilsonScore } from '@/lib/ai/schema'
import { isAdminEmail } from '@/lib/auth/admin'

/**
 * POST /api/ai/explain
 * 生成AI解析（结构化）- 自动选择最优 AI Provider
 *
 * Body:
 * - questionId: string
 * - mode?: 'structured' | 'simple' (默认 structured)
 */
export async function POST(request: NextRequest) {
  const resolvedUser = await resolveRequestUser(request)

  if (!resolvedUser?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  const userId = resolvedUser.id

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[API][AI][Explain] incoming request', {
        url: request.url,
        method: request.method,
      })
    }

    const body = await request.json()
    const {
      questionId,
      mode = 'structured',
      regenerate = false,
    } = body

    if (!questionId) {
      return NextResponse.json(
        { error: 'Missing questionId' },
        { status: 400 }
      )
    }

    if (regenerate && mode !== 'structured') {
      return NextResponse.json(
        { error: '重新生成功能仅支持结构化解析' },
        { status: 400 }
      )
    }

    const isRegenerate = Boolean(regenerate)
    const userEmail = resolvedUser.email || ''
    const isAdmin = userEmail ? isAdminEmail(userEmail) : false

    // 获取题目信息
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        title: true,
        options: true,
        correctAnswers: true,
        category: true,
        difficulty: true,
        subSection: true,
        aiExplanation: true,
        explanations: {
          where: {
            type: 'AI',
            status: 'PUBLISHED',
          },
          orderBy: {
            wilsonScore: 'desc',
          },
          take: 1,
        },
      }
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    let freeLimit = 5
    let regenerateCost = 100
    let regenCountToday = 0
    let costToDeduct = 0
    let pointsCurrencyName = '积分'

    if (isRegenerate && !isAdmin) {
      let config = await prisma.pointsConfig.findUnique({
        where: { key: 'default' },
      })

      if (!config) {
        config = await prisma.pointsConfig.create({
          data: {
            key: 'default',
            pointsName: '积分',
            answerCorrect: 10,
            dailyCheckIn: 50,
            streak3Days: 100,
            streak7Days: 150,
            aiRegenerateDailyFree: 5,
            aiRegenerateCost: 100,
          },
        })
      }

      pointsCurrencyName = config.pointsName
      freeLimit = config.aiRegenerateDailyFree ?? 5
      regenerateCost = config.aiRegenerateCost ?? 100

      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      regenCountToday = await prisma.aiUsageLog.count({
        where: {
          userId,
          action: 'REGENERATE',
          createdAt: {
            gte: startOfDay,
          },
        },
      })

      const shouldChargeAfterFree = freeLimit <= 0 ? true : regenCountToday >= freeLimit
      costToDeduct = shouldChargeAfterFree ? Math.max(regenerateCost, 0) : 0

      if (costToDeduct > 0) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            totalPoints: true,
          },
        })

        if (!user) {
          return NextResponse.json(
            { error: '用户信息不存在' },
            { status: 400 }
          )
        }

        if (user.totalPoints < costToDeduct) {
          return NextResponse.json(
            {
              error: `积分不足，本次重新生成需要扣除${costToDeduct}${pointsCurrencyName}`,
            },
            { status: 402 }
          )
        }
      }
    }

    // 检查是否已有结构化解析
    if (!isRegenerate && question.explanations && question.explanations.length > 0 && mode === 'structured') {
      const cachedExplanation = question.explanations[0]
      if (cachedExplanation) {
        await createAuditLog({
          userId,
          action: 'AI_EXPLANATION_SKIPPED',
          entityType: 'Question',
          entityId: questionId,
          details: {
            reason: 'structured_cache_hit',
          },
        })

        return NextResponse.json({
          explanation: cachedExplanation.contentJson,
          explanationId: cachedExplanation.id,
          mode: 'structured',
          cached: true,
        })
      }
    }

    // 检查旧格式缓存（向后兼容）
    if (!isRegenerate && question.aiExplanation && mode === 'simple') {
      await createAuditLog({
        userId,
        action: 'AI_EXPLANATION_SKIPPED',
        entityType: 'Question',
        entityId: questionId,
        details: {
          reason: 'simple_cache_hit',
        },
      })

      return NextResponse.json({
        explanation: question.aiExplanation,
        mode: 'simple',
        cached: true,
      })
    }

    // 生成新解析
    const syllabusPath = question.subSection
      ? `${question.category} > ${question.subSection}`
      : question.category

    // 检查并扣除 AI 配额（管理员跳过限额检查，但仍记录使用量）
    // 注意：isAdminEmail 依赖 process.env.ADMIN_EMAILS，请确保环境变量已配置
    await checkAndIncrementAiQuota(userId, 1, isAdmin)

    if (mode === 'structured') {
      // 结构化模式 - 使用统一调用层（自动选择最优 provider）
      const { explanation: structuredExplanation, provider, modelName } = await generateExplanation({
        questionTitle: question.title,
        options: (Array.isArray(question.options) ? question.options : []) as any[],
        correctAnswers: (Array.isArray(question.correctAnswers) ? question.correctAnswers : []) as string[],
        category: question.category,
        difficulty: question.difficulty,
        syllabusPath,
      }, userId)

      // 保存到 Explanation 表
      const newExplanation = await prisma.explanation.create({
        data: {
          questionId: question.id,
          type: 'AI',
          contentJson: structuredExplanation as any,
          lang: 'zh-CN',
          templateVer: '1.0.0',
          status: 'PUBLISHED',
          createdById: userId,
          wilsonScore: calculateWilsonScore(0, 0),
        },
      })

      if (isRegenerate) {
        await prisma.explanation.updateMany({
          where: {
            questionId: question.id,
            type: 'AI',
            status: 'PUBLISHED',
            NOT: {
              id: newExplanation.id,
            },
          },
          data: {
            status: 'RETRACTED',
          },
        })
      }

      await createAuditLog({
        userId,
        action: 'AI_EXPLANATION_GENERATED',
        entityType: 'Question',
        entityId: questionId,
        details: {
          mode: 'structured',
          provider,
          modelName,
          difficulty: question.difficulty,
          category: question.category,
          explanationId: newExplanation.id,
          regenerate: isRegenerate,
          pointsDeducted: isRegenerate ? costToDeduct : 0,
        },
      })

      let deductedPoints = 0
      let freeAttemptsUsed: number | null = null
      let freeAttemptsRemaining: number | null = null

      if (isRegenerate) {
        if (!isAdmin) {
          const attemptsAfter = regenCountToday + 1

          if (costToDeduct > 0) {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: userId },
                data: {
                  totalPoints: { decrement: costToDeduct },
                },
              }),
              prisma.pointsHistory.create({
                data: {
                  userId,
                  points: -costToDeduct,
                  reason: 'AI 解析重新生成',
                  type: 'AI_REGENERATE',
                },
              }),
            ])
            deductedPoints = costToDeduct
          }

          regenCountToday = attemptsAfter

          if (freeLimit > 0) {
            freeAttemptsUsed = Math.min(attemptsAfter, freeLimit)
            freeAttemptsRemaining = Math.max(freeLimit - attemptsAfter, 0)
          } else {
            freeAttemptsUsed = 0
            freeAttemptsRemaining = 0
          }
        }

        await prisma.aiUsageLog.create({
          data: {
            userId,
            action: 'REGENERATE',
            questionId,
          },
        })
      }

      let message = 'AI 解析已生成'
      if (isRegenerate) {
        if (isAdmin) {
          message = 'AI 解析已重新生成（管理员不限次数）'
        } else if (deductedPoints > 0) {
          message = `AI 解析已重新生成，本次扣除${deductedPoints}${pointsCurrencyName}`
          if (freeLimit > 0) {
            message += '，今日免费次数已用完'
          }
        } else if (freeLimit > 0) {
          const remaining = freeAttemptsRemaining ?? Math.max(freeLimit - regenCountToday, 0)
          message = `AI 解析已重新生成，今日剩余免费次数 ${remaining}/${freeLimit}`
        } else {
          message = 'AI 解析已重新生成'
        }
      }

      return NextResponse.json({
        explanation: structuredExplanation,
        explanationId: newExplanation.id,
        provider,
        modelName,
        mode: 'structured',
        cached: false,
        regenerate: isRegenerate,
        deductedPoints: isRegenerate ? deductedPoints : 0,
        freeAttemptsUsed: isRegenerate && !isAdmin ? freeAttemptsUsed : null,
        freeAttemptsRemaining: isRegenerate && !isAdmin ? freeAttemptsRemaining : null,
        freeLimit: isRegenerate && !isAdmin ? freeLimit : null,
        pointsName: pointsCurrencyName,
        message,
      })

    } else {
      // 简单模式（向后兼容，仍使用 OpenAI）
      const simpleExplanation = await generateSimpleExplanation({
        questionTitle: question.title,
        options: question.options as any[],
        correctAnswers: question.correctAnswers as string[],
        category: question.category,
        difficulty: question.difficulty,
      })

      // 缓存到 Question.aiExplanation
      await prisma.question.update({
        where: { id: questionId },
        data: {
          aiExplanation: simpleExplanation,
        }
      })

      await createAuditLog({
        userId,
        action: 'AI_EXPLANATION_GENERATED',
        entityType: 'Question',
        entityId: questionId,
        details: {
          mode: 'simple',
          difficulty: question.difficulty,
          category: question.category,
        },
      })

      return NextResponse.json({
        explanation: simpleExplanation,
        mode: 'simple',
        cached: false,
      })
    }

  } catch (error: any) {
    console.error('AI explanation error:', error)

    if (error instanceof AiQuotaExceededError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    try {
      if (session?.user?.id) {
        await createAuditLog({
          userId,
          action: 'AI_EXPLANATION_ERROR',
          entityType: 'Question',
          details: {
            error: error.message || 'Unknown error',
          },
        })
      }
    } catch (auditError) {
      console.error('Failed to record audit log for AI error:', auditError)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate AI explanation' },
      { status: 500 }
    )
  }
}
