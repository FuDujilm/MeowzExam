
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'

type CalendarRecord = {
  date: string
  questionCount?: number
  completed?: boolean
  rewardPoints?: number
  updatedAt?: Date
  studyCount?: number
  studyCorrectCount?: number
  studyIncorrectCount?: number
  accuracy?: number
}

// GET /api/user/calendar
// Get daily practice records for a specific month
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request, { allowGuest: true })
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

    const [records, studyStats] = await Promise.all([
      prisma.dailyPracticeRecord.findMany({
        where: {
          userId: resolvedUser.id,
          date: {
            gte: start,
            lte: end,
          },
        },
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
          to_char(date_trunc('day', psq."answeredAt" at time zone 'UTC'), 'YYYY-MM-DD') as date,
          count(*)::int as "studyCount",
          sum(case when psq."isCorrect" = true then 1 else 0 end)::int as "correctCount"
        from "practice_session_questions" psq
        inner join "practice_sessions" ps on ps."id" = psq."sessionId"
        where ps."userId" = ${resolvedUser.id}
          and psq."answeredAt" >= ${new Date(`${start}T00:00:00.000Z`)}
          and psq."answeredAt" <= ${new Date(`${end}T23:59:59.999Z`)}
        group by 1
        order by 1 asc
      `),
    ])

    const merged = new Map<string, CalendarRecord>()

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

    return attachGuestCookieIfNeeded(NextResponse.json({ records: mergedRecords }), resolvedUser)
  } catch (error) {
    console.error('Get calendar error:', error)
    return NextResponse.json({ error: 'Failed to get calendar data' }, { status: 500 })
  }
}
