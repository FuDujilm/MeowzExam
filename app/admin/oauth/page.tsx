import { getOAuthSettings, updateOAuthSettings } from '@/lib/oauth-settings'
import { revalidatePath } from 'next/cache'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AdminPageShell } from '@/components/admin/AdminPageShell'

async function updateDisplayNameAction(formData: FormData) {
  'use server'
  const displayName = formData.get('displayName')
  const nextName = typeof displayName === 'string' ? displayName.trim() : ''
  if (!nextName) {
    return
  }
  await updateOAuthSettings({ displayName: nextName })
  revalidatePath('/admin/oauth')
}

export default async function OAuthAdminPage() {
  const settings = await getOAuthSettings()

  const oauthBaseUrl =
    process.env.OAUTH_BASE_URL ??
    process.env.NEXT_PUBLIC_OAUTH_BASE_URL ??
    '未配置'
  const clientId = process.env.OAUTH_CLIENT_ID ?? '未配置'
  const clientSecret =
    process.env.NODE_ENV === 'development'
      ? process.env.OAUTH_CLIENT_SECRET ?? '未配置'
      : '仅在本地显示'
  const appBaseUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3001'

  const sanitizedAppBase = appBaseUrl.replace(/\/$/, '')
  const signinUrl = `${sanitizedAppBase}/api/auth/signin/custom`
  const callbackUrl = `${sanitizedAppBase}/api/auth/callback/custom`

  const providerPreview = {
    provider: {
      id: 'custom',
      name: settings.displayName,
      type: 'oauth',
      clientId,
      token: {
        url: `${oauthBaseUrl}/api/oauth/token`,
      },
      authorization: {
        url: `${oauthBaseUrl}/api/oauth/authorize`,
      },
      userinfo: {
        url: `${oauthBaseUrl}/api/oauth/userinfo`,
      },
      signinUrl,
      callbackUrl,
    },
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-5xl" contentClassName="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">OAuth 管理</h1>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          查看当前 OAuth 配置并调整登录按钮的显示名称。生产环境回调域名为{' '}
          <Badge variant="outline" className="ml-1">
            exam.mzyd.work
          </Badge>
          ，请保证 OAuth 服务端已允许该回调。
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>登录按钮显示名</CardTitle>
            <CardDescription>将同步显示在登录页面和相关提示中。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateDisplayNameAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={settings.displayName}
                  placeholder="例如：统一认证中心"
                />
              </div>
              <Button type="submit" className="w-full">
                保存显示名称
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前环境变量</CardTitle>
            <CardDescription>以下信息来自本地/服务器环境变量。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex items-center justify-between">
              <span>OAuth Base URL</span>
              <span className="font-mono text-xs">{oauthBaseUrl}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Client ID</span>
              <span className="font-mono text-xs">{clientId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Client Secret</span>
              <span className="font-mono text-xs">{clientSecret}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>APP Base URL</span>
              <span className="font-mono text-xs">{sanitizedAppBase}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sign-in URL</span>
              <span className="font-mono text-xs">{signinUrl}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Callback URL</span>
              <span className="font-mono text-xs">{callbackUrl}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NextAuth Provider Preview</CardTitle>
          <CardDescription>该片段反映当前系统将使用的 OAuth 配置（隐藏密钥）。</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-slate-100">
            {JSON.stringify(providerPreview, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
