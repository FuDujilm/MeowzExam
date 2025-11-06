-- AlterTable
ALTER TABLE "ai_model_groups"
ADD COLUMN "usage_scope" TEXT NOT NULL DEFAULT 'EXPLANATION';

-- Update existing rows to default value
UPDATE "ai_model_groups"
SET "usage_scope" = 'EXPLANATION'
WHERE "usage_scope" IS NULL;
