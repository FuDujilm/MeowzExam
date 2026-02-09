
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// GET /api/user/exams
// Get user's exam history
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exams = await prisma.examResult.findMany({
      where: {
        userId: resolvedUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 exams
    })

    return NextResponse.json(exams)
  } catch (error) {
    console.error('Get exam history error:', error)
    return NextResponse.json({ error: 'Failed to get exam history' }, { status: 500 })
  }
}
