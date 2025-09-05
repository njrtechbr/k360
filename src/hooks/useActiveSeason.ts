"use client";

import { useState, useEffect } from "react";
import { GamificationSeason } from "@prisma/client";

export function useActiveSeason() {
  const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveSeason = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/gamification/seasons?status=active');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar temporada ativa');
      }
      
      const data = await response.json();
      
      // A API retorna um objeto com seasons filtradas e activeSeason
      if (data.activeSeason) {
        setActiveSeason(data.activeSeason);
      } else if (data.seasons && data.seasons.length > 0) {
        setActiveSeason(data.seasons[0]);
      } else {
        setActiveSeason(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setActiveSeason(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSeason();
  }, []);

  return {
    activeSeason,
    isLoading,
    error,
    refetch: fetchActiveSeason,
    hasActiveSeason: activeSeason !== null
  };
}