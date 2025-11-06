-- Add admin control fields to users
ALTER TABLE "users"
  ADD COLUMN "aiQuotaLimit" INTEGER,
  ADD COLUMN "aiQuotaUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loginDisabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "manualExplanationDisabled" BOOLEAN NOT NULL DEFAULT FALSE;
