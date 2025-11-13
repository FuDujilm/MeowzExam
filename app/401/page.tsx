import { ErrorView } from '@/components/site/error-view'

export default function UnauthorizedPage() {
  return (
    <ErrorView
      statusCode="401"
      title="需要登录后才能继续"
      description="请先登录账号，系统才能同步您的题库进度与积分。"
      hint="如果已经登录，可尝试刷新页面或重新进入。"
      primaryAction={{ label: '前往登录', href: '/login' }}
      secondaryAction={{ label: '返回首页', href: '/' }}
    />
  )
}
