'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNotification } from '@/components/ui/notification-provider'
import { Download, Save } from 'lucide-react'

interface UserSettings {
  callsign?: string
  enableWrongQuestionWeight: boolean
  theme: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [settings, setSettings] = useState<UserSettings>({
    callsign: '',
    enableWrongQuestionWeight: false,
    theme: 'light',
  })
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { notify } = useNotification()

  // 加载设置
  useEffect(() => {
    if (status === 'authenticated') {
      loadSettings()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          callsign: data.user?.callsign || '',
          enableWrongQuestionWeight: data.settings?.enableWrongQuestionWeight || false,
          theme: data.settings?.theme || 'light',
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  // 保存设置
  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        notify({
          variant: 'success',
          title: '设置已保存',
          description: '您的个性化偏好已更新。',
        })
      } else {
        const error = await res.json()
        notify({
          variant: 'danger',
          title: '保存失败',
          description: error.error || '请稍后再试。',
        })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setSaving(false)
    }
  }

  // 导出数据
  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/user/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `练习数据_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await res.json()
        notify({
          variant: 'danger',
          title: '导出失败',
          description: error.error || '无法导出练习数据，请稍后再试。',
        })
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      notify({
        variant: 'danger',
        title: '导出失败',
        description: '导出文件时出现异常，请稍后重试。',
      })
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">个人设置</h1>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>设置您的个人信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ''}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="callsign">业余电台呼号（可选）</Label>
              <Input
                id="callsign"
                type="text"
                placeholder="例如: BG1ABC"
                value={settings.callsign}
                onChange={(e) => setSettings({ ...settings, callsign: e.target.value })}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                填写您的业余电台呼号，方便记录和展示
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 学习偏好 */}
        <Card>
          <CardHeader>
            <CardTitle>学习偏好</CardTitle>
            <CardDescription>自定义您的学习体验</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="wrong-weight">错题权重增强</Label>
                <p className="text-sm text-gray-500 mt-1">
                  在随机练习中提高错题出现的概率
                </p>
              </div>
              <Switch
                id="wrong-weight"
                checked={settings.enableWrongQuestionWeight}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableWrongQuestionWeight: checked })
                }
              />
            </div>

            <div>
              <Label htmlFor="theme">主题</Label>
              <select
                id="theme"
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="light">明亮</option>
                <option value="dark">暗黑</option>
                <option value="system">跟随系统</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 数据管理 */}
        <Card>
          <CardHeader>
            <CardTitle>数据管理</CardTitle>
            <CardDescription>导出您的练习数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">导出练习数据</h4>
                <p className="text-sm text-gray-600 mb-4">
                  导出包含您的答题记录、错题本、考试成绩等数据的JSON文件
                </p>
                <Button
                  onClick={handleExportData}
                  disabled={exporting}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exporting ? '导出中...' : '导出数据'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex gap-4">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存设置'}
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
          >
            返回首页
          </Button>
        </div>

        {/* 统计信息 */}
        <Card>
          <CardHeader>
            <CardTitle>学习统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-sm text-gray-600">累计答题</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-sm text-gray-600">答对题数</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">0</p>
                <p className="text-sm text-gray-600">错题数量</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">0</p>
                <p className="text-sm text-gray-600">模拟考试</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
