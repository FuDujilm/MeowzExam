-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aiQuotaLimit" INTEGER,
ADD COLUMN     "aiQuotaUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loginDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualExplanationDisabled" BOOLEAN NOT NULL DEFAULT false;
