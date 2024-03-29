/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserInventory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_key" ON "UserInventory"("userId");
