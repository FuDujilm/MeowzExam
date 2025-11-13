'use client'

import { useEffect, useState } from 'react'

export interface ExamPresetSummary {
  id: string
  code: string
  name: string
  description?: string | null
  durationMinutes: number
  totalQuestions: number
  passScore: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount: number
}

export interface QuestionLibrarySummary {
  id: string
  uuid: string
  code: string
  name: string
  shortName: string
  description?: string | null
  region?: string | null
  totalQuestions: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount: number
  sourceType?: string | null
  version?: string | null
  displayLabel: string
  presets: ExamPresetSummary[]
  displayTemplate: string
  visibility: string
  updatedAt: string
}

interface State {
  libraries: QuestionLibrarySummary[]
  loading: boolean
  error: string | null
}

export function useQuestionLibraries() {
  const [state, setState] = useState<State>({
    libraries: [],
    loading: true,
    error: null,
  })

  const load = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const response = await fetch('/api/question-libraries', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('无法获取题库列表')
      }
      const data = await response.json()
      setState({
        libraries: data.libraries || [],
        loading: false,
        error: null,
      })
    } catch (error) {
      setState({
        libraries: [],
        loading: false,
        error: error instanceof Error ? error.message : '获取题库列表失败',
      })
    }
  }

  useEffect(() => {
    load()
  }, [])

  return {
    libraries: state.libraries,
    loading: state.loading,
    error: state.error,
    reload: load,
  }
}
