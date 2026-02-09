import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/db'
import { getLibraryForUser } from '@/lib/question-library-service'

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

/**
 * GET /api/practice/questions
 * 获取练习题目列表
 *
 * Query参数:
 * - mode: 'sequential' | 'random' (练习模式)
 * - type: 'A_CLASS' | 'B_CLASS' | 'C_CLASS' (题库类型/LibraryCode)
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
    const libraryCodeParam = (searchParams.get('type') || 'A_CLASS').trim().toUpperCase()
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')

    // 1. Resolve Library/Type
    let targetLibraryCode = libraryCodeParam
    let isLegacyType = LEGACY_TYPE_CODES.has(libraryCodeParam)

    if (!isLegacyType) {
       // Try to find library by code
       const library = await getLibraryForUser({
        code: libraryCodeParam,
        userId: resolvedUser.id,
        userEmail: resolvedUser.email,
      })
      if (library) {
        targetLibraryCode = library.code
      } else {
        // If not found, might be a legacy type that isn't in our hardcoded set?
        // Or just invalid. We'll proceed with it as is, query might return empty.
      }
    }

    // 2. Build Where Clause
    let where: any = {}
    
    if (isLegacyType) {
       // Legacy logic: match libraryCode OR (libraryCode=null AND type=CODE)
       where = {
          OR: [
            { libraryCode: targetLibraryCode },
            {
              AND: [{ libraryCode: null }, { type: targetLibraryCode as any }],
            },
          ],
       }
    } else {
       // New logic: strictly match libraryCode
       where = { libraryCode: targetLibraryCode }
    }

    if (category) {
      where.categoryCode = category
    }

    // Common Select Fields (Includes correctAnswers and explanation for Mobile App)
    const selectFields = {
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
        correctAnswers: true, // EXPOSED for Mobile App local validation
        explanation: true,    // EXPOSED for Mobile App explanation
        hasImage: true,
        imagePath: true,
        imageAlt: true,
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
            question: where // Use the resolved where clause
          },
          include: {
            question: {
              select: selectFields
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
                select: selectFields
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
              select: selectFields
            })
          )
        ).then(results => results.flat())
      }

    } else if (mode === 'wrong') {
      // 错题练习
      const userQuestions = await prisma.userQuestion.findMany({
        where: {
          userId: resolvedUser.id,
          incorrectCount: { gt: 0 },
          question: where
        },
        skip: offset,
        take: limit,
        orderBy: {
          lastAnswered: 'desc'
        },
        include: {
          question: {
            select: selectFields
          }
        }
      })
      
      questions = userQuestions.map(uq => uq.question)
      
    } else {
      // 顺序练习
      questions = await prisma.question.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: {
          externalId: 'asc' // 按题号顺序
        },
        select: selectFields
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
      
      // Update correctAnswers based on mapping if necessary?
      // Wait, Mobile App validates using `correctAnswers` vs `option.id`.
      // If we shuffle options and assign NEW IDs (A,B,C,D), we MUST update `correctAnswers` to match the NEW IDs!
      // OR we must NOT shuffle IDs, only order.
      
      // Current Logic:
      // 1. Shuffles content.
      // 2. Assigns A,B,C,D to the shuffled positions.
      // 3. Maps New ID (A) -> Old ID (original).
      
      // If Mobile App checks `q.correctAnswers.contains(answerId)`:
      // `correctAnswers` from DB are likely "A", "B" (referring to original IDs if they were static, OR uuids).
      // If DB `options` are `[{id: "A", ...}, {id: "B", ...}]` and `correctAnswers` is `["A"]`.
      
      // If we change "A" to be the SECOND option, its new ID is "B".
      // We must map the `correctAnswers` to the NEW IDs.
      
      const originalCorrectAnswers = (q.correctAnswers as string[]) || []
      const newCorrectAnswers = originalCorrectAnswers.map(oldId => {
         // Find which New ID maps to this Old ID
         // answerMapping: { "A": "old_id_1", "B": "old_id_2" }
         return Object.keys(answerMapping).find(key => answerMapping[key] === oldId)
      }).filter(Boolean) as string[]

      return {
        ...q,
        options: shuffledOptions,
        answerMapping, // 包含映射关系
        correctAnswers: newCorrectAnswers, // Return TRANSFORMED correct answers matching the new shuffled IDs
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
