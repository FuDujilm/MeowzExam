import type { Prisma } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'
import { createMigrationCode, hashMigrationCode } from '@/lib/auth/guest-user'

const DEFAULT_MIGRATION_CODE_TTL_HOURS = 24

function addHours(date: Date, hours: number) {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next
}

function getCodeTtlHours() {
  const raw = process.env.GUEST_MIGRATION_CODE_TTL_HOURS
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_MIGRATION_CODE_TTL_HOURS
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MIGRATION_CODE_TTL_HOURS
}

export async function createGuestMigrationCode(guestUserId: string) {
  let code = createMigrationCode()
  let codeHash = hashMigrationCode(code)

  for (let attempts = 0; attempts < 5; attempts += 1) {
    const existing = await prisma.guestMigrationCode.findUnique({
      where: { codeHash },
      select: { id: true },
    })
    if (!existing) break
    code = createMigrationCode()
    codeHash = hashMigrationCode(code)
  }

  await prisma.guestMigrationCode.create({
    data: {
      codeHash,
      guestUserId,
      expiresAt: addHours(new Date(), getCodeTtlHours()),
    },
  })

  return {
    code,
    expiresAt: addHours(new Date(), getCodeTtlHours()),
  }
}

async function mergeUserQuestion(tx: Prisma.TransactionClient, targetUserId: string, sourceUserId: string) {
  const sourceRows = await tx.userQuestion.findMany({
    where: { userId: sourceUserId },
  })

  for (const row of sourceRows) {
    await tx.userQuestion.upsert({
      where: {
        userId_questionId: {
          userId: targetUserId,
          questionId: row.questionId,
        },
      },
      create: {
        userId: targetUserId,
        questionId: row.questionId,
        correctCount: row.correctCount,
        incorrectCount: row.incorrectCount,
        lastAnswered: row.lastAnswered,
        lastCorrect: row.lastCorrect,
      },
      update: {
        correctCount: { increment: row.correctCount },
        incorrectCount: { increment: row.incorrectCount },
        lastAnswered: row.lastAnswered ?? undefined,
        lastCorrect: row.lastCorrect ?? undefined,
      },
    })
  }
}

async function mergeFavorites(tx: Prisma.TransactionClient, targetUserId: string, sourceUserId: string) {
  const sourceRows = await tx.favoriteQuestion.findMany({
    where: { userId: sourceUserId },
  })

  for (const row of sourceRows) {
    await tx.favoriteQuestion.upsert({
      where: {
        userId_questionId: {
          userId: targetUserId,
          questionId: row.questionId,
        },
      },
      create: {
        userId: targetUserId,
        questionId: row.questionId,
        createdAt: row.createdAt,
      },
      update: {},
    })
  }
}

async function mergeDailyPractice(tx: Prisma.TransactionClient, targetUserId: string, sourceUserId: string) {
  const sourceRows = await tx.dailyPracticeRecord.findMany({
    where: { userId: sourceUserId },
  })

  for (const row of sourceRows) {
    await tx.dailyPracticeRecord.upsert({
      where: {
        userId_date: {
          userId: targetUserId,
          date: row.date,
        },
      },
      create: {
        userId: targetUserId,
        date: row.date,
        questionCount: row.questionCount,
        completed: row.completed,
        completedAt: row.completedAt,
        rewardPoints: row.rewardPoints,
      },
      update: {
        questionCount: { increment: row.questionCount },
        completed: row.completed ? true : undefined,
        completedAt: row.completedAt ?? undefined,
        rewardPoints: { increment: row.rewardPoints },
      },
    })
  }
}

export async function migrateGuestDataByCode(code: string, targetUserId: string) {
  const codeHash = hashMigrationCode(code)

  return prisma.$transaction(async (tx) => {
    const migrationCode = await tx.guestMigrationCode.findUnique({
      where: { codeHash },
      include: { guestUser: true },
    })

    if (!migrationCode) {
      throw new Error('迁移码无效。')
    }
    if (migrationCode.usedAt || migrationCode.usedById) {
      throw new Error('迁移码已使用。')
    }
    if (migrationCode.expiresAt.getTime() < Date.now()) {
      throw new Error('迁移码已过期。')
    }
    if (migrationCode.guestUser.userType !== 'GUEST') {
      throw new Error('迁移码对应的数据不是匿名用户。')
    }
    if (migrationCode.guestUserId === targetUserId) {
      throw new Error('不能迁移到同一个用户。')
    }

    await mergeUserQuestion(tx, targetUserId, migrationCode.guestUserId)
    await mergeFavorites(tx, targetUserId, migrationCode.guestUserId)
    await mergeDailyPractice(tx, targetUserId, migrationCode.guestUserId)

    const guest = migrationCode.guestUser
    await tx.examResult.updateMany({
      where: { userId: guest.id },
      data: { userId: targetUserId },
    })
    await tx.pointsHistory.updateMany({
      where: { userId: guest.id },
      data: { userId: targetUserId },
    })
    await tx.checkInHistory.deleteMany({
      where: { userId: guest.id },
    })

    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
      select: {
        dailyPracticeStreak: true,
        dailyPracticeLastCompleted: true,
      },
    })

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        totalPoints: { increment: guest.totalPoints },
        dailyPracticeStreak: Math.max(
          targetUser?.dailyPracticeStreak ?? 0,
          guest.dailyPracticeStreak ?? 0,
        ),
        dailyPracticeLastCompleted:
          targetUser?.dailyPracticeLastCompleted &&
          guest.dailyPracticeLastCompleted &&
          targetUser.dailyPracticeLastCompleted > guest.dailyPracticeLastCompleted
            ? targetUser.dailyPracticeLastCompleted
            : guest.dailyPracticeLastCompleted ?? targetUser?.dailyPracticeLastCompleted ?? undefined,
        migrationPromptedAt: new Date(),
      },
    })

    await tx.guestMigrationCode.update({
      where: { id: migrationCode.id },
      data: {
        usedAt: new Date(),
        usedById: targetUserId,
      },
    })

    await tx.user.update({
      where: { id: guest.id },
      data: {
        guestMigratedAt: new Date(),
        guestKeyHash: null,
      },
    })

    return { migratedUserId: guest.id }
  })
}
