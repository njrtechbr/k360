/**
 * Tipos locais para Dashboard - Substituem imports do Prisma
 * Mantém compatibilidade com código existente
 */

// === ESTATÍSTICAS GERAIS ===

export interface DashboardStats {
  totalEvaluations: number;
  totalAttendants: number;
  averageRating: number;
  totalXp: number;
  activeSeasons: number;
  unlockedAchievements: number;
}

export interface EvaluationTrend {
  date: string;
  count: number;
  averageRating: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface TopPerformers {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  evaluationCount: number;
  averageRating: number;
  position: number;
}

// === MÉTRICAS DE GAMIFICAÇÃO ===

export interface GamificationOverview {
  totalXpDistributed: number;
  activeAchievements: number;
  totalUnlocked: number;
  topAchievement: {
    id: string;
    title: string;
    unlockedCount: number;
  } | null;
}

export interface MonthlyStats {
  month: string;
  evaluations: number;
  averageRating: number;
  xpGenerated: number;
}

export interface PopularAchievement {
  achievementId: string;
  title: string;
  description: string;
  unlockedCount: number;
  icon: string;
  color: string;
}

export interface RecentActivity {
  id: string;
  type:
    | "evaluation"
    | "achievement"
    | "xp_event"
    | "attendant_added"
    | "season_started";
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  attendant?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    rating?: number;
    xp?: number;
    achievement?: string;
  };
}

// === MÉTRICAS EM TEMPO REAL ===

export interface DashboardMetrics {
  gamification: GamificationMetrics;
  satisfaction: SatisfactionMetrics;
  alerts: AlertMetrics;
  lastUpdated: Date;
}

export interface GamificationMetrics {
  totalXp: number;
  activeUsers: number;
  topRanking: TopRankingItem[];
  recentAchievements: RecentAchievement[];
  xpTrend: XpTrendItem[];
}

export interface TopRankingItem {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  position: number;
  evaluationCount: number;
  averageRating: number;
}

export interface RecentAchievement {
  id: string;
  attendantName: string;
  achievementTitle: string;
  unlockedAt: Date;
  xpGained: number;
}

export interface XpTrendItem {
  date: string;
  totalXp: number;
  newXp: number;
}

export interface SatisfactionMetrics {
  averageRating: number;
  averageRating24h: number;
  totalEvaluations: EvaluationCounts;
  ratingDistribution: RatingDistribution;
  lowRatingAlerts: number;
  trend: SatisfactionTrendItem[];
}

export interface EvaluationCounts {
  today: number;
  week: number;
  month: number;
}

export interface SatisfactionTrendItem {
  date: string;
  averageRating: number;
  evaluationCount: number;
}

export interface AlertMetrics {
  lowSatisfactionAlerts: number;
  inactiveUsers: number;
  systemAlerts: SystemAlert[];
  lastUpdated: Date;
}

export interface SystemAlert {
  id: string;
  type: "low_satisfaction" | "inactive_user" | "system_error";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: Date;
  resolved: boolean;
}

// === TIPOS DE CONFIGURAÇÃO ===

export interface RealtimeOptions {
  satisfactionPeriod?: "24h" | "7d" | "30d";
  alertThresholds?: {
    lowSatisfactionThreshold: number;
    inactivityHours: number;
  };
}

export interface AlertThresholds {
  lowSatisfactionThreshold: number;
  inactivityHours: number;
}

// Tipos para configuração do dashboard
export interface DashboardConfig {
  userId: string;
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    enabled: boolean;
    config: Record<string, any>;
  }>;
  refreshInterval: number; // segundos
  alertThresholds: {
    lowSatisfactionThreshold: number;
    inactivityHours: number;
  };
}

// Tipos para widgets individuais
export interface WidgetProps {
  id: string;
  title: string;
  data: any;
  isLoading: boolean;
  error?: string;
  refreshInterval?: number;
}

// Tipos para atualizações em tempo real via WebSocket
export interface DashboardUpdate {
  type: "evaluation" | "xp" | "achievement" | "full_refresh";
  data: any;
  timestamp: Date;
}

// Tipos para métricas de usuários ativos
export interface ActiveUserMetrics {
  count: number;
  users: Array<{
    attendantId: string;
    name: string;
    lastActivity: Date;
    currentXp: number;
  }>;
}

// Tipos para eventos WebSocket
export interface WebSocketMessage {
  type: "connect" | "disconnect" | "update" | "error";
  payload?: any;
  timestamp: Date;
}

// Tipos para status de conexão
export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}
