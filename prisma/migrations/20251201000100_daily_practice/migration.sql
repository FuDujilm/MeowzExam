-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "dailyPracticeLastCompleted" TIMESTAMP(3),
ADD COLUMN     "dailyPracticeStreak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."user_settings" ADD COLUMN     "dailyPracticeTarget" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "public"."daily_practice_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "daily_practice_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_practice_records_userId_date_key" ON "public"."daily_practice_records"("userId", "date");

-- CreateIndex
CREATE INDEX "daily_practice_records_userId_date_idx" ON "public"."daily_practice_records"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."daily_practice_records" ADD CONSTRAINT "daily_practice_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type typ JOIN pg_namespace ns ON ns.oid = typ.typnamespace WHERE ns.nspname = 'public' AND typ.typname = 'PointsType') THEN
    CREATE TYPE "public"."PointsType" AS ENUM ('ANSWER_CORRECT', 'DAILY_CHECK_IN', 'STREAK_BONUS', 'ADMIN_ADJUST', 'AI_REGENERATE');
  END IF;
END $$;

ALTER TYPE "public"."PointsType" ADD VALUE IF NOT EXISTS 'DAILY_PRACTICE';
