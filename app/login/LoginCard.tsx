'use client'

import { signIn } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface LoginCardProps {
  displayName: string
  oauthServerDisplay: string
}

export default function LoginCard({ displayName, oauthServerDisplay }: LoginCardProps) {
  const handleLogin = async () => {
    await signIn('custom', {
      callbackUrl: '/',
      redirect: true,
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">业余无线电刷题系统</CardTitle>
        <CardDescription>点击下方按钮登录系统</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleLogin} className="w-full" size="lg">
          使用 {displayName} 登录
        </Button>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>将跳转到统一认证平台进行登录</p>
          <p className="mt-2 text-xs">OAuth Server: {oauthServerDisplay}</p>
        </div>
      </CardContent>
    </Card>
  )
}
