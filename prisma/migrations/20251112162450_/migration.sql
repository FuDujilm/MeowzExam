/*
  Warnings:

  - The values [AI_ASSISTANT] on the enum `PointsType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `libraryId` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `library_code` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `library_name` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `presetId` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `preset_code` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `library_code` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `library_id` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `preset_code` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `assistantCost` on the `points_config` table. All the data in the column will be lost.
  - You are about to drop the column `assistantDailyFree` on the `points_config` table. All the data in the column will be lost.
  - You are about to drop the column `multipleQuestions` on the `question_libraries` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `question_libraries` table. All the data in the column will be lost.
  - You are about to drop the column `singleQuestions` on the `question_libraries` table. All the data in the column will be lost.
  - You are about to drop the column `trueFalseQuestions` on the `question_libraries` table. All the data in the column will be lost.
  - You are about to drop the column `library_id` on the `question_library_access` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `question_library_access` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `duration_minutes` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `library_id` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `multiple_choice_count` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `pass_score` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `single_choice_count` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `total_questions` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `true_false_count` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `question_library_exam_presets` table. All the data in the column will be lost.
  - You are about to drop the column `library_code` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `library_id` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `library_uuid` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `aiStyleCustom` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `aiStylePresetId` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `examType` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `aiQuotaLimit` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `aiQuotaUsed` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `loginDisabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `manualExplanationDisabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `ai_style_presets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_presets` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[libraryId,userId]` on the table `question_library_access` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[libraryId,userEmail]` on the table `question_library_access` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[libraryId,code]` on the table `question_library_exam_presets` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `exams` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `libraryId` to the `question_library_access` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMinutes` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `libraryId` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `multipleChoiceCount` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passScore` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `singleChoiceCount` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuestions` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `question_library_exam_presets` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `questions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PointsType_new" AS ENUM ('ANSWER_CORRECT', 'DAILY_CHECK_IN', 'STREAK_BONUS', 'ADMIN_ADJUST', 'AI_REGENERATE');
ALTER TABLE "points_history" ALTER COLUMN "type" TYPE "PointsType_new" USING ("type"::text::"PointsType_new");
ALTER TYPE "PointsType" RENAME TO "PointsType_old";
ALTER TYPE "PointsType_new" RENAME TO "PointsType";
DROP TYPE "public"."PointsType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."exam_presets" DROP CONSTRAINT "exam_presets_libraryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_results" DROP CONSTRAINT "exam_results_libraryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exam_results" DROP CONSTRAINT "exam_results_presetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exams" DROP CONSTRAINT "exams_libraryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."exams" DROP CONSTRAINT "exams_library_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."exams" DROP CONSTRAINT "exams_presetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."question_library_access" DROP CONSTRAINT "question_library_access_libraryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."question_library_access" DROP CONSTRAINT "question_library_access_library_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."question_library_access" DROP CONSTRAINT "question_library_access_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."question_library_access" DROP CONSTRAINT "question_library_access_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."question_library_exam_presets" DROP CONSTRAINT "question_library_exam_presets_library_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."questions" DROP CONSTRAINT "questions_libraryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."questions" DROP CONSTRAINT "questions_library_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_settings" DROP CONSTRAINT "user_settings_aiStylePresetId_fkey";

-- DropIndex
DROP INDEX "public"."exam_results_libraryId_idx";

-- DropIndex
DROP INDEX "public"."exam_results_presetId_idx";

-- DropIndex
DROP INDEX "public"."exams_libraryId_idx";

-- DropIndex
DROP INDEX "public"."exams_library_id_idx";

-- DropIndex
DROP INDEX "public"."exams_presetId_idx";

-- DropIndex
DROP INDEX "public"."question_library_access_libraryId_userId_key";

-- DropIndex
DROP INDEX "public"."question_library_access_library_id_idx";

-- DropIndex
DROP INDEX "public"."question_library_access_user_id_idx";

-- DropConstraint
ALTER TABLE "public"."question_library_exam_presets" DROP CONSTRAINT "question_library_exam_presets_library_id_code_key";

-- DropIndex
DROP INDEX "public"."question_library_exam_presets_library_id_idx";

-- DropIndex
DROP INDEX "public"."questions_libraryId_idx";

-- DropIndex
DROP INDEX "public"."questions_library_code_idx";

-- DropIndex
DROP INDEX "public"."questions_library_id_idx";

-- DropIndex
DROP INDEX "public"."questions_library_uuid_idx";

-- AlterTable
ALTER TABLE "exam_results" DROP COLUMN "libraryId",
DROP COLUMN "library_code",
DROP COLUMN "library_name",
DROP COLUMN "presetId",
DROP COLUMN "preset_code",
ADD COLUMN     "libraryCode" TEXT,
ADD COLUMN     "libraryName" TEXT,
ADD COLUMN     "presetCode" TEXT;

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "library_code",
DROP COLUMN "library_id",
DROP COLUMN "preset_code",
ADD COLUMN     "libraryCode" TEXT,
ADD COLUMN     "libraryId" TEXT,
ADD COLUMN     "presetCode" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "QuestionType" NOT NULL;

-- AlterTable
ALTER TABLE "points_config" DROP COLUMN "assistantCost",
DROP COLUMN "assistantDailyFree";

-- AlterTable
ALTER TABLE "question_libraries" DROP COLUMN "multipleQuestions",
DROP COLUMN "publishedAt",
DROP COLUMN "singleQuestions",
DROP COLUMN "trueFalseQuestions",
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "multipleChoiceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "singleChoiceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trueFalseCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "displayTemplate" DROP NOT NULL,
ALTER COLUMN "displayTemplate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "question_library_access" DROP COLUMN "library_id",
DROP COLUMN "user_id",
ADD COLUMN     "libraryId" TEXT NOT NULL,
ADD COLUMN     "userEmail" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "question_library_exam_presets" DROP COLUMN "created_at",
DROP COLUMN "duration_minutes",
DROP COLUMN "library_id",
DROP COLUMN "multiple_choice_count",
DROP COLUMN "pass_score",
DROP COLUMN "single_choice_count",
DROP COLUMN "total_questions",
DROP COLUMN "true_false_count",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "libraryId" TEXT NOT NULL,
ADD COLUMN     "multipleChoiceCount" INTEGER NOT NULL,
ADD COLUMN     "passScore" INTEGER NOT NULL,
ADD COLUMN     "singleChoiceCount" INTEGER NOT NULL,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL,
ADD COLUMN     "trueFalseCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "library_code",
DROP COLUMN "library_id",
DROP COLUMN "library_uuid",
ADD COLUMN     "libraryCode" TEXT,
ADD COLUMN     "libraryId" TEXT,
ADD COLUMN     "libraryUuid" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "QuestionType" NOT NULL;

-- AlterTable
ALTER TABLE "user_settings" DROP COLUMN "aiStyleCustom",
DROP COLUMN "aiStylePresetId",
DROP COLUMN "examType";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "aiQuotaLimit",
DROP COLUMN "aiQuotaUsed",
DROP COLUMN "loginDisabled",
DROP COLUMN "manualExplanationDisabled";

-- DropTable
DROP TABLE "public"."ai_style_presets";

-- DropTable
DROP TABLE "public"."exam_presets";

-- CreateIndex
CREATE INDEX "question_library_access_libraryId_idx" ON "question_library_access"("libraryId");

-- CreateIndex
CREATE INDEX "question_library_access_userId_idx" ON "question_library_access"("userId");

-- CreateIndex
CREATE INDEX "question_library_access_userEmail_idx" ON "question_library_access"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "question_library_access_libraryId_userId_key" ON "question_library_access"("libraryId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "question_library_access_libraryId_userEmail_key" ON "question_library_access"("libraryId", "userEmail");

-- CreateIndex
CREATE INDEX "question_library_exam_presets_libraryId_idx" ON "question_library_exam_presets"("libraryId");

-- CreateIndex
CREATE UNIQUE INDEX "question_library_exam_presets_libraryId_code_key" ON "question_library_exam_presets"("libraryId", "code");

-- CreateIndex
CREATE INDEX "questions_type_idx" ON "questions"("type");

-- CreateIndex
CREATE INDEX "questions_libraryId_idx" ON "questions"("libraryId");

-- CreateIndex
CREATE INDEX "questions_libraryCode_idx" ON "questions"("libraryCode");

-- CreateIndex
CREATE INDEX "questions_libraryUuid_idx" ON "questions"("libraryUuid");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_library_exam_presets" ADD CONSTRAINT "question_library_exam_presets_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_library_access" ADD CONSTRAINT "question_library_access_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_library_access" ADD CONSTRAINT "question_library_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
