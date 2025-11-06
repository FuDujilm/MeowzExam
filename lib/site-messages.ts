import type { SiteMessage, SiteMessageLevel, SiteMessageReceipt } from '@/lib/generated/prisma'

import { prisma } from '@/lib/db'

export type { SiteMessageLevel }

export interface SiteMessagePayload {
  id: string
  title: string
  content: string
  level: SiteMessageLevel
  publishedAt: string
  expiresAt: string | null
  emailSentAt: string | null
  createdAt: string
  updatedAt: string
  readAt: string | null
  confirmedAt: string | null
  isRead: boolean
  isConfirmed: boolean
  requiresConfirmation: boolean
}

export interface SiteMessageListResult {
  messages: SiteMessagePayload[]
  unreadCount: number
  urgentToConfirm: SiteMessagePayload | null
}

export function serializeSiteMessage(
  record: SiteMessage,
  receipt: SiteMessageReceipt | null
): SiteMessagePayload {
  const readAt = receipt?.readAt ?? null
  const confirmedAt = receipt?.confirmedAt ?? null
  const requiresConfirmation = record.level === 'URGENT'

  return {
    id: record.id,
    title: record.title,
    content: record.content,
    level: record.level,
    publishedAt: record.publishedAt.toISOString(),
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    emailSentAt: record.emailSentAt ? record.emailSentAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    readAt: readAt ? readAt.toISOString() : null,
    confirmedAt: confirmedAt ? confirmedAt.toISOString() : null,
    isRead: Boolean(readAt),
    isConfirmed: Boolean(confirmedAt),
    requiresConfirmation,
  }
}

export async function listSiteMessagesForUser(
  userId: string,
  options: { limit?: number; includeExpired?: boolean } = {}
): Promise<SiteMessageListResult> {
  const now = new Date()
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const includeExpired = Boolean(options.includeExpired)

  const messageConditions = includeExpired
    ? {
        publishedAt: { lte: now },
      }
    : {
        publishedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      }

  const records = await prisma.siteMessage.findMany({
    where: messageConditions,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  const messageIds = records.map((record) => record.id)
  const receipts = messageIds.length
    ? await prisma.siteMessageReceipt.findMany({
        where: {
          userId,
          messageId: {
            in: messageIds,
          },
        },
      })
    : []

  const receiptMap = new Map<string, SiteMessageReceipt>()
  for (const receipt of receipts) {
    receiptMap.set(receipt.messageId, receipt)
  }

  const payloads = records.map((record) => serializeSiteMessage(record, receiptMap.get(record.id) ?? null))
  const unreadCount = payloads.filter((item) => !item.isRead).length
  const urgentToConfirm = payloads.find((item) => item.requiresConfirmation && !item.isConfirmed) ?? null

  return {
    messages: payloads,
    unreadCount,
    urgentToConfirm,
  }
}

export async function markMessagesRead(userId: string, messageIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(messageIds.filter((id) => typeof id === 'string' && id.trim().length > 0)))
  if (uniqueIds.length === 0) {
    return
  }

  const now = new Date()

  await prisma.$transaction(
    uniqueIds.map((messageId) =>
      prisma.siteMessageReceipt.upsert({
        where: {
          userId_messageId: {
            userId,
            messageId,
          },
        },
        create: {
          userId,
          messageId,
          readAt: now,
        },
        update: {
          readAt: now,
        },
      })
    )
  )
}

export async function confirmSiteMessage(userId: string, messageId: string): Promise<void> {
  if (!messageId || !messageId.trim()) {
    return
  }

  const now = new Date()

  await prisma.siteMessageReceipt.upsert({
    where: {
      userId_messageId: {
        userId,
        messageId,
      },
    },
    create: {
      userId,
      messageId,
      readAt: now,
      confirmedAt: now,
    },
    update: {
      readAt: now,
      confirmedAt: now,
    },
  })
}

export interface AdminSiteMessagePayload {
  id: string
  title: string
  content: string
  level: SiteMessageLevel
  publishedAt: string
  expiresAt: string | null
  emailSentAt: string | null
  createdAt: string
  updatedAt: string
  creatorEmail: string | null
}

export function serializeAdminSiteMessage(record: SiteMessage & { createdBy?: { email: string | null } | null }): AdminSiteMessagePayload {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    level: record.level,
    publishedAt: record.publishedAt.toISOString(),
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    emailSentAt: record.emailSentAt ? record.emailSentAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    creatorEmail: record.createdBy?.email ?? null,
  }
}

export async function listNotificationRecipients(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      emailVerified: { not: null },
    },
    select: { email: true },
  })

  return users.map((user) => user.email!).filter((email) => !!email)
}
