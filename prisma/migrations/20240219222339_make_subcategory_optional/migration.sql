-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_subcategoryId_fkey";

-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "subcategoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
