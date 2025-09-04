// Serviços de pesquisa de satisfação modularizados
export { EvaluationsService } from './evaluations.service';
export { AttendantsService } from './attendants.service';
export { AnalyticsService } from './analytics.service';
export { SentimentService } from './sentiment.service';

// Tipos e interfaces
export type {
  EvaluationFilters,
  EvaluationStats,
  EvaluationSummary
} from './evaluations.service';

export type {
  AttendantStats,
  AttendantPerformance
} from './attendants.service';

export type {
  AnalyticsData,
  RatingDistribution,
  TrendData
} from './analytics.service';

export type {
  SentimentAnalysis,
  SentimentStats,
  SentimentProgress
} from './sentiment.service';

// Re-exportar tipos principais para conveniência
export type {
  Evaluation,
  Attendant,
  SentimentAnalysisResult
} from '@/lib/types';