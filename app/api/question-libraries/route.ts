import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listAccessibleLibraries } from '@/lib/question-library-service'

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id ?? null
    const userEmail = session?.user?.email ?? null

    const libraries = await listAccessibleLibraries({ userId, userEmail })

    return NextResponse.json({
      libraries: libraries.map(({ library, displayLabel }) => ({
        id: library.id,
        uuid: library.uuid,
        code: library.code,
        name: library.name,
        shortName: library.shortName,
        description: library.description,
        region: library.region,
        totalQuestions: library.totalQuestions,
        singleChoiceCount: library.singleChoiceCount,
        multipleChoiceCount: library.multipleChoiceCount,
        trueFalseCount: library.trueFalseCount,
        sourceType: library.sourceType,
        version: library.version,
        displayLabel,
        presets: library.examPresets.map((preset) => ({
          id: preset.id,
          code: preset.code,
          name: preset.name,
          description: preset.description,
          durationMinutes: preset.durationMinutes,
          totalQuestions: preset.totalQuestions,
          passScore: preset.passScore,
          singleChoiceCount: preset.singleChoiceCount,
          multipleChoiceCount: preset.multipleChoiceCount,
          trueFalseCount: preset.trueFalseCount,
        })),
        displayTemplate: library.displayTemplate,
        visibility: library.visibility,
        updatedAt: library.updatedAt,
      })),
    })
  } catch (error: any) {
    console.error('List question libraries error:', error)
    return NextResponse.json(
      { error: error?.message || '获取题库列表失败' },
      { status: 500 },
    )
  }
}
