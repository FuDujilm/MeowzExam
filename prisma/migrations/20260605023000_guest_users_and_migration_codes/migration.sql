-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('REGISTERED', 'GUEST');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "userType" "UserType" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN "guestKeyHash" TEXT,
ADD COLUMN "guestLastSeenAt" TIMESTAMP(3),
ADD COLUMN "guestMigratedAt" TIMESTAMP(3),
ADD COLUMN "migrationPromptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "guest_migration_codes" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "guestUserId" TEXT NOT NULL,
    "usedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_migration_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_guestKeyHash_key" ON "users"("guestKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "guest_migration_codes_codeHash_key" ON "guest_migration_codes"("codeHash");

-- CreateIndex
CREATE INDEX "guest_migration_codes_guestUserId_idx" ON "guest_migration_codes"("guestUserId");

-- CreateIndex
CREATE INDEX "guest_migration_codes_usedById_idx" ON "guest_migration_codes"("usedById");

-- CreateIndex
CREATE INDEX "guest_migration_codes_expiresAt_idx" ON "guest_migration_codes"("expiresAt");

-- AddForeignKey
ALTER TABLE "guest_migration_codes" ADD CONSTRAINT "guest_migration_codes_guestUserId_fkey" FOREIGN KEY ("guestUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_migration_codes" ADD CONSTRAINT "guest_migration_codes_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
