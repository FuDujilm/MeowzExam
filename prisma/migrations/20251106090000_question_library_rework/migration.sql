DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'QuestionLibraryVisibility'
  ) THEN
    CREATE TYPE "QuestionLibraryVisibility" AS ENUM ('ADMIN_ONLY', 'PUBLIC', 'CUSTOM');
  END IF;
END
$$;

-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'QuestionType'
  ) THEN
    CREATE TYPE "QuestionType" AS ENUM ('A_CLASS', 'B_CLASS', 'C_CLASS');
  END IF;
END
$$;

ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'GENERIC';

-- CreateTable
CREATE TABLE IF NOT EXISTS "question_libraries" (
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
CREATE TABLE IF NOT EXISTS "question_library_exam_presets" (
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

-- Rename existing camelCase columns on questions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'questions' AND column_name = 'libraryId') THEN
    EXECUTE 'ALTER TABLE "questions" RENAME COLUMN "libraryId" TO "library_id"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'questions' AND column_name = 'libraryUuid') THEN
    EXECUTE 'ALTER TABLE "questions" RENAME COLUMN "libraryUuid" TO "library_uuid"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'questions' AND column_name = 'libraryCode') THEN
    EXECUTE 'ALTER TABLE "questions" RENAME COLUMN "libraryCode" TO "library_code"';
  END IF;
END
$$;

-- Rename existing camelCase columns on exams
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exams' AND column_name = 'libraryId') THEN
    EXECUTE 'ALTER TABLE "exams" RENAME COLUMN "libraryId" TO "library_id"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exams' AND column_name = 'libraryCode') THEN
    EXECUTE 'ALTER TABLE "exams" RENAME COLUMN "libraryCode" TO "library_code"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exams' AND column_name = 'presetId') THEN
    EXECUTE 'ALTER TABLE "exams" RENAME COLUMN "presetId" TO "preset_code"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exams' AND column_name = 'presetCode') THEN
    EXECUTE 'ALTER TABLE "exams" RENAME COLUMN "presetCode" TO "preset_code"';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exam_results' AND column_name = 'libraryCode') THEN
    EXECUTE 'ALTER TABLE "exam_results" RENAME COLUMN "libraryCode" TO "library_code"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exam_results' AND column_name = 'libraryName') THEN
    EXECUTE 'ALTER TABLE "exam_results" RENAME COLUMN "libraryName" TO "library_name"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'exam_results' AND column_name = 'presetCode') THEN
    EXECUTE 'ALTER TABLE "exam_results" RENAME COLUMN "presetCode" TO "preset_code"';
  END IF;
END
$$;

-- Rename existing camelCase columns on question_library_access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'question_library_access' AND column_name = 'libraryId') THEN
    EXECUTE 'ALTER TABLE "question_library_access" RENAME COLUMN "libraryId" TO "library_id"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'question_library_access' AND column_name = 'userId') THEN
    EXECUTE 'ALTER TABLE "question_library_access" RENAME COLUMN "userId" TO "user_id"';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'question_library_access' AND column_name = 'userEmail') THEN
    EXECUTE 'ALTER TABLE "question_library_access" RENAME COLUMN "userEmail" TO "user_email"';
  END IF;
END
$$;


-- AlterTable: questions
ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "library_id" TEXT,
  ADD COLUMN IF NOT EXISTS "library_uuid" TEXT,
  ADD COLUMN IF NOT EXISTS "library_code" TEXT;

-- AlterTable: exams
ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "library_id" TEXT,
  ADD COLUMN IF NOT EXISTS "library_code" TEXT,
  ADD COLUMN IF NOT EXISTS "preset_code" TEXT;

-- AlterTable: exam_results
ALTER TABLE "exam_results"
  ADD COLUMN IF NOT EXISTS "library_code" TEXT,
  ADD COLUMN IF NOT EXISTS "library_name" TEXT,
  ADD COLUMN IF NOT EXISTS "preset_code" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_libraries_region_idx" ON "question_libraries"("region");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_libraries_visibility_idx" ON "question_libraries"("visibility");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_library_exam_presets_library_id_idx" ON "question_library_exam_presets"("library_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_library_access_library_id_idx" ON "question_library_access"("library_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "question_library_access_user_id_idx" ON "question_library_access"("user_id");

-- CreateIndex

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "question_library_access_library_id_user_id_key" ON "question_library_access"("library_id", "user_id") WHERE "user_id" IS NOT NULL;

-- CreateIndex

-- CreateIndex
CREATE INDEX IF NOT EXISTS "questions_library_id_idx" ON "questions"("library_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "questions_library_code_idx" ON "questions"("library_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "questions_library_uuid_idx" ON "questions"("library_uuid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "exams_library_id_idx" ON "exams"("library_id");

-- AddForeignKey
ALTER TABLE "question_library_exam_presets"
  ADD CONSTRAINT "question_library_exam_presets_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'question_library_access') THEN
    EXECUTE 'ALTER TABLE "question_library_access" ADD CONSTRAINT "question_library_access_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE';
    EXECUTE 'ALTER TABLE "question_library_access" ADD CONSTRAINT "question_library_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END
$$;

-- AddForeignKey
ALTER TABLE "questions"
  ADD CONSTRAINT "questions_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams"
  ADD CONSTRAINT "exams_library_id_fkey"
  FOREIGN KEY ("library_id") REFERENCES "question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
