ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "exam_question_preference" TEXT NOT NULL DEFAULT 'SYSTEM_PRESET';

UPDATE "user_settings"
  SET "exam_question_preference" = 'SYSTEM_PRESET'
  WHERE "exam_question_preference" IS NULL;
