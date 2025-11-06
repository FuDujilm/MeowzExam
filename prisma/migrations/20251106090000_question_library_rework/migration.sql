-- CreateEnum
CREATE TYPE "QuestionLibraryVisibility" AS ENUM ('ADMIN_ONLY', 'PUBLIC', 'CUSTOM');

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'GENERIC';

-- CreateTable
CREATE TABLE "question_libraries" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "date" TIMESTAMP(3),
    "source_type" TEXT,
    "region" TEXT,
    "version" TEXT,
    "display_template" TEXT,
    "metadata" JSONB,
    "visibility" "QuestionLibraryVisibility" NOT NULL DEFAULT 'ADMIN_ONLY',
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "single_choice_count" INTEGER NOT NULL DEFAULT 0,
    "multiple_choice_count" INTEGER NOT NULL DEFAULT 0,
    "true_false_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_libraries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "question_libraries_uuid_key" UNIQUE ("uuid"),
    CONSTRAINT "question_libraries_code_key" UNIQUE ("code")
);

-- CreateTable
CREATE TABLE "question_library_exam_presets" (
    "id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "pass_score" INTEGER NOT NULL,
    "single_choice_count" INTEGER NOT NULL,
    "multiple_choice_count" INTEGER NOT NULL,
    "true_false_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_library_exam_presets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "question_library_exam_presets_library_id_code_key" UNIQUE ("library_id", "code")
);

-- CreateTable
CREATE TABLE "question_library_access" (
    "id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_library_access_pkey" PRIMARY KEY ("id")
);

-- AlterTable: questions
ALTER TABLE "questions"
  ADD COLUMN "library_id" TEXT,
  ADD COLUMN "library_uuid" TEXT,
  ADD COLUMN "library_code" TEXT;

-- AlterTable: exams
ALTER TABLE "exams"
  ADD COLUMN "library_id" TEXT,
  ADD COLUMN "library_code" TEXT,
  ADD COLUMN "preset_code" TEXT;

-- AlterTable: exam_results
ALTER TABLE "exam_results"
  ADD COLUMN "library_code" TEXT,
  ADD COLUMN "library_name" TEXT,
  ADD COLUMN "preset_code" TEXT;

-- CreateIndex
CREATE INDEX "question_libraries_region_idx" ON "question_libraries"("region");

-- CreateIndex
CREATE INDEX "question_libraries_visibility_idx" ON "question_libraries"("visibility");

-- CreateIndex
CREATE INDEX "question_library_exam_presets_library_id_idx" ON "question_library_exam_presets"("library_id");

-- CreateIndex
CREATE INDEX "question_library_access_library_id_idx" ON "question_library_access"("library_id");

-- CreateIndex
CREATE INDEX "question_library_access_user_id_idx" ON "question_library_access"("user_id");

-- CreateIndex
CREATE INDEX "question_library_access_user_email_idx" ON "question_library_access"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "question_library_access_library_id_user_id_key" ON "question_library_access"("library_id", "user_id") WHERE "user_id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "question_library_access_library_id_user_email_key" ON "question_library_access"("library_id", "user_email") WHERE "user_email" IS NOT NULL;

-- CreateIndex
CREATE INDEX "questions_library_id_idx" ON "questions"("library_id");

-- CreateIndex
CREATE INDEX "questions_library_code_idx" ON "questions"("library_code");

-- CreateIndex
CREATE INDEX "questions_library_uuid_idx" ON "questions"("library_uuid");

-- CreateIndex
CREATE INDEX "exams_library_id_idx" ON "exams"("library_id");

-- AddForeignKey
ALTER TABLE "question_library_exam_presets"
  ADD CONSTRAINT "question_library_exam_presets_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_library_access"
  ADD CONSTRAINT "question_library_access_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_library_access"
  ADD CONSTRAINT "question_library_access_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions"
  ADD CONSTRAINT "questions_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams"
  ADD CONSTRAINT "exams_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
