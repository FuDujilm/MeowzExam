
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// GET /api/user/calendar
// Get daily practice records for a specific month
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') // YYYY-MM-DD
    const end = searchParams.get('end')     // YYYY-MM-DD

    if (!start || !end) {
      // Default to current month if not specified?
      // Or require params. Let's require them for efficiency.
      // Or just return last 3 months.
      // Let's implement flexible query.
    }

    const where: any = {
      userId: resolvedUser.id,
    }

    if (start && end) {
      where.date = {
        gte: start,
        lte: end,
      }
    }

    const records = await prisma.dailyPracticeRecord.findMany({
      where,
      orderBy: { date: 'asc' },
      select: {
        date: true,
        questionCount: true,
        completed: true,
        rewardPoints: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Get calendar error:', error)
    return NextResponse.json({ error: 'Failed to get calendar data' }, { status: 500 })
  }
}
