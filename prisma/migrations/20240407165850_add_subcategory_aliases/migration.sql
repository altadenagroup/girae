-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
