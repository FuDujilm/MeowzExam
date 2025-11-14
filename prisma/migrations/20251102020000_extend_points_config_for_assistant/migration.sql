-- AlterTable
ALTER TABLE "points_config"
    ADD COLUMN IF NOT EXISTS "assistant_daily_free" INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS "assistant_cost" INTEGER NOT NULL DEFAULT 50;

-- Ensure new enum value exists
ALTER TYPE "PointsType" ADD VALUE IF NOT EXISTS 'AI_ASSISTANT';
