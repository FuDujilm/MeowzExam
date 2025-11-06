import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { isAdminEmail } from '@/lib/auth/admin'
import { getProgramInfo, updateProgramInfo } from '@/lib/program-info'
import type { ProgramDocument, ProgramInfoUpdate, ProgramMetadata } from '@/lib/program-info'

export async function GET() {
  const info = await getProgramInfo()
  return NextResponse.json(info)
}

export async function PUT(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: '权限不足：需要管理员权限' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined
    const documents = body?.documents && typeof body.documents === 'object' ? body.documents : undefined

    const updatePayload: ProgramInfoUpdate = {}

    if (metadata) {
      const allowedMetadataKeys = [
        'name',
        'author',
        'contactEmail',
        'homepage',
        'supportLink',
        'repository',
        'lastUpdated',
      ] as const

      const nextMetadata: Partial<ProgramMetadata> = {}
      for (const key of allowedMetadataKeys) {
        const value = metadata[key]
        if (typeof value === 'string') {
          nextMetadata[key] = value
        }
      }
      if (Object.keys(nextMetadata).length > 0) {
        updatePayload.metadata = nextMetadata
      }
    }

    if (documents) {
      const allowedDocumentKeys = ['termsOfService', 'privacyPolicy', 'changelog'] as const
      const nextDocuments: Partial<
        Record<'termsOfService' | 'privacyPolicy' | 'changelog', Partial<ProgramDocument> & { content: string }>
      > = {}

      for (const key of allowedDocumentKeys) {
        const doc = documents[key]
        if (doc && typeof doc === 'object' && typeof doc.content === 'string') {
          nextDocuments[key] = {
            content: doc.content,
            ...(typeof doc.format === 'string' ? { format: doc.format } : {}),
          }
        }
      }

      if (Object.keys(nextDocuments).length > 0) {
        updatePayload.documents = nextDocuments
      }
    }

    const updated = await updateProgramInfo(updatePayload)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[program-info] 更新失败:', error)
    return NextResponse.json({ error: '更新程序信息失败' }, { status: 500 })
  }
}
