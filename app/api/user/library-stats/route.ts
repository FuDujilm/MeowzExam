import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

export async function GET(request: NextRequest) {
  const resolvedUser = await resolveRequestUser(request)
  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Library code is required' }, { status: 400 })
  }

  try {
    const libraryFilter = LEGACY_TYPE_CODES.has(code)
      ? {
          OR: [
            { libraryCode: code },
            {
              libraryCode: null,
              type: code as any,
            },
          ],
        }
      : { libraryCode: code }

    const browsedCount = await prisma.userQuestion.count({
      where: {
        userId: resolvedUser.id,
        question: libraryFilter,
      },
    })

    return NextResponse.json({ browsedCount })
  } catch (error) {
    console.error('Failed to fetch library stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
