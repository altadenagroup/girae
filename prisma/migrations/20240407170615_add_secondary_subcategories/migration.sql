-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "isSecondary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_SecondarySubcategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SecondarySubcategory_AB_unique" ON "_SecondarySubcategory"("A", "B");

-- CreateIndex
CREATE INDEX "_SecondarySubcategory_B_index" ON "_SecondarySubcategory"("B");

-- AddForeignKey
ALTER TABLE "_SecondarySubcategory" ADD CONSTRAINT "_SecondarySubcategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SecondarySubcategory" ADD CONSTRAINT "_SecondarySubcategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
