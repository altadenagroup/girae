/*
  Warnings:

  - Added the required column `stripeTestProductID` to the `DonationPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DonationPlan" ADD COLUMN     "stripeTestProductID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Donator" ADD COLUMN     "cancelled" BOOLEAN NOT NULL DEFAULT false;
