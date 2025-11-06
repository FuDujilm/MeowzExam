import type { AiExplainOutput } from './schema'
import { prisma } from '@/lib/db'
import {
  generateAIExplanation,
  type AIExplanationRequest,
  type AIExplanationResult,
} from './openai'

export interface UnifiedAIRequest {
  questionTitle: string
  options: Array<{ id: string; text: string }>
  correctAnswers: string[]
  category?: string
  difficulty?: string
  syllabusPath?: string
  evidence?: Array<{ url: string; title: string; snippet: string }>
}

export async function generateExplanation(
  request: UnifiedAIRequest,
  _userId?: string
): Promise<{ explanation: AiExplainOutput; provider: string; modelName: string; groupId: string | null }> {
  const openaiRequest: AIExplanationRequest = {
    questionTitle: request.questionTitle,
    options: request.options,
    correctAnswers: request.correctAnswers,
    category: request.category,
    difficulty: request.difficulty,
    syllabusPath: request.syllabusPath,
    evidence: request.evidence?.map(item => ({
      title: item.title,
      url: item.url,
      quote: item.snippet,
    })),
  }

  const result: AIExplanationResult = await generateAIExplanation(openaiRequest)

  return {
    explanation: result.explanation,
    provider: result.provider,
    modelName: result.modelName,
    groupId: result.groupId,
  }
}

export async function getAvailableProviders(): Promise<
  Array<{ id: string; name: string; modelName: string }>
> {
  const groups = await prisma.aiModelGroup.findMany({
    where: {
      isActive: true,
      usageScope: {
        in: ['EXPLANATION', 'BOTH'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      modelName: true,
    },
  })

  return groups
}
