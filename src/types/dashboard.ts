// Tipos para métricas de gamificação
export interface GamificationMetrics {
  totalXp: number;
  activeUsers: number;
  topRanking: Array<{
    attendantId: string;
    name: string;
    totalXp: number;
    position: number;
    avatarUrl?: string;
  }>;
  recentAchievements: Array<{
    id: string;
    title: string;
    attendantName: string;
    unlockedAt: Date;
    icon: string;
    color: string;
  }>;
  xpTrend: Array<{
    date: Date;
    totalXp: number;
  }>;
}

// Tipos para métricas de satisfação
export interface SatisfactionMetrics {
  averageRating: number;
  averageRating24h: number;
  totalEvaluations: {
    today: number;
    week: number;
    month: number;
  };
  ratingDistribution: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };
  lowRatingAlerts: number;
  trend: Array<{
    date: Date;
    averageRating: number;
    evaluationCount: number;
  }>;
}

// Tipos para alertas e notificações
export interface AlertMetrics {
  lowSatisfactionCount: number;
  inactiveUsersCount: number;
  systemAlerts: Array<{
    id: string;
    type: 'satisfaction' | 'inactivity' | 'system';
    message: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: Date;
    resolved: boolean;
  }>;
}

// Tipo consolidado para todas as métricas do dashboard
export interface DashboardMetrics {
  gamification: GamificationMetrics;
  satisfaction: SatisfactionMetrics;
  alerts: AlertMetrics;
  lastUpdated: Date;
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
  type: 'evaluation' | 'xp' | 'achievement' | 'full_refresh';
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
  type: 'connect' | 'disconnect' | 'update' | 'error';
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