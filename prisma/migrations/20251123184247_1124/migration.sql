/*
  Warnings:

  - You are about to drop the column `exam_question_preference` on the `user_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "exam_question_preference";
