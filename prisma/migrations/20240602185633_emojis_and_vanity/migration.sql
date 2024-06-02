-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "favoriteCardColor" TEXT,
ADD COLUMN     "hideCardEmojis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideProfileEmojis" BOOLEAN NOT NULL DEFAULT false;
