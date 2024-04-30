-- CreateTable
CREATE TABLE "DonationPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stripeProductID" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "maximumCardDonations" INTEGER NOT NULL,
    "userLuckIncrease" DOUBLE PRECISION NOT NULL,
    "maximumDraws" INTEGER NOT NULL,
    "changeInDrawCount" INTEGER NOT NULL,
    "storeDiscount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donator" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donator_user_index" ON "Donator"("userId");

-- AddForeignKey
ALTER TABLE "Donator" ADD CONSTRAINT "Donator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donator" ADD CONSTRAINT "Donator_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DonationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
