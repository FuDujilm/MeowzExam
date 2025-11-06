-- Add AI regenerate configuration columns to points_config
ALTER TABLE "public"."points_config"
    ADD COLUMN IF NOT EXISTS "aiRegenerateDailyFree" INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS "aiRegenerateCost" INTEGER NOT NULL DEFAULT 100;
