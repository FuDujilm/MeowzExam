import { ErrorView } from '@/components/site/error-view'

const TIPS = [
  '检查地址是否拼写正确，或使用上方导航重新进入。',
  '题库结构近期更新，旧链接可能会失效。',
  '返回首页即可继续练习或参加模拟考试。',
]

export default function NotFound() {
  const tip = TIPS[new Date().getMinutes() % TIPS.length]

  return (
    <ErrorView
      statusCode="404"
      title="没找到相关页面"
      description="您访问的内容可能已被移动或不存在。"
      hint={tip}
      primaryAction={{ label: '回到首页', href: '/' }}
      secondaryAction={{ label: '查看公告', href: '/about' }}
    />
  )
}
