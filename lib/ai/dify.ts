/**
 * Dify API 调用模块
 * 支持对话应用和工作流应用
 */

import { AiExplainSchema, type AiExplainOutput } from './schema'

export interface DifyConfig {
  apiUrl: string        // Dify API URL (e.g., https://api.dify.ai/v1)
  apiKey: string        // Dify API Key
  appId?: string        // Dify App ID (可选，某些场景下需要)
  user: string          // 用户标识
  conversationId?: string
}

export interface DifyRequest {
  questionTitle: string
  options: Array<{ id: string; text: string }>
  correctAnswers: string[]
  syllabusPath?: string
  evidence?: Array<{ url: string; title: string; snippet: string }>
}

/**
 * 调用 Dify 工作流 API 生成题目解析
 */
export async function generateDifyExplanation(
  config: DifyConfig,
  request: DifyRequest
): Promise<AiExplainOutput> {
  try {
    // 构建输入数据
    const inputs = {
      question: request.questionTitle,
      options: JSON.stringify(request.options),
      correct_answer: request.correctAnswers.join(', '),
      syllabus: request.syllabusPath || '',
      evidence: request.evidence ? JSON.stringify(request.evidence) : '[]',
    }

    // 调用 Dify 工作流 API
    const response = await fetch(`${config.apiUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        response_mode: 'blocking', // 同步模式
        user: config.user,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Dify API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    // Dify 工作流返回格式：
    // {
    //   "workflow_run_id": "xxx",
    //   "task_id": "xxx",
    //   "data": {
    //     "id": "xxx",
    //     "workflow_id": "xxx",
    //     "status": "succeeded",
    //     "outputs": {
    //       "result": "..." // 这里是 AI 返回的 JSON 字符串
    //     },
    //     ...
    //   }
    // }

    const outputs = data.data?.outputs || data.outputs
    let resultText = outputs?.result || outputs?.text || outputs?.answer

    if (!resultText) {
      throw new Error('Dify 返回数据格式错误: 缺少 outputs.result')
    }

    // 如果返回的是字符串，尝试解析为 JSON
    let parsedResult
    if (typeof resultText === 'string') {
      // 清理可能的 markdown 代码块标记
      resultText = resultText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '')
      parsedResult = JSON.parse(resultText)
    } else {
      parsedResult = resultText
    }

    // 验证并返回
    const validatedData = AiExplainSchema.parse(parsedResult)
    return validatedData

  } catch (error) {
    console.error('Dify generation error:', error)

    if (error instanceof Error) {
      if ((error as { name?: string }).name === 'ZodError') {
        throw new Error(`Dify 返回格式不符合要求: ${error.message}`)
      }

      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        throw new Error(`无法连接到 Dify API: ${config.apiUrl}`)
      }

      throw new Error(`Dify 解析生成失败: ${error.message}`)
    }

    throw new Error('Dify 解析生成失败：未知错误')
  }
}

/**
 * 调用 Dify 对话应用 API（聊天模式）
 */
export async function generateDifyChatExplanation(
  config: DifyConfig,
  request: DifyRequest
): Promise<AiExplainOutput> {
  try {
    // 构建用户消息
    const userMessage = buildDifyPrompt(request)

    // 调用 Dify 对话 API
    const response = await fetch(`${config.apiUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {}, // 对话应用的变量
        query: userMessage,
        response_mode: 'blocking',
        user: config.user,
        conversation_id: config.conversationId || undefined,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Dify Chat API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    // Dify 对话返回格式：
    // {
    //   "message_id": "xxx",
    //   "conversation_id": "xxx",
    //   "mode": "chat",
    //   "answer": "...", // AI 回复内容
    //   ...
    // }

    let resultText = data.answer || data.text

    if (!resultText) {
      throw new Error('Dify Chat 返回数据格式错误: 缺少 answer')
    }

    // 清理并解析 JSON
    resultText = resultText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsedResult = JSON.parse(resultText)

    // 验证并返回
    const validatedData = AiExplainSchema.parse(parsedResult)
    return validatedData

  } catch (error) {
    console.error('Dify Chat generation error:', error)

    if (error instanceof Error) {
      if ((error as { name?: string }).name === 'ZodError') {
        throw new Error(`Dify Chat 返回格式不符合要求: ${error.message}`)
      }

      throw new Error(`Dify Chat 解析生成失败: ${error.message}`)
    }

    throw new Error('Dify Chat 解析生成失败：未知错误')
  }
}

/**
 * 构建 Dify 提示词
 */
function buildDifyPrompt(request: DifyRequest): string {
  const { questionTitle, options, correctAnswers, syllabusPath, evidence } = request

  let prompt = `请为以下业余无线电考试题目生成详细解析，以 JSON 格式返回。

## 题目
${questionTitle}

## 选项
${options.map(opt => `${opt.id}. ${opt.text}`).join('\n')}

## 标准答案
${correctAnswers.join(', ')}
`

  if (syllabusPath) {
    prompt += `\n## 大纲路径\n${syllabusPath}\n`
  }

  if (evidence && evidence.length > 0) {
    prompt += `\n## 参考证据\n${evidence.map((e, i) => `${i + 1}. [${e.title}](${e.url})\n   ${e.snippet}`).join('\n\n')}\n`
  }

  prompt += `
## 输出要求
请严格按照以下 JSON Schema 输出解析：

\`\`\`json
{
  "summary": "一句话结论（20-300字）",
  "answer": ["正确答案选项，如 A 或 B"],
  "optionAnalysis": [
    {"option": "A", "verdict": "correct或wrong", "reason": "分析原因"},
    {"option": "B", "verdict": "correct或wrong", "reason": "分析原因"}
  ],
  "keyPoints": ["考点1", "考点2"],
  "memoryAids": [
    {"type": "ACRONYM/RHYMING/RULE/STORY", "text": "助记内容"}
  ],
  "citations": [
    {"title": "来源标题", "url": "来源链接", "quote": "引用内容"}
  ],
  "difficulty": 1-5,
  "insufficiency": false
}
\`\`\`

注意：
1. 必须严格按照上述 JSON 格式输出
2. summary 必须是 20-300 字符的中文
3. optionAnalysis 必须包含所有选项的分析
4. keyPoints 至少包含 1 个考点，最多 5 个
5. memoryAids 可选，最多 3 个
6. 如果证据不足，将 insufficiency 设为 true
`

  return prompt
}
