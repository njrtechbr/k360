import { LevelReward } from "../types";

export interface RewardTrackProps {
  currentXp?: number;
  showAttendantProgress?: boolean;
  levelRewards?: LevelReward[];
  maxLevel?: number;
  className?: string;
}

export interface RewardMilestoneProps {
  level: number;
  rewards: LevelReward[];
  isUnlocked: boolean;
  isSpecial?: boolean;
  className?: string;
}

export interface LevelProgressProps {
  currentLevel: number;
  currentXp: number;
  xpForNextLevel: number;
  progress: number;
  showDetails?: boolean;
  className?: string;
}
