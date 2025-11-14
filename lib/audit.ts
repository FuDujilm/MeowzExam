import { prisma } from '@/lib/db'

export type AuditAction =
  | 'AI_EXPLANATION_GENERATED'
  | 'AI_EXPLANATION_SKIPPED'
  | 'AI_EXPLANATION_ERROR'
  | 'MANUAL_EXPLANATION_UPDATED'
  | 'QUESTIONS_IMPORTED'
  | 'QUESTIONS_IMPORT_ERROR'
  | 'QUESTION_LIBRARY_IMPORTED'
  | 'QUESTION_LIBRARY_IMPORT_ERROR'
  | 'USER_ADMIN_RESET'
  | 'USER_ADMIN_UPDATED'

type AuditDetails = Record<string, unknown>

interface CreateAuditLogOptions {
  userId?: string | null
  action: AuditAction
  entityType?: string
  entityId?: string
  details?: AuditDetails
}

/**
 * 记录审计日志
 */
export async function createAuditLog(options: CreateAuditLogOptions) {
  try {
    const { userId, action, entityType, entityId, details } = options

    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        details: details ? (details as object) : undefined,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}
