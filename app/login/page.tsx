'use client'

import { signIn } from "next-auth/react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const handleLogin = async () => {
    await signIn("custom", {
      callbackUrl: "/",
      redirect: true,
    })
  }

  const oauthServerDisplay =
    process.env.NEXT_PUBLIC_OAUTH_BASE_URL ??
    process.env.OAUTH_BASE_URL ??
    "未配置"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">业余无线电刷题系统</CardTitle>
          <CardDescription>
            点击下方按钮登录系统
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            使用 OAuth 登录
          </Button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>将跳转到统一认证平台进行登录</p>
            <p className="mt-2 text-xs">OAuth Server: {oauthServerDisplay}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
