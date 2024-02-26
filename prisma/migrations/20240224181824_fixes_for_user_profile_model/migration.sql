/*
  Warnings:

  - You are about to drop the column `badgeId` on the `UserProfile` table. All the data in the column will be lost.
  - Made the column `favoriteColor` on table `UserProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `backgroundId` on table `UserProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_backgroundId_fkey";

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "badgeId",
ADD COLUMN     "biography" TEXT NOT NULL DEFAULT 'Eu ainda não mudei isso com /bio!',
ALTER COLUMN "favoriteColor" SET NOT NULL,
ALTER COLUMN "favoriteColor" SET DEFAULT '#01A9DB',
ALTER COLUMN "backgroundId" SET NOT NULL,
ALTER COLUMN "backgroundId" SET DEFAULT 1;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "ProfileBackground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
