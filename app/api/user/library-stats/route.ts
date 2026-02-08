import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Library code is required' }, { status: 400 })
  }

  try {
    const browsedCount = await prisma.userQuestion.count({
      where: {
        userId: session.user.id,
        question: {
          libraryCode: code,
        },
      },
    })

    return NextResponse.json({ browsedCount })
  } catch (error) {
    console.error('Failed to fetch library stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
