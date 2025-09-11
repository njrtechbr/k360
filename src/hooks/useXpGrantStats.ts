"use client";

import { useState, useEffect } from "react";

export interface XpGrantStats {
  totalGrants: number;
  totalPoints: number;
  averagePoints: number;
  dailyAverageGrants: number;
  dailyAveragePoints: number;
}

export interface XpGrantStatsResponse {
  success: boolean;
  data: {
    period: {
      value: string;
      label: string;
    };
    overview: XpGrantStats;
  };
}

export function useXpGrantStats(period: string = "1d") {
  const [stats, setStats] = useState<XpGrantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/gamification/xp-grants/statistics?period=${period}`,
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar estatísticas");
      }

      const data: XpGrantStatsResponse = await response.json();
      setStats(data.data.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
