/*
  Warnings:

  - You are about to drop the column `achievementsJson` on the `GamificationConfig` table. All the data in the column will be lost.
  - You are about to drop the column `levelRewardsJson` on the `GamificationConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GamificationConfig" DROP COLUMN "achievementsJson",
DROP COLUMN "levelRewardsJson",
ADD COLUMN     "seasons" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "XpEvent" ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "AchievementConfig" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelTrackConfig" (
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelTrackConfig_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "UnlockedAchievement" (
    "id" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpGained" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "UnlockedAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnlockedAchievement_attendantId_achievementId_key" ON "UnlockedAchievement"("attendantId", "achievementId");

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "GamificationSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockedAchievement" ADD CONSTRAINT "UnlockedAchievement_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "Attendant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
