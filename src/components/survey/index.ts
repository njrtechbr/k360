// Componentes principais
export { default as SurveyForm } from './SurveyForm';
export { default as RatingStars, RatingDisplay, useRating } from './RatingStars';
export { default as EvaluationCard, CompactEvaluationCard, SimpleEvaluationCard } from './EvaluationCard';
export { default as EvaluationsList } from './EvaluationsList';
export { default as SentimentBadge, ConfidenceBadge, SentimentAnalysis } from './SentimentBadge';
export { default as SurveyStats } from './SurveyStats';
export { default as AttendantProfile } from './AttendantProfile';
export { default as AnalysisProgress } from './AnalysisProgress';

// Componentes de análise de sentimento
export { default as SentimentAnalysisPanel } from './SentimentAnalysisPanel';
export { default as SentimentInsights } from './SentimentInsights';
export { default as SentimentFilters } from './SentimentFilters';

// Variantes pré-configuradas do RatingStars
export {
  SmallRating,
  LargeRating,
  InteractiveRating,
  RatingWithLabels
} from './RatingStars';

// Tipos e configurações
export type {
  SurveyFormProps,
  RatingStarsProps,
  EvaluationCardProps,
  SentimentBadgeProps,
  SurveyStatsProps,
  AttendantProfileProps,
  AnalysisProgressProps,
  SurveyFormData,
  EvaluationData,
  AttendantData,
  SurveyStats as SurveyStatsType,
  AnalysisProgress as AnalysisProgressType
} from './types';

// Tipos específicos dos novos componentes
export type {
  SentimentFilterOptions,
  AttendantOption,
  SentimentTrend,
  AttendantSentiment,
  SentimentInsight
} from './SentimentFilters';

// export { RATING_LABELS, SENTIMENT_CONFIG } from './types'; // Comentado - não existem no types.ts