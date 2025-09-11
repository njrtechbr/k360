import { Achievement, AttendantAchievement } from "../types";

export interface AchievementProps {
  achievement: Achievement;
  attendantAchievement?: AttendantAchievement;
  showProgress?: boolean;
  variant?: "card" | "badge" | "compact";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface AchievementCardProps {
  achievement: Achievement;
  attendantAchievement?: AttendantAchievement;
  showProgress?: boolean;
  showActions?: boolean;
  onUnlock?: (achievementId: string) => void;
  className?: string;
}

export interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked?: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export interface AchievementProgressProps {
  current: number;
  max: number;
  showPercentage?: boolean;
  showNumbers?: boolean;
  variant?: "bar" | "circle" | "compact";
  className?: string;
}

export interface AchievementListProps {
  achievements: Achievement[];
  attendantAchievements?: AttendantAchievement[];
  filter?: {
    category?: string;
    difficulty?: string;
    unlockedOnly?: boolean;
  };
  groupBy?: "category" | "difficulty" | "status";
  showSearch?: boolean;
  className?: string;
}
