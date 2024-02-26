/*
  Warnings:

  - You are about to drop the `ProfileBadge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserProfileBadges` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserProfileBadges" DROP CONSTRAINT "UserProfileBadges_badgeId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfileBadges" DROP CONSTRAINT "UserProfileBadges_userId_fkey";

-- AlterTable
ALTER TABLE "ProfileBackground" ADD COLUMN     "userInventoryId" INTEGER;

-- AlterTable
ALTER TABLE "ProfileSticker" ADD COLUMN     "userInventoryId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasGivenRep" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasGottenDaily" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMarried" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "badgeEmojis" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "ProfileBadge";

-- DropTable
DROP TABLE "UserProfileBadges";

-- CreateTable
CREATE TABLE "MarriageRing" (
    "id" SERIAL NOT NULL,
    "price" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarriageRing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marriage" (
    "id" SERIAL NOT NULL,
    "user1Id" INTEGER NOT NULL,
    "user2Id" INTEGER NOT NULL,
    "ringId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyMarker" (
    "id" SERIAL NOT NULL,
    "richestValue" INTEGER NOT NULL,
    "poorestValue" INTEGER NOT NULL,
    "meanValue" INTEGER NOT NULL,
    "inflationRate" DOUBLE PRECISION NOT NULL,
    "deflationRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralMarker" (
    "id" SERIAL NOT NULL,
    "richestUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralMarker_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProfileBackground" ADD CONSTRAINT "ProfileBackground_userInventoryId_fkey" FOREIGN KEY ("userInventoryId") REFERENCES "UserInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSticker" ADD CONSTRAINT "ProfileSticker_userInventoryId_fkey" FOREIGN KEY ("userInventoryId") REFERENCES "UserInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_ringId_fkey" FOREIGN KEY ("ringId") REFERENCES "MarriageRing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
