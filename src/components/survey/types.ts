import type { Evaluation, Attendant, EvaluationAnalysis } from '@/lib/types';
import type { EvaluationAnalytics } from '@/hooks/survey/types';

// Props para SurveyForm
export interface SurveyFormProps {
  attendant: Attendant;
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  loading?: boolean;
  className?: string;
}

// Props para RatingStars
export interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

// Props para EvaluationCard
export interface EvaluationCardProps {
  evaluation: {
    id: string;
    nota?: number;
    rating?: number;
    comentario?: string;
    comment?: string;
    data?: string;
    createdAt?: string;
    sentiment?: string;
    confidence?: number;
    tags?: string[];
    xpGained?: number;
  };
  attendant?: {
    id: string;
    name?: string;
    nome?: string;
    avatar?: string;
    avatarUrl?: string;
    funcao?: string;
    setor?: string;
  };
  showAttendant?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  onView?: (evaluation: any) => void;
  onEdit?: (evaluation: any) => void;
  onDelete?: (evaluation: any) => void;
  onAttendantClick?: () => void;
}

// Props para SentimentBadge
export interface SentimentBadgeProps {
  /** Tipo de sentimento */
  sentiment: string;
  /** Nível de confiança da análise (0-1) */
  confidence?: number;
  /** Tamanho do badge */
  size?: 'sm' | 'md' | 'lg';
  /** Se deve mostrar o nível de confiança */
  showConfidence?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Se deve mostrar ícone */
  showIcon?: boolean;
  /** Variante do badge */
  variant?: 'default' | 'outline' | 'subtle';
  /** Tooltip personalizado */
  tooltip?: string | null;
}

// Props para EvaluationsList
export interface EvaluationsListProps {
  evaluations: Evaluation[];
  attendants: Attendant[];
  loading?: boolean;
  onEdit?: (evaluation: Evaluation) => void;
  onDelete?: (evaluation: Evaluation) => void;
  onView?: (evaluation: Evaluation) => void;
  showActions?: boolean;
  showFilters?: boolean;
  pageSize?: number;
  className?: string;
}

// Props para SurveyStats
export interface SurveyStatsProps {
  analytics: EvaluationAnalytics;
  loading?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  showCharts?: boolean;
  className?: string;
}

// Props para AttendantProfile
export interface AttendantProfileProps {
  attendant: Attendant;
  evaluations: Evaluation[];
  showActions?: boolean;
  onEditAttendant?: (attendant: Attendant) => void;
  onViewEvaluations?: (attendantId: string) => void;
  className?: string;
}

// Props para AnalysisProgress
export interface AnalysisProgressProps {
  evaluations: Evaluation[];
  analysisResults: EvaluationAnalysis[];
  isAnalyzing?: boolean;
  onStartAnalysis?: () => void;
  onRetryAnalysis?: () => void;
  showDetails?: boolean;
  className?: string;
}

export interface SurveyFiltersProps {
  onFiltersChange: (filters: SurveyFilters) => void;
  attendants: Attendant[];
  initialFilters?: Partial<SurveyFilters>;
  className?: string;
}

export interface SurveyFilters {
  attendantId?: string;
  rating?: number;
  sentiment?: 'Positivo' | 'Negativo' | 'Neutro';
  dateFrom?: string;
  dateTo?: string;
  hasComment?: boolean;
}