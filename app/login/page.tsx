import { getOAuthSettings } from '@/lib/oauth-settings'
import LoginCard from './LoginCard'

export default async function LoginPage() {
  const settings = await getOAuthSettings()
  const oauthServerDisplay =
    process.env.NEXT_PUBLIC_OAUTH_BASE_URL ??
    process.env.OAUTH_BASE_URL ??
    '未配置'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoginCard
        displayName={settings.displayName}
        oauthServerDisplay={oauthServerDisplay}
      />
    </div>
  )
}
