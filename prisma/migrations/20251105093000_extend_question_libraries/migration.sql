-- CreateEnum
CREATE TYPE "public"."QuestionLibraryVisibility" AS ENUM ('ADMIN_ONLY', 'PUBLIC', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."question_libraries" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "sourceType" TEXT,
    "region" TEXT,
    "version" TEXT,
    "publishedAt" TIMESTAMP(3),
    "displayTemplate" TEXT NOT NULL DEFAULT '{region}-{shortName}-{totalQuestions}题',
    "visibility" "public"."QuestionLibraryVisibility" NOT NULL DEFAULT 'ADMIN_ONLY',
    "metadata" JSONB,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "singleQuestions" INTEGER NOT NULL DEFAULT 0,
    "multipleQuestions" INTEGER NOT NULL DEFAULT 0,
    "trueFalseQuestions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_libraries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."question_library_access" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_library_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_presets" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "passScore" INTEGER NOT NULL,
    "singleChoiceCount" INTEGER NOT NULL,
    "multipleChoiceCount" INTEGER NOT NULL,
    "trueFalseCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_presets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN "libraryId" TEXT;
ALTER TABLE "public"."questions" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- AlterTable
ALTER TABLE "public"."exams" ADD COLUMN "libraryId" TEXT;
ALTER TABLE "public"."exams" ADD COLUMN "presetId" TEXT;
ALTER TABLE "public"."exams" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- AlterTable
ALTER TABLE "public"."exam_results" ADD COLUMN "libraryId" TEXT;
ALTER TABLE "public"."exam_results" ADD COLUMN "presetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "question_libraries_uuid_key" ON "public"."question_libraries"("uuid");
CREATE UNIQUE INDEX "question_libraries_code_key" ON "public"."question_libraries"("code");
CREATE INDEX "question_libraries_region_idx" ON "public"."question_libraries"("region");
CREATE INDEX "question_libraries_visibility_idx" ON "public"."question_libraries"("visibility");
CREATE UNIQUE INDEX "question_library_access_libraryId_userId_key" ON "public"."question_library_access"("libraryId", "userId");
CREATE UNIQUE INDEX "exam_presets_libraryId_code_key" ON "public"."exam_presets"("libraryId", "code");
CREATE INDEX "questions_libraryId_idx" ON "public"."questions"("libraryId");
CREATE INDEX "exams_libraryId_idx" ON "public"."exams"("libraryId");
CREATE INDEX "exams_presetId_idx" ON "public"."exams"("presetId");
CREATE INDEX "exam_results_libraryId_idx" ON "public"."exam_results"("libraryId");
CREATE INDEX "exam_results_presetId_idx" ON "public"."exam_results"("presetId");

-- AddForeignKey
ALTER TABLE "public"."question_library_access" ADD CONSTRAINT "question_library_access_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."question_library_access" ADD CONSTRAINT "question_library_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."exam_presets" ADD CONSTRAINT "exam_presets_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."question_libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."exams" ADD CONSTRAINT "exams_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "public"."exam_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."exam_results" ADD CONSTRAINT "exam_results_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."question_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."exam_results" ADD CONSTRAINT "exam_results_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "public"."exam_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropEnum
DROP TYPE "public"."QuestionType";
