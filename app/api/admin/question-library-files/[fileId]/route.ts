import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import {
  deleteLibraryFileFromDisk,
  readLibraryFile,
} from '@/lib/server/library-file-store'

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
    return new NextResponse(fileBuffer as unknown as BodyInit, {
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

export async function PATCH(
  request: NextRequest,
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

  const body = await request.json().catch(() => null)
  const nextName = typeof body?.originalName === 'string' ? body.originalName.trim() : ''
  if (!nextName) {
    return NextResponse.json({ error: '请输入新的文件名称。' }, { status: 400 })
  }

  try {
    const updated = await prisma.questionLibraryFile.update({
      where: { id: fileId },
      data: { originalName: nextName },
    })

    return NextResponse.json({ success: true, file: serializeRecord(updated) })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: '文件不存在。' }, { status: 404 })
    }
    console.error('Rename library file error:', error)
    return NextResponse.json(
      { error: error?.message ?? '更新文件信息失败。' },
      { status: 500 },
    )
  }
}
