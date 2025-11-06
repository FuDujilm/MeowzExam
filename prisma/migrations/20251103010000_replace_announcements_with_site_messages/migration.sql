-- CreateEnum
CREATE TYPE "public"."SiteMessageLevel" AS ENUM ('NORMAL', 'GENERAL', 'URGENT');

-- CreateTable
CREATE TABLE "public"."site_messages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "level" "public"."SiteMessageLevel" NOT NULL DEFAULT 'NORMAL',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_message_receipts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_messages_level_idx" ON "public"."site_messages"("level");
CREATE INDEX "site_messages_publishedAt_idx" ON "public"."site_messages"("publishedAt");
CREATE UNIQUE INDEX "site_message_receipts_userId_messageId_key" ON "public"."site_message_receipts"("userId", "messageId");
CREATE INDEX "site_message_receipts_messageId_idx" ON "public"."site_message_receipts"("messageId");
CREATE INDEX "site_message_receipts_userId_idx" ON "public"."site_message_receipts"("userId");

-- AddForeignKey
ALTER TABLE "public"."site_messages" ADD CONSTRAINT "site_messages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."site_message_receipts" ADD CONSTRAINT "site_message_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."site_message_receipts" ADD CONSTRAINT "site_message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."site_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing announcements into site messages
INSERT INTO "public"."site_messages" ("id", "title", "content", "level", "publishedAt", "expiresAt", "createdAt", "updatedAt")
SELECT
  "id",
  "title",
  "content",
  CASE "type" WHEN 'URGENT' THEN 'URGENT' ELSE 'NORMAL' END::"public"."SiteMessageLevel",
  COALESCE("startDate", "createdAt"),
  "endDate",
  "createdAt",
  "updatedAt"
FROM "public"."announcements";

-- DropTable
DROP TABLE IF EXISTS "public"."announcements";

-- DropEnum
DROP TYPE IF EXISTS "public"."AnnouncementType";
