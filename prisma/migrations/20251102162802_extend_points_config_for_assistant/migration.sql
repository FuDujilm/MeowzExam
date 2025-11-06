/*
  Warnings:

  - You are about to drop the column `assistant_cost` on the `points_config` table. All the data in the column will be lost.
  - You are about to drop the column `assistant_daily_free` on the `points_config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "points_config" DROP COLUMN "assistant_cost",
DROP COLUMN "assistant_daily_free",
ADD COLUMN     "assistantCost" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "assistantDailyFree" INTEGER NOT NULL DEFAULT 10;
