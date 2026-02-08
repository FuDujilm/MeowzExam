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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Download, Save } from 'lucide-react'

interface UserSettings {
  callsign?: string
  enableWrongQuestionWeight: boolean
  examType?: string
  aiStylePresetId: string | null
  aiStyleCustom: string
  examQuestionPreference: 'SYSTEM_PRESET' | 'FULL_RANDOM'
  dailyPracticeTarget: number
}

interface StylePresetOption {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  promptPreview: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [settings, setSettings] = useState<UserSettings>({
    callsign: '',
    enableWrongQuestionWeight: false,
    examType: 'A_CLASS',
    aiStylePresetId: null,
    aiStyleCustom: '',
    examQuestionPreference: 'SYSTEM_PRESET',
    dailyPracticeTarget: 10,
  })
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [stylePresets, setStylePresets] = useState<StylePresetOption[]>([])
  const [styleLoading, setStyleLoading] = useState(false)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctCount: 0,
    incorrectCount: 0,
    examsTaken: 0,
  })
  const { notify } = useNotification()

  // 加载设置
  useEffect(() => {
    if (status === 'authenticated') {
      loadSettings()
      loadStats()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    loadStylePresets()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/user/stats')
      if (res.ok) {
        const data = await res.json()
        setStats({
          totalQuestions: data.totalAttempts || 0,
          correctCount: data.totalCorrect || 0,
          incorrectCount: data.totalIncorrect || 0,
          examsTaken: data.examCount || 0,
        })
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          callsign: data.user?.callsign || '',
          enableWrongQuestionWeight: data.settings?.enableWrongQuestionWeight || false,
          examType: data.settings?.examType || 'A_CLASS',
          aiStylePresetId: data.settings?.aiStylePresetId ?? null,
          aiStyleCustom: data.settings?.aiStyleCustom ?? '',
          examQuestionPreference: data.settings?.examQuestionPreference || 'SYSTEM_PRESET',
          dailyPracticeTarget: data.settings?.dailyPracticeTarget ?? 10,
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadStylePresets = async () => {
    try {
      setStyleLoading(true)
      const res = await fetch('/api/ai/style-presets', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStylePresets(Array.isArray(data.presets) ? data.presets : [])
      }
    } catch (error) {
      console.error('Failed to load style presets:', error)
    } finally {
      setStyleLoading(false)
    }
  }

  // 保存设置
  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callsign: settings.callsign,
          enableWrongQuestionWeight: settings.enableWrongQuestionWeight,
          examType: settings.examType,
          aiStylePresetId: settings.aiStylePresetId,
          aiStyleCustom: settings.aiStyleCustom,
          examQuestionPreference: settings.examQuestionPreference,
          dailyPracticeTarget: settings.dailyPracticeTarget,
        }),
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">个人设置</h1>

        {/* 基本信息 */}
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">基本信息</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">设置您的个人信息</CardDescription>
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
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                填写您的业余电台呼号，方便记录和展示
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 学习偏好 */}
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">学习偏好</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">自定义您的学习体验</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="wrong-weight">错题权重增强</Label>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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

            <div className="space-y-1.5">
              <Label>模拟考试出题偏好</Label>
              <Select
                value={settings.examQuestionPreference}
                onValueChange={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    examQuestionPreference: value as 'SYSTEM_PRESET' | 'FULL_RANDOM',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择出题方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM_PRESET">遵循系统预设与标签编排</SelectItem>
                  <SelectItem value="FULL_RANDOM">完全随机，从题库平均抽题</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                系统预设会遵循管理员配置的标签题量与顺序；完全随机则忽略预设，纯随机抽题。
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="daily-target">每日练习题量</Label>
              <Input
                id="daily-target"
                type="number"
                min={5}
                max={50}
                value={settings.dailyPracticeTarget}
                onChange={(e) => {
                  const raw = Number(e.target.value)
                  if (Number.isNaN(raw)) {
                    setSettings((prev) => ({ ...prev, dailyPracticeTarget: 10 }))
                    return
                  }
                  const clamped = Math.min(Math.max(Math.round(raw), 5), 50)
                  setSettings((prev) => ({ ...prev, dailyPracticeTarget: clamped }))
                }}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                “每日练习”模式的题量目标。完成目标题数后即可获得打卡积分奖励。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI 小助手风格 */}
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">AI 小助手风格</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              选择系统风格预设，或输入自定义提示词，让小助手以符合你习惯的语气回答。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>风格预设</Label>
              {styleLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">风格预设加载中...</p>
              ) : (
                <Select
                  value={settings.aiStylePresetId ?? 'none'}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiStylePresetId: value === 'none' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择风格预设" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">跟随系统默认</SelectItem>
                    {stylePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                        {preset.isDefault ? '（系统默认）' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {settings.aiStylePresetId && (
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  {(() => {
                    const preset = stylePresets.find((item) => item.id === settings.aiStylePresetId)
                    if (!preset) return '该预设可能已被管理员禁用。'
                    return (
                      <>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {preset.name}
                        </div>
                        {preset.description ? <p className="mt-1">{preset.description}</p> : null}
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          提示词预览：{preset.promptPreview}
                        </p>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-style-custom">补充提示词</Label>
              <Textarea
                id="ai-style-custom"
                rows={4}
                maxLength={1500}
                value={settings.aiStyleCustom}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    aiStyleCustom: event.target.value,
                  }))
                }
                placeholder="例如：请以温柔、鼓励的语气回答，并在结尾附上 1 条记忆小技巧。"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                该内容会附加到风格预设之后，并由系统合并到提示词中。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 数据管理 */}
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">数据管理</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">导出您的练习数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium text-slate-900 dark:text-slate-100">导出练习数据</h4>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
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
        <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">学习统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: '累计答题', value: stats.totalQuestions, color: 'text-blue-500' },
                { label: '答对题数', value: stats.correctCount, color: 'text-green-500' },
                { label: '错题数量', value: stats.incorrectCount, color: 'text-red-500' },
                { label: '模拟考试', value: stats.examsTaken, color: 'text-purple-500' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-900/60"
                >
                  <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
