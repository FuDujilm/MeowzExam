'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { useNotification } from '@/components/ui/notification-provider'
import { ExplanationList } from '@/components/ExplanationList'
import { ExplanationCard, StructuredExplanation } from '@/components/ExplanationCard'

/**
 * 解析系统演示页面
 * 展示如何集成新的结构化解析功能
 */
const sampleOptionTextMap: Record<string, string> = {
  A: '《频率划分规定》',
  B: '《中华人民共和国无线电管理条例》',
  C: '《无线电发射设备管理规定》',
  D: '《民用航空无线电管理条例》',
}

const sampleStructuredExplanation: StructuredExplanation = {
  summary: '定义与频率划分的关键条文集中在《频率划分规定》，因此本题答案锁定 A。',
  answer: ['A'],
  optionAnalysis: [
    {
      option: 'A',
      verdict: 'correct',
      reason: '《频率划分规定》第一章与第二章对术语、业务分类及频率分配表作出系统规定，直接回答 Definition 与 Allocation 问题。',
    },
    {
      option: 'B',
      verdict: 'wrong',
      reason: '《中华人民共和国无线电管理条例》侧重管理职责与执法措施，缺乏对术语定义及频率划分表的细节说明，需要回到《频率划分规定》（A）。',
    },
    {
      option: 'C',
      verdict: 'wrong',
      reason: '《无线电发射设备管理规定》关注设备生产、销售与检测要求，不提供 Definition 或业务频段划分的条款。',
    },
    {
      option: 'D',
      verdict: 'wrong',
      reason: '《民用航空无线电管理条例》仅适用于民航领域的专用频率管理，无法回答通用频率定义与划分问题。',
    },
  ],
  keyPoints: [
    '考点：识记频率划分法规的出处与适用范围。',
    '《频率划分规定》总章定义术语，附录列出各类无线电业务的频率分配表。',
    '其他法规主要规定管理职责或行业特例，不能替代频率划分规定的核心内容。',
  ],
  memoryAids: [
    {
      type: 'RULE',
      text: '定义（Definition）和划分（Allocation）找《频率划分规定》（A）。',
    },
  ],
  citations: [
    {
      title: '《频率划分规定》第一章 第二条',
      url: 'https://www.miit.gov.cn/zwgk/zcwj/wxzd/art/2023/art_7cbfbd6746b249508dfe06979ad03826.html',
      quote: '第二条明确本规定用于界定无线电业务术语并划分各类业务使用的频率带。',
    },
  ],
  difficulty: 2,
}

export default function ExplanationDemoPage() {
  const [aiLoading, setAiLoading] = useState(false)
  const { notify } = useNotification()

  // 示例题目ID（需要替换为真实的题目ID）
  const demoQuestionId = 'clxxx...' // 从数据库中获取一个真实的题目ID

  const handleGenerateAI = async (): Promise<boolean> => {
    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: demoQuestionId,
          mode: 'structured', // 使用结构化模式
        }),
      })

      if (!response.ok) {
        throw new Error('生成失败')
      }

      notify({
        variant: 'success',
        title: 'AI 解析生成成功',
        description: '新的解析已生成，可在练习页面查看效果。',
      })
      return true
    } catch (error: any) {
      notify({
        variant: 'danger',
        title: 'AI 解析失败',
        description: error.message || '生成 AI 解析失败，请稍后重试。',
      })
      return false
    } finally {
      setAiLoading(false)
    }

    return false
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">解析系统演示</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              展示官方解析、AI解析、用户贡献解析的完整功能
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 功能说明 */}
            <Callout title="✨ 新功能亮点">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">1.</span>
                  <span><strong>结构化 AI 解析</strong>：包含一句话结论、逐项分析、考点、助记技巧等模块化呈现。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">2.</span>
                  <span><strong>用户贡献解析</strong>：点击“我来贡献解析”即可提交自己的思路。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">3.</span>
                  <span><strong>社区投票</strong>：对解析点赞👍、点踩👎或举报🚩，优质内容自动上浮。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-blue-600">4.</span>
                  <span><strong>来源整合</strong>：官方解析（最高优先级）+ AI 解析 + 用户解析（Wilson Score 排序）。</span>
                </li>
              </ul>
            </Callout>

            {/* 使用说明 */}
            <Callout variant="success" title="📖 如何集成到练习页面">
              <div className="space-y-3 text-sm">
                <p className="font-mono rounded-xl border border-emerald-200 bg-white/70 p-2 text-emerald-700 shadow-sm dark:bg-slate-900/60">
                  {`import { ExplanationList } from '@/components/ExplanationList'`}
                </p>
                <p>然后在提交答案后显示：</p>
                <pre className="rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs text-emerald-700 shadow-sm dark:bg-slate-900/60">
{`{submitted && currentQuestion && (
  <ExplanationList
    questionId={currentQuestion.id}
    onGenerateAI={handleGenerateAI}
    aiLoading={aiLoading}
  />
)}`}
                </pre>
              </div>
            </Callout>

            {/* 实际演示区域 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">📝 实际演示（需要真实题目ID）</h3>
              <p className="text-sm text-gray-600 mb-4">
                请在下方输入一个真实的题目ID来测试解析功能，或者直接访问练习页面查看集成效果。
              </p>

              {/* 如果有真实题目ID，取消注释下面的代码 */}
              {/*
              <ExplanationList
                questionId={demoQuestionId}
                onGenerateAI={handleGenerateAI}
                aiLoading={aiLoading}
              />
              */}

              <Callout variant="warning" title="⚠️ 此演示页面需要一个真实的题目 ID">
                <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800 dark:text-amber-200">
                  <li>访问任意练习页面（如 /practice?mode=random&type=A_CLASS）。</li>
                  <li>做完一道题并提交答案。</li>
                  <li>查看全新的解析系统界面与交互。</li>
                  <li>尝试生成 AI 解析或贡献自己的解析。</li>
                </ol>
              </Callout>

              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">📘 示例解析卡片</h4>
                <ExplanationCard
                  type="OFFICIAL"
                  format="structured"
                  content={sampleStructuredExplanation}
                  optionTextMap={sampleOptionTextMap}
                />
              </div>
            </div>

            {/* 集成检查清单 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">✅ 集成检查清单</h3>
              <div className="space-y-2 text-sm text-purple-800">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>已导入 ExplanationList 组件</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>已在提交答案后显示 ExplanationList</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>已实现 handleGenerateAI 函数</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>已配置 OPENAI_API_KEY 环境变量</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>数据库已同步（pnpm exec prisma db push）</span>
                </label>
              </div>
            </div>

            {/* 快速跳转按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.href = '/practice?mode=random&type=A_CLASS'}
                className="flex-1"
              >
                前往练习页面测试
              </Button>
              <Button
                onClick={() => window.location.href = '/admin/explanations'}
                variant="outline"
                className="flex-1"
              >
                前往解析管理页面
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API 文档 */}
        <Card>
          <CardHeader>
            <CardTitle>📚 API 文档</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">1. 生成AI解析</h4>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`POST /api/ai/explain
Body: {
  "questionId": "clxxx...",
  "mode": "structured"  // 或 "simple"（旧格式）
}

Response: {
  "explanation": {
    "summary": "一句话结论",
    "answer": ["B"],
    "optionAnalysis": [...],
    "keyPoints": [...],
    "memoryAids": [...],
    "citations": [...],
    "difficulty": 2
  },
  "explanationId": "clxxx...",
  "mode": "structured",
  "cached": false
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">2. 获取解析列表</h4>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`GET /api/questions/{questionId}/explanations

Response: {
  "questionId": "clxxx...",
  "explanations": [
    {
      "id": "xxx",
      "type": "OFFICIAL" | "AI" | "USER",
      "content": "..." | {...},
      "format": "text" | "structured",
      "upvotes": 10,
      "downvotes": 2,
      "wilsonScore": 0.75,
      "userVote": "UP" | "DOWN" | "REPORT" | null,
      "createdBy": { "id": "...", "name": "..." }
    }
  ]
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">3. 用户提交解析</h4>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`POST /api/questions/{questionId}/explanations
Body: {
  "content": "解析内容（至少20字符）",
  "format": "text"
}

Response: {
  "success": true,
  "explanation": { ... }
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">4. 投票</h4>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`POST /api/explanations/{explanationId}/vote
Body: {
  "vote": "UP" | "DOWN" | "REPORT"
}

Response: {
  "success": true,
  "action": "created" | "updated" | "removed",
  "vote": "UP" | null
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
