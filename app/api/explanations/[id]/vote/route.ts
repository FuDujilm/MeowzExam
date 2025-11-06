import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { calculateWilsonScore } from '@/lib/ai/schema'
import { Prisma } from '@/lib/generated/prisma'

/**
 * POST /api/explanations/[id]/vote
 * 对解析进行投票
 *
 * Body:
 * - vote: 'UP' | 'DOWN' | 'REPORT'
 * - reportReason: string (必填，仅当 vote='REPORT' 时)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  const { vote, reportReason } = await request.json()

  if (!['UP', 'DOWN', 'REPORT'].includes(vote)) {
    return NextResponse.json(
      { error: 'Invalid vote type' },
      { status: 400 }
    )
  }

  // 举报时必须提供原因
  if (vote === 'REPORT' && (!reportReason || reportReason.trim().length === 0)) {
    return NextResponse.json(
      { error: '举报时必须提供原因' },
      { status: 400 }
    )
  }

  try {
    // 检查解析是否存在
    const explanation = await prisma.explanation.findUnique({
      where: { id },
      include: {
        votes: true,
      },
    })

    if (!explanation) {
      return NextResponse.json(
        { error: 'Explanation not found' },
        { status: 404 }
      )
    }

    // 检查用户是否已投票
    const existingVote = await prisma.explanationVote.findUnique({
      where: {
        explanationId_userId: {
          explanationId: id,
          userId,
        },
      },
    })

    if (existingVote) {
      // 更新投票
      if (existingVote.vote === vote) {
        // 取消投票
        await prisma.$transaction(async (tx) => {
          await tx.explanationVote.delete({
            where: { id: existingVote.id },
          })

          // 更新统计
          const updateData: any = {}
          if (vote === 'UP') {
            updateData.upvotes = { decrement: 1 }
          } else if (vote === 'DOWN') {
            updateData.downvotes = { decrement: 1 }
          }

          const updated = await tx.explanation.update({
            where: { id },
            data: {
              ...updateData,
              wilsonScore: calculateWilsonScore(
                explanation.upvotes + (vote === 'UP' ? -1 : 0),
                explanation.downvotes + (vote === 'DOWN' ? -1 : 0)
              ),
            },
          })

          return updated
        })

        return NextResponse.json({
          success: true,
          action: 'removed',
          vote: null,
        })
      } else {
        // 切换投票
        await prisma.$transaction(async (tx) => {
          await tx.explanationVote.update({
            where: { id: existingVote.id },
            data: {
              vote,
              reportReason: vote === 'REPORT' ? reportReason : null,
            },
          })

          // 更新统计
          const updateData: any = {}
          if (existingVote.vote === 'UP') {
            updateData.upvotes = { decrement: 1 }
          } else if (existingVote.vote === 'DOWN') {
            updateData.downvotes = { decrement: 1 }
          }

          if (vote === 'UP') {
            updateData.upvotes = { increment: 1 }
          } else if (vote === 'DOWN') {
            updateData.downvotes = { increment: 1 }
          }

          const newUpvotes = explanation.upvotes +
            (existingVote.vote === 'UP' ? -1 : 0) +
            (vote === 'UP' ? 1 : 0)
          const newDownvotes = explanation.downvotes +
            (existingVote.vote === 'DOWN' ? -1 : 0) +
            (vote === 'DOWN' ? 1 : 0)

          await tx.explanation.update({
            where: { id },
            data: {
              ...updateData,
              wilsonScore: calculateWilsonScore(newUpvotes, newDownvotes),
            },
          })
        })

        return NextResponse.json({
          success: true,
          action: 'updated',
          vote,
        })
      }
    } else {
      // 新增投票
      try {
        await prisma.$transaction(async (tx) => {
          await tx.explanationVote.create({
            data: {
              explanationId: id,
              userId,
              vote,
              reportReason: vote === 'REPORT' ? reportReason : null,
            },
          })

          // 更新统计
          const updateData: any = {}
          if (vote === 'UP') {
            updateData.upvotes = { increment: 1 }
          } else if (vote === 'DOWN') {
            updateData.downvotes = { increment: 1 }
          }

          await tx.explanation.update({
            where: { id },
            data: {
              ...updateData,
              wilsonScore: calculateWilsonScore(
                explanation.upvotes + (vote === 'UP' ? 1 : 0),
                explanation.downvotes + (vote === 'DOWN' ? 1 : 0)
              ),
            },
          })

          // 检查举报数量，≥5 则自动隐藏
          if (vote === 'REPORT') {
            const reportCount = await tx.explanationVote.count({
              where: {
                explanationId: id,
                vote: 'REPORT',
              },
            })

            if (reportCount >= 5) {
              await tx.explanation.update({
                where: { id },
                data: {
                  status: 'UNDER_REVIEW',
                },
              })
            }
          }
        })

        return NextResponse.json({
          success: true,
          action: 'created',
          vote,
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const latestVote = await prisma.explanationVote.findUnique({
            where: {
              explanationId_userId: {
                explanationId: id,
                userId,
              },
            },
          })

          return NextResponse.json({
            success: true,
            action: latestVote?.vote === vote ? 'noop' : 'exists',
            vote: latestVote?.vote || vote,
            conflict: true,
          })
        }

        throw error
      }
    }
  } catch (error: any) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to vote' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/explanations/[id]/vote
 * 获取当前用户的投票状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ vote: null, reportReason: null })
  }

  const { id } = await params

  try {
    const vote = await prisma.explanationVote.findUnique({
      where: {
        explanationId_userId: {
          explanationId: id,
          userId: session.user.id,
        },
      },
    })

    return NextResponse.json({
      vote: vote?.vote || null,
      reportReason: vote?.reportReason || null,
    })
  } catch (error: any) {
    console.error('Get vote error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get vote' },
      { status: 500 }
    )
  }
}
