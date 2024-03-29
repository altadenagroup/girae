/*
  Warnings:

  - You are about to drop the column `category` on the `ShopItem` table. All the data in the column will be lost.
  - Added the required column `image` to the `ShopItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShopItem" DROP COLUMN "category",
ADD COLUMN     "image" TEXT NOT NULL;
