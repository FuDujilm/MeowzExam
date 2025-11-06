/*
  Warnings:

  - You are about to drop the column `correctAnswer` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `erratum` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `isMultipleChoice` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `mnemonic` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `questions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `questions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoryCode` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correctAnswers` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `difficulty` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalId` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionType` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uuid` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `questions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."ModelType" AS ENUM ('CHAT', 'IMAGE', 'EMBEDDING');

-- CreateEnum
CREATE TYPE "public"."PointsType" AS ENUM ('ANSWER_CORRECT', 'DAILY_CHECK_IN', 'STREAK_BONUS', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "public"."ExplanationType" AS ENUM ('OFFICIAL', 'USER', 'AI');

-- CreateEnum
CREATE TYPE "public"."ExplanationStatus" AS ENUM ('UNDER_REVIEW', 'PUBLISHED', 'RETRACTED');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('UP', 'DOWN', 'REPORT');

-- CreateEnum
CREATE TYPE "public"."AiJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."questions" DROP COLUMN "correctAnswer",
DROP COLUMN "erratum",
DROP COLUMN "isMultipleChoice",
DROP COLUMN "mnemonic",
DROP COLUMN "question",
ADD COLUMN     "categoryCode" TEXT NOT NULL,
ADD COLUMN     "correctAnswers" JSONB NOT NULL,
ADD COLUMN     "difficulty" TEXT NOT NULL,
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "hasImage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imagePath" TEXT,
ADD COLUMN     "originalAnswer" TEXT,
ADD COLUMN     "pageSection" TEXT,
ADD COLUMN     "questionType" TEXT NOT NULL,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "subSection" TEXT,
ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL,
ALTER COLUMN "category" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckIn" TIMESTAMP(3),
ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."favorite_questions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."points_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "type" "public"."PointsType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."check_in_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."points_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pointsName" TEXT NOT NULL DEFAULT '积分',
    "answerCorrect" INTEGER NOT NULL DEFAULT 10,
    "dailyCheckIn" INTEGER NOT NULL DEFAULT 50,
    "streak3Days" INTEGER NOT NULL DEFAULT 100,
    "streak7Days" INTEGER NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_model_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelType" "public"."ModelType" NOT NULL,
    "proxyUrl" TEXT,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "enableVision" BOOLEAN NOT NULL DEFAULT false,
    "temperature" DOUBLE PRECISION DEFAULT 1.0,
    "topP" DOUBLE PRECISION DEFAULT 1.0,
    "presencePenalty" DOUBLE PRECISION DEFAULT 0,
    "frequencyPenalty" DOUBLE PRECISION DEFAULT 0,
    "extraBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."explanations" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "type" "public"."ExplanationType" NOT NULL DEFAULT 'AI',
    "contentJson" JSONB NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'zh-CN',
    "sourcesHash" TEXT,
    "templateVer" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "public"."ExplanationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "wilsonScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."explanation_votes" (
    "id" TEXT NOT NULL,
    "explanationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" "public"."VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explanation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_jobs" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'zh-CN',
    "status" "public"."AiJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'openai-compatible',
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "costUSD" DOUBLE PRECISION,
    "tokens" JSONB,
    "error" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "questionId" TEXT,
    "costUSD" DOUBLE PRECISION,
    "tokens" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favorite_questions_userId_questionId_key" ON "public"."favorite_questions"("userId", "questionId");

-- CreateIndex
CREATE INDEX "points_history_userId_idx" ON "public"."points_history"("userId");

-- CreateIndex
CREATE INDEX "points_history_createdAt_idx" ON "public"."points_history"("createdAt");

-- CreateIndex
CREATE INDEX "check_in_history_userId_idx" ON "public"."check_in_history"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_history_userId_date_key" ON "public"."check_in_history"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "points_config_key_key" ON "public"."points_config"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_groups_name_key" ON "public"."ai_model_groups"("name");

-- CreateIndex
CREATE INDEX "explanations_questionId_idx" ON "public"."explanations"("questionId");

-- CreateIndex
CREATE INDEX "explanations_type_idx" ON "public"."explanations"("type");

-- CreateIndex
CREATE INDEX "explanations_status_idx" ON "public"."explanations"("status");

-- CreateIndex
CREATE INDEX "explanations_wilsonScore_idx" ON "public"."explanations"("wilsonScore");

-- CreateIndex
CREATE INDEX "explanation_votes_explanationId_idx" ON "public"."explanation_votes"("explanationId");

-- CreateIndex
CREATE INDEX "explanation_votes_userId_idx" ON "public"."explanation_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "explanation_votes_explanationId_userId_key" ON "public"."explanation_votes"("explanationId", "userId");

-- CreateIndex
CREATE INDEX "ai_jobs_questionId_idx" ON "public"."ai_jobs"("questionId");

-- CreateIndex
CREATE INDEX "ai_jobs_status_idx" ON "public"."ai_jobs"("status");

-- CreateIndex
CREATE INDEX "ai_jobs_createdAt_idx" ON "public"."ai_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_userId_idx" ON "public"."ai_usage_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "public"."ai_usage_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "questions_uuid_key" ON "public"."questions"("uuid");

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "public"."questions"("type");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "public"."questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_categoryCode_idx" ON "public"."questions"("categoryCode");

-- AddForeignKey
ALTER TABLE "public"."favorite_questions" ADD CONSTRAINT "favorite_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_questions" ADD CONSTRAINT "favorite_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."points_history" ADD CONSTRAINT "points_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."check_in_history" ADD CONSTRAINT "check_in_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."explanations" ADD CONSTRAINT "explanations_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."explanations" ADD CONSTRAINT "explanations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."explanation_votes" ADD CONSTRAINT "explanation_votes_explanationId_fkey" FOREIGN KEY ("explanationId") REFERENCES "public"."explanations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."explanation_votes" ADD CONSTRAINT "explanation_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
