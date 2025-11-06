import { NextRequest, NextResponse } from 'next/server'
import { emailService, generateVerificationCode, storeVerificationCode } from '@/lib/email'
import { z } from 'zod'

const sendCodeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = sendCodeSchema.parse(body)

    // 生成验证码
    const code = generateVerificationCode()

    // 存储验证码
    storeVerificationCode(email, code)

    // 发送验证码
    const success = await emailService.sendVerificationCode(email, code)

    if (success) {
      return NextResponse.json({
        success: true,
        message: '验证码已发送，请查收邮件'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: '验证码发送失败，请稍后重试'
      }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: error.issues[0].message
      }, { status: 400 })
    }

    console.error('Send code error:', error)
    return NextResponse.json({
      success: false,
      message: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}