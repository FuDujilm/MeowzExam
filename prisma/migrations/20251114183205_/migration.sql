-- Tolerant migration: align旧字段为新命名并避免缺列报错
ALTER TABLE "user_settings"
  DROP COLUMN IF EXISTS "exam_question_preference",
  ADD COLUMN IF NOT EXISTS "examQuestionPreference" TEXT NOT NULL DEFAULT 'SYSTEM_PRESET';
