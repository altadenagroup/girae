/*
  Warnings:

  - Added the required column `description` to the `ShopItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ShopItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "GroupDrawLock" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "allowedCategories" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupDrawLock_pkey" PRIMARY KEY ("id")
);
