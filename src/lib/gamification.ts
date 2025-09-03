import type { GamificationConfig } from './types';

/**
 * Gets the base XP score for a given rating from the configuration.
 * @param rating The star rating (1-5).
 * @param scores The ratingScores object from GamificationConfig.
 * @returns The base XP score.
 */
export const getScoreFromRating = (rating: number, scores: GamificationConfig['ratingScores']): number => {
    const key = String(rating) as keyof typeof scores;
    return scores[key] ?? 0;
};
