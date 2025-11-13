import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import {
  deleteLibraryFileFromDisk,
  readLibraryFile,
} from '@/lib/server/library-file-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status ?? 401 },
    )
  }

  const record = await prisma.questionLibraryFile.findUnique({
    where: { id: fileId },
  })
  if (!record) {
    return NextResponse.json(
      { error: '文件不存在。' },
      { status: 404 },
    )
  }

  try {
    const fileBuffer = await readLibraryFile(record.filepath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': record.mimeType ?? 'application/json',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          record.originalName ?? record.filename,
        )}"`,
      },
    })
  } catch (error: any) {
    console.error('Download library file error:', error)
    return NextResponse.json(
      { error: '无法读取文件，请检查存储路径。' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status ?? 401 },
    )
  }

  try {
    const record = await prisma.questionLibraryFile.findUnique({
      where: { id: fileId },
    })
    if (!record) {
      return NextResponse.json(
        { error: '文件不存在。' },
        { status: 404 },
      )
    }

    await prisma.questionLibraryFile.delete({
      where: { id: fileId },
    })
    await deleteLibraryFileFromDisk(record.filepath)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete library file error:', error)
    return NextResponse.json(
      { error: error?.message ?? '删除文件失败。' },
      { status: 500 },
    )
  }
}
