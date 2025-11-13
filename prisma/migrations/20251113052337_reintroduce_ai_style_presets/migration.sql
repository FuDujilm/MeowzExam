-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "aiStyleCustom" TEXT,
ADD COLUMN     "aiStylePresetId" TEXT;

-- CreateTable
CREATE TABLE "ai_style_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_style_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_style_presets_name_key" ON "ai_style_presets"("name");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_aiStylePresetId_fkey" FOREIGN KEY ("aiStylePresetId") REFERENCES "ai_style_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
