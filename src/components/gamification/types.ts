import { LucideIcon } from 'lucide-react';

// Base types
export interface Season {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  xpReward: number;
  icon?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendantAchievement {
  id: string;
  attendantId: string;
  achievementId: string;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
  createdAt: string;
  updatedAt: string;
  achievement?: Achievement;
}

export interface LevelReward {
  id: string;
  level: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  active: boolean;
}

export interface XPEvent {
  id: string;
  attendantId: string;
  amount: number;
  reason: string;
  seasonId?: string;
  achievementId?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  attendantId: string;
  attendantName: string;
  department?: string;
  totalXp: number;
  level: number;
  achievementCount: number;
  position: number;
}

export interface GamificationStats {
  totalXp: number;
  currentLevel: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  leaderboardPosition?: number;
  departmentPosition?: number;
}