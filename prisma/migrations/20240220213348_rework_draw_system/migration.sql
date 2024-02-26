/*
  Warnings:

  - You are about to drop the `Draw` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Draw" DROP CONSTRAINT "Draw_cardId_fkey";

-- DropForeignKey
ALTER TABLE "Draw" DROP CONSTRAINT "Draw_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "drawsResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "luckModifier" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "maximumDraws" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "usedDraws" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Draw";
