import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/practice/questions
 * 获取练习题目列表
 *
 * Query参数:
 * - mode: 'sequential' | 'random' (练习模式)
 * - type: 'A_CLASS' | 'B_CLASS' | 'C_CLASS' (题库类型)
 * - limit: number (可选，随机模式下获取题目数量，默认10)
 * - offset: number (可选，顺序模式下的偏移量，默认0)
 * - category: string (可选，按分类筛选)
 */
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'sequential'
    const type = searchParams.get('type') || 'A_CLASS'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')

    // 构建查询条件
    const where: any = {
      type: type as 'A_CLASS' | 'B_CLASS' | 'C_CLASS'
    }

    if (category) {
      where.categoryCode = category
    }

    // 获取题目
    let questions

    if (mode === 'random') {
      // 随机练习：检查用户是否开启错题权重
      const user = await prisma.user.findUnique({
        where: { id: resolvedUser.id },
        include: { settings: true }
      })

      const enableWrongQuestionWeight = user?.settings?.enableWrongQuestionWeight || false

      if (enableWrongQuestionWeight) {
        // 开启错题权重：优先从错题中抽取，然后补充随机题
        const wrongQuestions = await prisma.userQuestion.findMany({
          where: {
            userId: resolvedUser.id,
            incorrectCount: { gt: 0 },
            question: { type: type as 'A_CLASS' | 'B_CLASS' | 'C_CLASS' }
          },
          include: {
            question: {
              select: {
                id: true,
                uuid: true,
                externalId: true,
                type: true,
                questionType: true,
                difficulty: true,
                category: true,
                categoryCode: true,
                title: true,
                options: true,
                hasImage: true,
                imagePath: true,
                imageAlt: true,
              }
            }
          },
          orderBy: {
            lastAnswered: 'desc' // 最近答错的优先
          }
        })

        // 从错题中随机抽取70%的题目数量
        const wrongQuestionCount = Math.min(
          Math.floor(limit * 0.7),
          wrongQuestions.length
        )

        const selectedWrongQuestions = wrongQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, wrongQuestionCount)
          .map(uq => uq.question)

        // 剩余部分从所有题目中随机抽取
        const remainingCount = limit - selectedWrongQuestions.length

        if (remainingCount > 0) {
          const total = await prisma.question.count({ where })
          const randomOffsets = new Set<number>()

          while (randomOffsets.size < Math.min(remainingCount, total)) {
            randomOffsets.add(Math.floor(Math.random() * total))
          }

          const randomQuestions = await Promise.all(
            Array.from(randomOffsets).map(offset =>
              prisma.question.findMany({
                where,
                skip: offset,
                take: 1,
                select: {
                  id: true,
                  uuid: true,
                  externalId: true,
                  type: true,
                  questionType: true,
                  difficulty: true,
                  category: true,
                  categoryCode: true,
                  title: true,
                  options: true,
                  hasImage: true,
                  imagePath: true,
                  imageAlt: true,
                }
              })
            )
          ).then(results => results.flat())

          questions = [...selectedWrongQuestions, ...randomQuestions]
        } else {
          questions = selectedWrongQuestions
        }

        // 再次打乱顺序
        questions = questions.sort(() => Math.random() - 0.5)

      } else {
        // 未开启错题权重：完全随机
        const total = await prisma.question.count({ where })

        const randomOffsets = new Set<number>()
        while (randomOffsets.size < Math.min(limit, total)) {
          randomOffsets.add(Math.floor(Math.random() * total))
        }

        questions = await Promise.all(
          Array.from(randomOffsets).map(offset =>
            prisma.question.findMany({
              where,
              skip: offset,
              take: 1,
              select: {
                id: true,
                uuid: true,
                externalId: true,
                type: true,
                questionType: true,
                difficulty: true,
                category: true,
                categoryCode: true,
                title: true,
                options: true,
                hasImage: true,
                imagePath: true,
                imageAlt: true,
              }
            })
          )
        ).then(results => results.flat())
      }

    } else {
      // 顺序练习
      questions = await prisma.question.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: {
          externalId: 'asc' // 按题号顺序
        },
        select: {
          id: true,
          uuid: true,
          externalId: true,
          type: true,
          questionType: true,
          difficulty: true,
          category: true,
          categoryCode: true,
          title: true,
          options: true,
          hasImage: true,
          imagePath: true,
          imageAlt: true,
        }
      })
    }

    // 获取总题数
    const total = await prisma.question.count({ where })

    // 随机打乱所有题目的选项顺序
    const questionsWithShuffledOptions = questions.map(q => {
      let shuffledOptions = q.options
      const answerMapping: Record<string, string> = {}

      if (Array.isArray(q.options)) {
        const originalOptions = [...(q.options as any[])]
        // 打乱选项内容顺序
        const shuffledContents = [...originalOptions].sort(() => Math.random() - 0.5)
        // 重新分配ID（A、B、C、D）
        const optionIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        shuffledOptions = shuffledContents.map((opt, index) => {
          const newId = optionIds[index]
          const originalId = opt.id
          answerMapping[newId] = originalId // 记录映射关系

          return {
            id: newId,
            text: opt.text,
          }
        })
      }

      return {
        ...q,
        options: shuffledOptions,
        answerMapping, // 包含映射关系
      }
    })

    return NextResponse.json({
      questions: questionsWithShuffledOptions,
      total,
      mode,
      hasMore: offset + questions.length < total
    })

  } catch (error: any) {
    console.error('Get practice questions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get questions' },
      { status: 500 }
    )
  }
}
