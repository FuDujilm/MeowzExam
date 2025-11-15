import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

type AggregatedTag = {
  tag: string
  total: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount: number
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ libraryId: string }> },
) {
  const { libraryId } = await params
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status ?? 401 },
    )
  }

  try {
    const library = await prisma.questionLibrary.findUnique({
      where: { id: libraryId },
      select: { id: true },
    })
    if (!library) {
      return NextResponse.json(
        { error: '未找到题库。' },
        { status: 404 },
      )
    }

    const questions = await prisma.question.findMany({
      where: { libraryId },
      select: {
        questionType: true,
        tags: true,
        hasImage: true,
      },
    })

    const tagMap = new Map<string, AggregatedTag>()
    const imageSummary = {
      total: 0,
      singleChoiceCount: 0,
      multipleChoiceCount: 0,
      trueFalseCount: 0,
    }

    for (const question of questions) {
      const tags = Array.isArray(question.tags)
        ? question.tags
        : typeof question.tags === 'string'
          ? [question.tags]
          : []

      for (const rawTag of tags) {
        if (typeof rawTag !== 'string') continue
        const tag = rawTag.trim()
        if (!tag) continue
        if (!tagMap.has(tag)) {
          tagMap.set(tag, {
            tag,
            total: 0,
            singleChoiceCount: 0,
            multipleChoiceCount: 0,
            trueFalseCount: 0,
          })
        }
        const entry = tagMap.get(tag)!
        entry.total += 1
        if (question.questionType === 'single_choice') {
          entry.singleChoiceCount += 1
        } else if (question.questionType === 'multiple_choice') {
          entry.multipleChoiceCount += 1
        } else if (question.questionType === 'true_false') {
          entry.trueFalseCount += 1
        }
      }

      if (question.hasImage) {
        imageSummary.total += 1
        if (question.questionType === 'single_choice') {
          imageSummary.singleChoiceCount += 1
        } else if (question.questionType === 'multiple_choice') {
          imageSummary.multipleChoiceCount += 1
        } else if (question.questionType === 'true_false') {
          imageSummary.trueFalseCount += 1
        }
      }
    }

    const tags = Array.from(tagMap.values()).sort((a, b) => b.total - a.total)

    return NextResponse.json({
      success: true,
      tags,
      imageSummary,
    })
  } catch (error) {
    console.error('Load question tag summary error:', error)
    return NextResponse.json(
      { error: '无法加载题库标签统计。' },
      { status: 500 },
    )
  }
}
