-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN     "categoryId" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "ShopItem" ADD CONSTRAINT "ShopItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
