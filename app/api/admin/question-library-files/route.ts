import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

export async function GET(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status ?? 401 },
    )
  }

  const libraryId = request.nextUrl.searchParams.get('libraryId')
  if (!libraryId) {
    return NextResponse.json(
      { error: '缺少 libraryId 参数。' },
      { status: 400 },
    )
  }

  try {
    const files = await prisma.questionLibraryFile.findMany({
      where: { libraryId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id,
        libraryId: file.libraryId,
        filename: file.filename,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        checksum: file.checksum,
        uploadedAt: file.uploadedAt.toISOString(),
        uploadedBy: file.uploadedBy,
        uploadedByEmail: file.uploadedByEmail,
      })),
    })
  } catch (error: any) {
    console.error('List library files error:', error)
    return NextResponse.json(
      { error: error?.message ?? '无法获取题库文件列表。' },
      { status: 500 },
    )
  }
}
