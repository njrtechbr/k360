import type { Evaluation, Attendant } from '@/lib/types';

// Props para useEvaluations
export interface UseEvaluationsProps {
  autoFetch?: boolean;
  refreshInterval?: number;
}

// Props para useSurvey
export interface UseSurveyProps {
  onSuccess?: (evaluation: Evaluation) => void;
  onError?: (error: string) => void;
}

// Props para useEvaluationAnalytics
export interface UseEvaluationAnalyticsProps {
  evaluations: Evaluation[];
  attendants?: Attendant[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Analytics data types
export interface EvaluationAnalytics {
  totalEvaluations: number;
  averageRating: number;
  satisfactionRate: number;
  commentsCount: number;
  evaluatedAttendants: number;
  ratingDistribution: RatingDistribution;
  topRatedAttendants: AttendantRating[];
  lowestRatedAttendants: AttendantRating[];
  recentTrends: TrendData[];
  sentimentByAttendant: SentimentByAttendant[];
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface AttendantRating {
  attendantId: string;
  attendantName: string;
  averageRating: number;
  totalEvaluations: number;
  satisfactionRate: number;
}

export interface TrendData {
  date: string;
  averageRating: number;
  totalEvaluations: number;
  satisfactionRate: number;
}

export interface SentimentByAttendant {
  attendantId: string;
  attendantName: string;
  positive: number;
  negative: number;
  neutral: number;
  totalAnalyzed: number;
}