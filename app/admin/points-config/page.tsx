'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotification } from '@/components/ui/notification-provider'
import { ChevronLeft, Save } from 'lucide-react'

export default function PointsConfigPage() {
  const router = useRouter()
  const [config, setConfig] = useState({
    pointsName: '积分',
    answerCorrect: 10,
    dailyCheckIn: 50,
    streak3Days: 100,
    streak7Days: 150,
    aiRegenerateDailyFree: 5,
    aiRegenerateCost: 100,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { notify } = useNotification()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/points-config')
      if (response.ok) {
        const data = await response.json()
        setConfig({
          pointsName: data.pointsName,
          answerCorrect: data.answerCorrect,
          dailyCheckIn: data.dailyCheckIn,
          streak3Days: data.streak3Days,
          streak7Days: data.streak7Days,
          aiRegenerateDailyFree: data.aiRegenerateDailyFree ?? 5,
          aiRegenerateCost: data.aiRegenerateCost ?? 100,
        })
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/points-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        notify({
          variant: 'success',
          title: '保存成功',
          description: '积分配置已更新。',
        })
      } else {
        notify({
          variant: 'danger',
          title: '保存失败',
          description: '请检查输入内容或稍后再试。',
        })
      }
    } catch (error) {
      console.error('保存失败:', error)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回
        </Button>

        <h1 className="text-3xl font-bold">积分系统配置</h1>
        <p className="text-gray-600 mt-2">
          配置积分代币名称和各类奖励数值
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>积分设置</CardTitle>
          <CardDescription>
            修改积分名称和奖励规则
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 积分名称 */}
          <div className="space-y-2">
            <Label htmlFor="pointsName">积分代币名称</Label>
            <Input
              id="pointsName"
              value={config.pointsName}
              onChange={(e) => setConfig({ ...config, pointsName: e.target.value })}
              placeholder="积分"
            />
            <p className="text-sm text-gray-500">
              例如：积分、金币、经验值等
            </p>
          </div>

          {/* 答对题目奖励 */}
          <div className="space-y-2">
            <Label htmlFor="answerCorrect">答对一题奖励</Label>
            <Input
              id="answerCorrect"
              type="number"
              value={config.answerCorrect}
              onChange={(e) => setConfig({ ...config, answerCorrect: parseInt(e.target.value) })}
              placeholder="10"
            />
            <p className="text-sm text-gray-500">
              用户每答对一题获得的积分
            </p>
          </div>

          {/* 每日签到奖励 */}
          <div className="space-y-2">
            <Label htmlFor="dailyCheckIn">每日签到奖励</Label>
            <Input
              id="dailyCheckIn"
              type="number"
              value={config.dailyCheckIn}
              onChange={(e) => setConfig({ ...config, dailyCheckIn: parseInt(e.target.value) })}
              placeholder="50"
            />
            <p className="text-sm text-gray-500">
              用户每天签到获得的基础积分
            </p>
          </div>

          {/* 连续签到3天奖励 */}
          <div className="space-y-2">
            <Label htmlFor="streak3Days">连续签到3天额外奖励</Label>
            <Input
              id="streak3Days"
              type="number"
              value={config.streak3Days}
              onChange={(e) => setConfig({ ...config, streak3Days: parseInt(e.target.value) })}
              placeholder="100"
            />
            <p className="text-sm text-gray-500">
              连续签到3天时的额外奖励积分
            </p>
          </div>

          {/* 连续签到7天奖励 */}
          <div className="space-y-2">
            <Label htmlFor="streak7Days">连续签到7天额外奖励</Label>
            <Input
              id="streak7Days"
              type="number"
              value={config.streak7Days}
              onChange={(e) => setConfig({ ...config, streak7Days: parseInt(e.target.value) })}
              placeholder="150"
            />
            <p className="text-sm text-gray-500">
              连续签到7天（及每7天）时的额外奖励积分
            </p>
          </div>

          {/* AI 重新生成免费次数 */}
          <div className="space-y-2">
            <Label htmlFor="aiRegenerateDailyFree">AI 解析每日免费重新生成次数</Label>
            <Input
              id="aiRegenerateDailyFree"
              type="number"
              value={config.aiRegenerateDailyFree}
              onChange={(e) => setConfig({ ...config, aiRegenerateDailyFree: parseInt(e.target.value) })}
              placeholder="5"
              min={0}
            />
            <p className="text-sm text-gray-500">
              每位用户每天可免费重新生成 AI 解析的次数，管理员不受此限制
            </p>
          </div>

          {/* AI 重新生成扣除积分 */}
          <div className="space-y-2">
            <Label htmlFor="aiRegenerateCost">超出免费次数后的积分扣除</Label>
            <Input
              id="aiRegenerateCost"
              type="number"
              value={config.aiRegenerateCost}
              onChange={(e) => setConfig({ ...config, aiRegenerateCost: parseInt(e.target.value) })}
              placeholder="100"
              min={0}
            />
            <p className="text-sm text-gray-500">
              用户在用完免费次数后，每次重新生成解析将扣除的积分数
            </p>
          </div>

          {/* 保存按钮 */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </CardContent>
      </Card>

      {/* 说明卡片 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>积分规则说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>• <strong>答对题目：</strong>每答对一题获得相应积分</p>
          <p>• <strong>每日签到：</strong>每天签到可获得基础积分</p>
          <p>• <strong>连续签到奖励：</strong></p>
          <ul className="ml-6 space-y-1">
            <li>- 连续签到3天：获得基础积分 + 3天奖励</li>
            <li>- 连续签到7天：获得基础积分 + 7天奖励</li>
            <li>- 连续签到14天、21天等：每达到7的倍数天数都会获得7天奖励</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
