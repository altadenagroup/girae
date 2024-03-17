/*
  Warnings:

  - You are about to drop the column `price` on the `MarriageRing` table. All the data in the column will be lost.
  - You are about to drop the column `userInventoryId` on the `ProfileBackground` table. All the data in the column will be lost.
  - You are about to drop the column `userInventoryId` on the `ProfileSticker` table. All the data in the column will be lost.
  - You are about to drop the `EconomyMarker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GeneralMarker` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('BACKGROUND', 'STICKER', 'MARRIAGE_RING', 'DRAWS');

-- DropForeignKey
ALTER TABLE "ProfileBackground" DROP CONSTRAINT "ProfileBackground_userInventoryId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileSticker" DROP CONSTRAINT "ProfileSticker_userInventoryId_fkey";

-- AlterTable
ALTER TABLE "MarriageRing" DROP COLUMN "price";

-- AlterTable
ALTER TABLE "ProfileBackground" DROP COLUMN "userInventoryId";

-- AlterTable
ALTER TABLE "ProfileSticker" DROP COLUMN "userInventoryId";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "maximumDraws" SET DEFAULT 12;

-- AlterTable
ALTER TABLE "UserInventory" ADD COLUMN     "backgroundIDs" INTEGER[],
ADD COLUMN     "ringIDs" INTEGER[],
ADD COLUMN     "stickerIDs" INTEGER[];

-- DropTable
DROP TABLE "EconomyMarker";

-- DropTable
DROP TABLE "GeneralMarker";

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" SERIAL NOT NULL,
    "type" "ItemType" NOT NULL,
    "price" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumedTrade" (
    "id" SERIAL NOT NULL,
    "user1Id" INTEGER NOT NULL,
    "user2Id" INTEGER NOT NULL,
    "cardsUser1" INTEGER[],
    "cardsUser2" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumedTrade_pkey" PRIMARY KEY ("id")
);
