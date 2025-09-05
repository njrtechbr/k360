/*
  Warnings:

  - A unique constraint covering the columns `[attendantId,achievementId,seasonId]` on the table `UnlockedAchievement` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UnlockedAchievement_attendantId_achievementId_key";

-- AlterTable
ALTER TABLE "UnlockedAchievement" ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "XpTypeConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'general',
    "icon" TEXT NOT NULL DEFAULT 'star',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "XpTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpGrant" (
    "id" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "justification" TEXT,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpEventId" TEXT NOT NULL,

    CONSTRAINT "XpGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XpTypeConfig_name_key" ON "XpTypeConfig"("name");

-- CreateIndex
CREATE UNIQUE INDEX "XpGrant_xpEventId_key" ON "XpGrant"("xpEventId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockedAchievement_attendantId_achievementId_seasonId_key" ON "UnlockedAchievement"("attendantId", "achievementId", "seasonId");

-- AddForeignKey
ALTER TABLE "XpTypeConfig" ADD CONSTRAINT "XpTypeConfig_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpGrant" ADD CONSTRAINT "XpGrant_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "Attendant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpGrant" ADD CONSTRAINT "XpGrant_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "XpTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpGrant" ADD CONSTRAINT "XpGrant_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpGrant" ADD CONSTRAINT "XpGrant_xpEventId_fkey" FOREIGN KEY ("xpEventId") REFERENCES "XpEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedAchievement" ADD CONSTRAINT "UnlockedAchievement_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "GamificationSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
