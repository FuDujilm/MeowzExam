import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { saveLibraryFile } from '@/lib/server/library-file-store'

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB

function serializeRecord(record: any) {
  return {
    id: record.id,
    libraryId: record.libraryId,
    filename: record.filename,
    originalName: record.originalName,
    fileSize: record.fileSize,
    mimeType: record.mimeType,
    checksum: record.checksum,
    uploadedAt: record.uploadedAt?.toISOString?.() ?? record.uploadedAt,
    uploadedBy: record.uploadedBy,
    uploadedByEmail: record.uploadedByEmail,
  }
}

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
      files: files.map(serializeRecord),
    })
  } catch (error: any) {
    console.error('List library files error:', error)
    return NextResponse.json(
      { error: error?.message ?? '无法获取题库文件列表。' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status ?? 401 },
    )
  }

  const formData = await request.formData()
  const libraryId = formData.get('libraryId')
  const fileEntry = formData.get('file')
  const providedName = formData.get('originalName')

  if (typeof libraryId !== 'string' || !libraryId.trim()) {
    return NextResponse.json({ error: '缺少 libraryId 参数。' }, { status: 400 })
  }

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: '请选择要上传的 JSON 文件。' }, { status: 400 })
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '文件体积过大，请控制在 8MB 以内。' }, { status: 400 })
  }

  try {
    const library = await prisma.questionLibrary.findUnique({ where: { id: libraryId } })
    if (!library) {
      return NextResponse.json({ error: '题库不存在。' }, { status: 404 })
    }

    const content = await fileEntry.text()
    try {
      JSON.parse(content)
    } catch (error) {
      return NextResponse.json({ error: '文件内容不是合法的 JSON。' }, { status: 400 })
    }

    const preferredName =
      (typeof providedName === 'string' && providedName.trim()) || fileEntry.name || 'library.json'

    const stored = await saveLibraryFile({
      libraryCode: library.code || library.shortName || 'LIBRARY',
      fileContent: content,
      originalName: preferredName,
    })

    const created = await prisma.questionLibraryFile.create({
      data: {
        libraryId: library.id,
        filename: stored.filename,
        originalName: preferredName,
        filepath: stored.filepath,
        fileSize: stored.fileSize,
        checksum: stored.checksum,
        mimeType: fileEntry.type || 'application/json',
        uploadedBy: adminCheck.user?.id ?? null,
        uploadedByEmail: adminCheck.user?.email ?? null,
      },
    })

    return NextResponse.json({ success: true, file: serializeRecord(created) })
  } catch (error: any) {
    console.error('Upload library file error:', error)
    return NextResponse.json(
      { error: error?.message ?? '上传文件失败。' },
      { status: 500 },
    )
  }
}
