import { LeaderboardEntry } from "../types";

export interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentAttendantId?: string;
  showDepartment?: boolean;
  showAchievements?: boolean;
  limit?: number;
  variant?: "full" | "compact" | "mini";
  className?: string;
}

export interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  title?: string;
  currentAttendantId?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export interface LeaderboardEntryProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
  showDepartment?: boolean;
  showAchievements?: boolean;
  variant?: "full" | "compact";
  className?: string;
}

export interface LeaderboardFilters {
  seasonId?: string;
  department?: string;
  period?: "current" | "previous" | "all";
  limit?: number;
}
