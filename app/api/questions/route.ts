import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// GET /api/questions - 获取题目列表(支持分页和筛选)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const type = searchParams.get('type') // A_CLASS, B_CLASS, C_CLASS
    const category = searchParams.get('category') // 分类代码
    const search = searchParams.get('search') // 搜索关键词

    // 构建查询条件
    const where: any = {}
    if (type) {
      where.type = type
    }
    if (category) {
      where.categoryCode = category
    }
    if (search) {
      where.title = {
        contains: search,
      }
    }

    // 查询总数
    const total = await prisma.question.count({ where })

    // 查询题目列表
    const questions = await prisma.question.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        externalId: 'asc',
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
        subSection: true,
        title: true,
        hasImage: true,
        imagePath: true,
        tags: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      questions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取题目列表失败:', error)
    return NextResponse.json(
      { error: '获取题目列表失败' },
      { status: 500 }
    )
  }
}

