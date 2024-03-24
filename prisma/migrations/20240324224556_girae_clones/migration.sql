-- CreateTable
CREATE TABLE "AlternativeVersion" (
    "id" SERIAL NOT NULL,
    "telegramToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlternativeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlternativeVersion_telegramToken_key" ON "AlternativeVersion"("telegramToken");
