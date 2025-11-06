/*
  Warnings:

  - You are about to drop the column `usage_scope` on the `ai_model_groups` table. All the data in the column will be lost.
  - You are about to drop the column `exam_type` on the `user_settings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AiModelUsageScope" AS ENUM ('EXPLANATION', 'ASSISTANT', 'BOTH');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'DIFY', 'AZURE_OPENAI');

-- AlterEnum
ALTER TYPE "PointsType" ADD VALUE 'AI_REGENERATE';

-- AlterTable
ALTER TABLE "ai_model_groups" DROP COLUMN "usage_scope",
ADD COLUMN     "difyAppId" TEXT,
ADD COLUMN     "difyUser" TEXT,
ADD COLUMN     "includeOptions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeQuestion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provider" "AiProvider" NOT NULL DEFAULT 'OPENAI',
ADD COLUMN     "systemPrompt" TEXT,
ADD COLUMN     "usageScope" "AiModelUsageScope" NOT NULL DEFAULT 'EXPLANATION',
ADD COLUMN     "userPrompt" TEXT;

-- AlterTable
ALTER TABLE "explanation_votes" ADD COLUMN     "reportReason" TEXT;

-- AlterTable
ALTER TABLE "user_settings" DROP COLUMN "exam_type";
