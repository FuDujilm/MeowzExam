import { NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth/jwt'
import { verifyCode } from '@/lib/email'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  code: z.string().min(6, '验证码应为6位数字').max(6, '验证码应为6位数字'),
})

const EXAM_TYPES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = loginSchema.parse(body)

    const isValidCode = verifyCode(email, code)
    if (!isValidCode) {
      return NextResponse.json({
        success: false,
        message: '验证码错误或已过期'
      }, { status: 400 })
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          settings: {
            create: {
              enableWrongQuestionWeight: false,
              theme: 'light',
              examType: 'A_CLASS',
            },
          },
        },
        include: {
          settings: true,
        },
      })
    } else if (!user.settings) {
      const settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          enableWrongQuestionWeight: false,
          theme: 'light',
          examType: 'A_CLASS',
        },
      })
      user = {
        ...user,
        settings,
      }
    }

    const normalizedExamType = user.settings?.examType && EXAM_TYPES.has(user.settings.examType)
      ? user.settings.examType
      : 'A_CLASS'

    const token = generateToken({
      id: user.id,
      email: user.email,
      callsign: user.callsign || undefined,
    })

    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          callsign: user.callsign,
          selectedExamType: normalizedExamType,
        },
        token,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: error.issues[0].message,
      }, { status: 400 })
    }

    console.error('Login error:', error)
    return NextResponse.json({
      success: false,
      message: '登录失败，请稍后重试'
    }, { status: 500 })
  }
}
