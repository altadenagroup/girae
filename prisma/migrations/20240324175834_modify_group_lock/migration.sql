/*
  Warnings:

  - A unique constraint covering the columns `[groupId]` on the table `GroupDrawLock` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GroupDrawLock" ALTER COLUMN "groupId" SET DATA TYPE BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "GroupDrawLock_groupId_key" ON "GroupDrawLock"("groupId");
