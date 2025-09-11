/**
 * Tipos locais para Achievements - Substituem imports do Prisma
 * Mantém compatibilidade com código existente
 */

// === CONFIGURAÇÃO DE CONQUISTAS ===

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  xp: number;
  active: boolean;
  criteria: any; // JSON object with achievement criteria
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementCriteria {
  type:
    | "evaluation_count"
    | "rating_average"
    | "xp_total"
    | "streak"
    | "custom";
  value: number;
  period?: "season" | "month" | "week" | "all_time";
  conditions?: Record<string, any>;
}

// === CONQUISTAS DESBLOQUEADAS ===

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  attendantId: string;
  seasonId: string;
  unlockedAt: Date;
  xpGained: number;
  achievement?: AchievementConfig;
  attendant?: {
    id: string;
    name: string;
  };
  season?: {
    id: string;
    name: string;
  };
}

// === PROCESSAMENTO DE CONQUISTAS ===

export interface ProcessResult {
  attendantsProcessed: number;
  achievementsUnlocked: number;
  xpAwarded: number;
  errors: string[];
  details?: {
    attendantId: string;
    newAchievements: string[];
    totalXp: number;
  }[];
}

// === ESTATÍSTICAS DE CONQUISTAS ===

export interface AchievementStats {
  totalAchievements: number;
  activeAchievements: number;
  totalUnlocked: number;
  averageUnlocksPerAttendant: number;
  topAchievement?: {
    id: string;
    title: string;
    unlockedCount: number;
  };
}

export interface PopularAchievement {
  id: string;
  title: string;
  description: string;
  unlockedCount: number;
  percentage: number;
  xp: number;
}

// === PROGRESSO DE CONQUISTAS ===

export interface AchievementProgress {
  progress: number;
  target: number;
  percentage: number;
}

// === TIPOS DE ENTRADA PARA VALIDAÇÃO ===

export interface ProcessAttendantData {
  attendantId: string;
}

export interface ProcessSeasonData {
  seasonId: string;
}

export interface CheckCriteriaData {
  attendantId: string;
  achievementId: string;
}

export interface GetUnlockedData {
  attendantId: string;
  seasonId?: string;
  includeDetails?: boolean;
}

export interface GetStatsData {
  seasonId?: string;
  attendantId?: string;
}

export interface GetPopularData {
  limit?: number;
  seasonId?: string;
}

// === TIPOS PARA RESPOSTAS DE API ===

export interface ProcessAttendantResponse {
  newUnlocks: number;
}

export interface CheckCriteriaResponse {
  meetscriteria: boolean;
}

// === TIPOS AUXILIARES ===

export interface RecentUnlockedParams {
  limit?: number;
}

export interface AchievementProgressParams {
  attendantId: string;
  achievementId: string;
}
