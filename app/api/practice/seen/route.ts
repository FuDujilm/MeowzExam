import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// POST /api/practice/seen - 标记题目已浏览
export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { questionId } = body ?? {}

    if (!questionId) {
      return NextResponse.json({ error: '缺少题目ID' }, { status: 400 })
    }

    const now = new Date()

    const record = await prisma.userQuestion.upsert({
      where: {
        userId_questionId: {
          userId: resolvedUser.id,
          questionId,
        },
      },
      create: {
        userId: resolvedUser.id,
        questionId,
        correctCount: 0,
        incorrectCount: 0,
        lastAnswered: now,
        lastCorrect: null,
      },
      update: {
        lastAnswered: now,
      },
    })

    return NextResponse.json({ success: true, userQuestion: record })
  } catch (error) {
    console.error('标记题目已浏览失败:', error)
    return NextResponse.json({ error: '标记题目已浏览失败' }, { status: 500 })
  }
}
