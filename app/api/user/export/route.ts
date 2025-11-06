import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/user/export - 导出用户数据
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        settings: true,
        userQuestions: {
          include: {
            question: {
              select: {
                externalId: true,
                title: true,
                category: true,
                difficulty: true,
              }
            }
          }
        },
        examResults: {
          include: {
            exam: {
              select: {
                type: true,
                duration: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 构建导出数据
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
        callsign: user.callsign,
        createdAt: user.createdAt,
      },
      settings: user.settings,
      statistics: {
        totalQuestions: user.userQuestions.length,
        correctCount: user.userQuestions.reduce((sum, q) => sum + q.correctCount, 0),
        incorrectCount: user.userQuestions.reduce((sum, q) => sum + q.incorrectCount, 0),
        examsTaken: user.examResults.length,
        examsPassed: user.examResults.filter(e => e.passed).length,
      },
      wrongQuestions: user.userQuestions
        .filter(q => q.incorrectCount > 0)
        .map(q => ({
          questionId: q.question.externalId,
          title: q.question.title,
          category: q.question.category,
          difficulty: q.question.difficulty,
          correctCount: q.correctCount,
          incorrectCount: q.incorrectCount,
          lastAnswered: q.lastAnswered,
          lastCorrect: q.lastCorrect,
        })),
      examHistory: user.examResults.map(e => ({
        examType: e.exam.type,
        duration: e.exam.duration,
        score: e.score,
        totalQuestions: e.totalQuestions,
        correctCount: e.correctCount,
        passed: e.passed,
        createdAt: e.createdAt,
      })),
    }

    // 返回JSON文件
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="exam-data-${Date.now()}.json"`,
      }
    })
  } catch (error) {
    console.error('Export data error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
