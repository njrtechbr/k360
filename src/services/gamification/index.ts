// Serviços de gamificação modularizados
export { XpService } from './xp.service';
export { AchievementsService } from './achievements.service';
export { SeasonsService } from './seasons.service';
export { LeaderboardService } from './leaderboard.service';
export { LevelsService } from './levels.service';
export { ConfigService } from './config.service';

// Tipos e interfaces
export type {
  LeaderboardEntry,
  LeaderboardFilters,
  LeaderboardStats
} from './leaderboard.service';

export type {
  LevelInfo,
  LevelProgress
} from './levels.service';

export type {
  GamificationSettings,
  ConfigValidationResult
} from './config.service';

// Re-exportar tipos principais para conveniência
export type {
  GamificationConfig,
  AchievementConfig,
  LevelTrackConfig,
  Achievement,
  LevelReward,
  GamificationSeason,
  XpEvent,
  UnlockedAchievement
} from '@/lib/types';