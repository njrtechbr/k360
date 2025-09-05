"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { 
  Gamepad2, 
  Trophy, 
  Zap, 
  Target,
  TrendingUp,
  Award,
  Star
} from "lucide-react";

interface GamificationOverviewData {
  totalXpDistributed: number;
  activeAchievements: number;
  totalUnlocked: number;
  topAchievement: {
    id: string;
    title: string;
    unlockedCount: number;
  } | null;
}

interface PopularAchievement {
  achievementId: string;
  title: string;
  description: string;
  unlockedCount: number;
  icon: string;
  color: string;
}

interface GamificationOverviewProps {
  data: GamificationOverviewData;
  popularAchievements: PopularAchievement[];
  isLoading?: boolean;
}

export function GamificationOverview({ data, popularAchievements, isLoading }: GamificationOverviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Visão Geral da Gamificação
          </CardTitle>
          <CardDescription>Sistema de pontuação e conquistas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockRate = data.activeAchievements > 0 
    ? (data.totalUnlocked / data.activeAchievements) * 100 
    : 0;

  return (
    <div className="grid gap-6">
      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">XP Total</p>
                <p className="text-2xl font-bold">{data.totalXpDistributed.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conquistas Ativas</p>
                <p className="text-2xl font-bold">{data.activeAchievements}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Desbloqueadas</p>
                <p className="text-2xl font-bold">{data.totalUnlocked}</p>
              </div>
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Desbloqueio</p>
                <p className="text-2xl font-bold">{unlockRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conquista mais popular */}
      {data.topAchievement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Conquista Mais Popular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold">{data.topAchievement.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Desbloqueada {data.topAchievement.unlockedCount} vezes
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                #{1}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conquistas populares */}
      {popularAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Conquistas Mais Desbloqueadas
            </CardTitle>
            <CardDescription>Top 5 conquistas por popularidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popularAchievements.map((achievement, index) => (
                <div key={achievement.achievementId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    <div className="p-2 rounded-full" style={{ backgroundColor: `${achievement.color}20` }}>
                      <Trophy className="h-4 w-4" style={{ color: achievement.color }} />
                    </div>
                    <div>
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {achievement.unlockedCount} desbloqueios
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}