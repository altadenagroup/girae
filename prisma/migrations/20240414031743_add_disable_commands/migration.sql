-- AlterTable
ALTER TABLE "GroupConfig" ADD COLUMN     "disabledCommands" TEXT[] DEFAULT ARRAY[]::TEXT[];
