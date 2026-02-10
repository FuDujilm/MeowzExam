
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
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
    let start = searchParams.get('start') // YYYY-MM-DD
    let end = searchParams.get('end')     // YYYY-MM-DD

    if (!start || !end) {
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
      start = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}-${String(monthStart.getUTCDate()).padStart(2, '0')}`
      end = `${monthEnd.getUTCFullYear()}-${String(monthEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(monthEnd.getUTCDate()).padStart(2, '0')}`
    }

    const where: any = {
      userId: resolvedUser.id,
      date: {
        gte: start,
        lte: end,
      },
    }

    const [records, studyStats] = await Promise.all([
      prisma.dailyPracticeRecord.findMany({
        where,
        orderBy: { date: 'asc' },
        select: {
          date: true,
          questionCount: true,
          completed: true,
          rewardPoints: true,
          updatedAt: true,
        },
      }),
      prisma.$queryRaw<
        Array<{ date: string; studyCount: number; correctCount: number }>
      >(Prisma.sql`
        select
          to_char(date_trunc('day', "lastAnswered" at time zone 'UTC'), 'YYYY-MM-DD') as date,
          count(*)::int as "studyCount",
          sum(case when "lastCorrect" = true then 1 else 0 end)::int as "correctCount"
        from "user_questions"
        where "userId" = ${resolvedUser.id}
          and "lastAnswered" is not null
          and "lastAnswered" >= ${new Date(`${start}T00:00:00.000Z`)}
          and "lastAnswered" <= ${new Date(`${end}T23:59:59.999Z`)}
        group by 1
        order by 1 asc
      `),
    ])

    const merged = new Map<string, any>()

    records.forEach((record) => {
      merged.set(record.date, { ...record })
    })

    studyStats.forEach((row) => {
      const total = row.studyCount ?? 0
      const correct = row.correctCount ?? 0
      const incorrect = Math.max(total - correct, 0)
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
      const existing = merged.get(row.date) ?? { date: row.date }
      merged.set(row.date, {
        ...existing,
        studyCount: total,
        studyCorrectCount: correct,
        studyIncorrectCount: incorrect,
        accuracy,
      })
    })

    const mergedRecords = Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ records: mergedRecords })
  } catch (error) {
    console.error('Get calendar error:', error)
    return NextResponse.json({ error: 'Failed to get calendar data' }, { status: 500 })
  }
}
