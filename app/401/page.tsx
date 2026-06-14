import { ErrorView } from '@/components/site/error-view'

export default function UnauthorizedPage() {
  return (
    <ErrorView
      statusCode="401"
      title="当前功能不可用"
      description="基础练习和考试无需登录，解析、投票和后台管理暂不对匿名用户开放。"
      hint="请返回首页继续使用公开功能。"
      primaryAction={{ label: '返回首页', href: '/' }}
    />
  )
}
