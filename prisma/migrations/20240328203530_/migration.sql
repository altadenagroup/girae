/*
  Warnings:

  - You are about to drop the `AlternativeVersion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `ShopItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "rarityModifier" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "AlternativeVersion";
