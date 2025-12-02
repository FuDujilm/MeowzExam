import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

/**
 * PATCH /api/admin/question-libraries/[libraryId]
 * 更新题库基本信息(名称、描述、可见性等)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ libraryId: string }> }
) {
  try {
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error ?? '需要管理员权限' },
        { status: adminCheck.status ?? 401 },
      )
    }

    const sessionEmail = adminCheck.user?.email
    if (!sessionEmail) {
      return NextResponse.json({ error: '用户邮箱不存在' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { email: true },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const params = await context.params
    const { libraryId } = params

    const body = await request.json()
    const {
      name,
      shortName,
      description,
      region,
      visibility,
      displayTemplate,
      allowedEmails,
    } = body

    const library = await prisma.questionLibrary.findUnique({
      where: { id: libraryId },
      include: { access: true },
    })

    if (!library) {
      return NextResponse.json({ error: '题库不存在' }, { status: 404 })
    }

    // 验证可见性设置
    const validVisibility = ['ADMIN_ONLY', 'PUBLIC', 'CUSTOM']
    const normalizedVisibility = validVisibility.includes(visibility) ? visibility : library.visibility

    // 更新题库基本信息
    const updatedLibrary = await prisma.questionLibrary.update({
      where: { id: libraryId },
      data: {
        name: name?.trim() || library.name,
        shortName: shortName?.trim() || library.shortName,
        description: description?.trim() || library.description,
        region: region?.trim() || library.region,
        visibility: normalizedVisibility,
        displayTemplate: displayTemplate?.trim() || library.displayTemplate,
      },
      include: {
        examPresets: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    // 如果可见性设置为 CUSTOM，更新访问权限列表
    if (normalizedVisibility === 'CUSTOM' && Array.isArray(allowedEmails)) {
      // 删除现有的访问权限
      await prisma.questionLibraryAccess.deleteMany({
        where: { libraryId },
      })

      // 添加新的访问权限
      const emailList = allowedEmails
        .map((email: unknown) => (typeof email === 'string' ? email.trim() : ''))
        .filter(Boolean)

      if (emailList.length > 0) {
        for (const email of emailList) {
          const targetUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          })

          await prisma.questionLibraryAccess.create({
            data: {
              libraryId,
              userId: targetUser?.id,
              userEmail: email,
            },
          })
        }
      }
    }

    // 如果可见性不是 CUSTOM，清除所有访问权限
    if (normalizedVisibility !== 'CUSTOM') {
      await prisma.questionLibraryAccess.deleteMany({
        where: { libraryId },
      })
    }

    // 获取更新后的访问权限列表
    const access = await prisma.questionLibraryAccess.findMany({
      where: { libraryId },
      select: { userEmail: true },
    })

    return NextResponse.json({
      success: true,
      library: {
        ...updatedLibrary,
        allowedEmails: access.map(a => a.userEmail).filter(Boolean),
      },
    })
  } catch (error) {
    console.error('Update library error:', error)
    return NextResponse.json(
      { error: '更新题库失败，请稍后再试' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/question-libraries/[libraryId]
 * 删除题库及其所有相关数据
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ libraryId: string }> }
) {
  try {
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error ?? '需要管理员权限' },
        { status: adminCheck.status ?? 401 },
      )
    }

    const sessionEmail = adminCheck.user?.email
    if (!sessionEmail) {
      return NextResponse.json({ error: '用户邮箱不存在' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { email: true },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const params = await context.params
    const { libraryId } = params

    const library = await prisma.questionLibrary.findUnique({
      where: { id: libraryId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            questions: true,
            examPresets: true,
            files: true,
          },
        },
      },
    })

    if (!library) {
      return NextResponse.json({ error: '题库不存在' }, { status: 404 })
    }

    // 删除题库(级联删除会自动删除相关的题目、预设、文件等)
    await prisma.questionLibrary.delete({
      where: { id: libraryId },
    })

    return NextResponse.json({
      success: true,
      message: `题库「${library.name}」已删除`,
      deletedCounts: {
        questions: library._count.questions,
        presets: library._count.examPresets,
        files: library._count.files,
      },
    })
  } catch (error) {
    console.error('Delete library error:', error)
    return NextResponse.json(
      { error: '删除题库失败，请稍后再试' },
      { status: 500 }
    )
  }
}
