export interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outlined" | "filled";
  showIcon?: boolean;
  className?: string;
}

export interface LevelProgressProps {
  currentLevel: number;
  currentXp: number;
  xpForNextLevel: number;
  showDetails?: boolean;
  variant?: "bar" | "circle" | "compact";
  className?: string;
}

export interface LevelInfoProps {
  level: number;
  xp: number;
  xpForNext: number;
  progress: number;
  showRewards?: boolean;
  className?: string;
}
