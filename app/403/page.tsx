import { ErrorView } from '@/components/site/error-view'

export default function ForbiddenPage() {
  return (
    <ErrorView
      statusCode="403"
      title="您没有权限访问该内容"
      description="该页面仅面向特定角色或尚未开放。请联系管理员获取授权。"
      hint="如认为这是误判，请将截图反馈给系统维护人员。"
      primaryAction={{ label: '返回首页', href: '/' }}
      secondaryAction={{ label: '联系维护者', href: '/about#contact' }}
    />
  )
}
