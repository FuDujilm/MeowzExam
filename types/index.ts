export interface User {
  id: string
  email: string
  callsign?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  id: string
  userId: string
  enableWrongQuestionWeight: boolean
  theme: 'light' | 'dark' | 'system'
  createdAt: Date
  updatedAt: Date
}

export interface Question {
  id: string
  type: QuestionType
  category?: string
  question: string
  options: string[]
  correctAnswer: string
  isMultipleChoice: boolean
  explanation?: string
  mnemonic?: string
  erratum?: string
  aiExplanation?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserQuestion {
  id: string
  userId: string
  questionId: string
  correctCount: number
  incorrectCount: number
  lastAnswered?: Date
  lastCorrect?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Exam {
  id: string
  type: QuestionType
  duration: number
  createdAt: Date
  updatedAt: Date
}

export interface ExamResult {
  id: string
  userId: string
  examId: string
  score: number
  totalQuestions: number
  correctCount: number
  passed: boolean
  timeSpent?: number
  answers: ExamAnswer[]
  createdAt: Date
}

export interface ExamAnswer {
  questionId: string
  userAnswer: string
  correct: boolean
}

export enum QuestionType {
  A_CLASS = 'A_CLASS',
  B_CLASS = 'B_CLASS',
  C_CLASS = 'C_CLASS'
}

export interface SiteMessage {
  id: string
  title: string
  content: string
  level: SiteMessageLevel
  audience: SiteMessageAudience
  publishedAt: Date
  expiresAt?: Date | null
  emailSentAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export enum SiteMessageLevel {
  NORMAL = 'NORMAL',
  GENERAL = 'GENERAL',
  URGENT = 'URGENT'
}

export enum SiteMessageAudience {
  ALL = 'ALL',
  ADMIN_ONLY = 'ADMIN_ONLY'
}

export interface AuthUser {
  id: string
  email: string
  callsign?: string
}

export interface LoginRequest {
  email: string
  code: string
}

export interface SendCodeRequest {
  email: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}
