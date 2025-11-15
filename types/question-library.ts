export type QuestionOption = {
  id: string
  text: string
  is_correct?: boolean
  isCorrect?: boolean
  media?: {
    url: string
    alt?: string
  } | null
}

export interface QuestionCategory {
  main?: {
    code?: string
    name?: string
  }
  subSection?: string
  fullPath?: string
  [key: string]: unknown
}

export interface QuestionMetadata {
  sourceId?: string
  pageSection?: string
  originalAnswer?: string
  [key: string]: unknown
}

export type QuestionKind = 'single_choice' | 'multiple_choice' | 'true_false'

export type ExamPresetTagRule = {
  id: string
  label?: string | null
  tags?: string[]
  count: number
  questionType?: QuestionKind | 'any'
  requireImage?: boolean
}

export type ExamPresetQuestionStrategy = {
  mode: 'TAG_RULES' | 'RANDOM'
  order: 'FIXED' | 'SHUFFLE'
  rules: ExamPresetTagRule[]
}

export type ExamPresetMetadata = {
  questionStrategy?: ExamPresetQuestionStrategy
  [key: string]: unknown
}

export interface QuestionItem {
  uuid?: string
  id?: string
  externalId?: string
  title: string
  questionType: QuestionKind
  difficulty?: string
  category?: QuestionCategory
  options: QuestionOption[]
  correctAnswers?: string[]
  explanation?: string | null
  tags?: string[]
  hasImage?: boolean
  imagePath?: string | null
  imageAlt?: string | null
  sourceId?: string | null
  pageSection?: string | null
  originalAnswer?: string | null
  picture?: string | null
  pictureAlt?: string | null
  metadata?: QuestionMetadata
}

export interface QuestionLibraryHeader {
  uuid: string
  code?: string
  name: string
  shortName: string
  description?: string
  author?: string
  date?: string
  type?: string | number
  region?: string
  version?: string
  visibility?: 'ADMIN_ONLY' | 'PUBLIC' | 'CUSTOM'
  displayTemplate?: string
  presets?: Array<ExamPresetDefinition>
  access?: {
    mode: 'ADMIN_ONLY' | 'PUBLIC' | 'CUSTOM'
    users?: string[]
  }
  metadata?: Record<string, unknown>
}

export interface ExamPresetDefinition {
  id?: string
  code: string
  name: string
  description?: string | null
  durationMinutes: number
  totalQuestions: number
  passScore: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount?: number
  metadata?: ExamPresetMetadata | null
}

export interface QuestionLibraryImportPayload {
  library: QuestionLibraryHeader
  questions: QuestionItem[]
}

export interface QuestionLibraryFileInfo {
  id: string
  libraryId: string
  filename: string
  originalName?: string | null
  fileSize: number
  mimeType?: string | null
  checksum?: string | null
  uploadedAt: string
  uploadedBy?: string | null
  uploadedByEmail?: string | null
}
