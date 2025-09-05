"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Users, CheckCircle, AlertCircle, Play, RefreshCw, Calendar, Target, Sparkles } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: string;
  color: string;
  active: boolean;
}

interface UnlockedAchievement {
  id: string;
  attendantId: string;
  achievementId: string;
  unlockedAt: string;
  xpGained: number;
}

interface AttendantAchievementStatus {
  attendantId: string;
  attendantName: string;
  totalAchievements: number;
  currentSeasonAchievements: number;
  missingAchievements: string[];
  canUnlock: string[];
}

export default function ConquistasConfigPage() {
  const { user, isAuthenticated, loading, attendants, seasons, xpEvents, evaluations } = useAuth();
  const router = useRouter();
  
  const [achievements, setAchievements] = useState<AchievementConfig[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [attendantStatuses, setAttendantStatuses] = useState<AttendantAchievementStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<any>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Encontrar temporada atual
  useEffect(() => {
    if (seasons && seasons.length > 0) {
      const now = new Date();
      const current = seasons.find(season => {
        const start = new Date(season.startDate);
        const end = new Date(season.endDate);
        return now >= start && now <= end;
      });
      setCurrentSeason(current);
    }
  }, [seasons]);

  // Buscar conquistas e dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [achievementsRes, unlockedRes] = await Promise.all([
          fetch('/api/gamification/achievements'),
          fetch('/api/gamification/achievements/all-unlocked')
        ]);
        
        if (achievementsRes.ok) {
          const achievementsData = await achievementsRes.json();
          setAchievements(achievementsData);
        }
        
        if (unlockedRes.ok) {
          const unlockedData = await unlockedRes.json();
          setUnlockedAchievements(unlockedData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };

    fetchData();
  }, []);

  // Analisar status dos atendentes
  useEffect(() => {
    if (attendants && achievements.length > 0 && currentSeason && xpEvents && evaluations) {
      analyzeAttendantStatuses();
    }
  }, [attendants, achievements, currentSeason, xpEvents, evaluations, unlockedAchievements]);

  const analyzeAttendantStatuses = async () => {
    if (!currentSeason) return;

    const seasonStart = new Date(currentSeason.startDate);
    const seasonEnd = new Date(currentSeason.endDate);
    
    const statuses: AttendantAchievementStatus[] = [];

    for (const attendant of attendants) {
      // Conquistas já desbloqueadas na temporada atual
      const currentSeasonUnlocked = unlockedAchievements.filter(ua => {
        const unlockedDate = new Date(ua.unlockedAt);
        return ua.attendantId === attendant.id && 
               unlockedDate >= seasonStart && 
               unlockedDate <= seasonEnd;
      });

      // Verificar quais conquistas podem ser desbloqueadas
      const canUnlock: string[] = [];
      const missingAchievements: string[] = [];

      for (const achievement of achievements) {
        const alreadyUnlocked = currentSeasonUnlocked.some(ua => ua.achievementId === achievement.id);
        
        if (!alreadyUnlocked) {
          const shouldUnlock = await checkAchievementCriteria(attendant.id, achievement.id, seasonStart, seasonEnd);
          if (shouldUnlock) {
            canUnlock.push(achievement.id);
          } else {
            missingAchievements.push(achievement.id);
          }
        }
      }

      statuses.push({
        attendantId: attendant.id,
        attendantName: attendant.name,
        totalAchievements: unlockedAchievements.filter(ua => ua.attendantId === attendant.id).length,
        currentSeasonAchievements: currentSeasonUnlocked.length,
        missingAchievements,
        canUnlock
      });
    }

    setAttendantStatuses(statuses.sort((a, b) => b.canUnlock.length - a.canUnlock.length));
  };

  const checkAchievementCriteria = async (attendantId: string, achievementId: string, seasonStart: Date, seasonEnd: Date): Promise<boolean> => {
    // Filtrar dados apenas da temporada atual
    const seasonXpEvents = xpEvents.filter(e => {
      const eventDate = new Date(e.date);
      return e.attendantId === attendantId && eventDate >= seasonStart && eventDate <= seasonEnd;
    });
    
    const seasonEvaluations = evaluations.filter(e => {
      const evalDate = new Date(e.data);
      return e.attendantId === attendantId && evalDate >= seasonStart && evalDate <= seasonEnd;
    });

    const seasonXp = seasonXpEvents.reduce((sum, e) => sum + (e.points || 0), 0);
    const evaluationCount = seasonEvaluations.length;

    // Critérios baseados no ID da conquista (apenas para temporada atual)
    switch (achievementId) {
      case 'first_evaluation':
        return evaluationCount >= 1;
      case 'ten_evaluations':
        return evaluationCount >= 10;
      case 'fifty_evaluations':
        return evaluationCount >= 50;
      case 'hundred_evaluations':
        return evaluationCount >= 100;
      case 'hundred_xp':
        return seasonXp >= 100;
      case 'thousand_xp':
        return seasonXp >= 1000;
      case 'five_thousand_xp':
        return seasonXp >= 5000;
      case 'ten_thousand_xp':
        return seasonXp >= 10000;
      case 'five_star_streak_5':
        return checkFiveStarStreak(seasonEvaluations, 5);
      case 'five_star_streak_10':
        return checkFiveStarStreak(seasonEvaluations, 10);
      case 'high_average_50':
        return checkHighAverage(seasonEvaluations, 4.5, 50);
      default:
        return false;
    }
  };

  const checkFiveStarStreak = (evaluations: any[], requiredStreak: number): boolean => {
    if (evaluations.length < requiredStreak) return false;
    
    const sorted = evaluations.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    let currentStreak = 0;
    let maxStreak = 0;
    
    for (const evaluation of sorted) {
      if (evaluation.nota === 5) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak >= requiredStreak;
  };

  const checkHighAverage = (evaluations: any[], requiredAverage: number, minEvaluations: number): boolean => {
    if (evaluations.length < minEvaluations) return false;
    const average = evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
    return average >= requiredAverage;
  };

  const processAchievements = async (attendantId?: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/gamification/achievements/process-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attendantId,
          seasonId: currentSeason?.id 
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Processamento concluído! ${result.unlockedCount} conquistas desbloqueadas.`);
        
        // Recarregar dados
        window.location.reload();
      } else {
        alert('Erro ao processar conquistas.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar conquistas.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }

  if (!currentSeason) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/gamificacao/configuracoes">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Conquistas</h1>
            <p className="text-muted-foreground">Verificar e desbloquear conquistas da temporada</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma temporada ativa</h3>
            <p className="text-muted-foreground">Não há temporada ativa no momento para gerenciar conquistas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/gamificacao/configuracoes">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Conquistas</h1>
          <p className="text-muted-foreground">Verificar e desbloquear conquistas da temporada atual</p>
        </div>
      </div>

      {/* Header com informações da temporada */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                {currentSeason.name}
              </h2>
              <p className="text-muted-foreground">
                {format(new Date(currentSeason.startDate), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(currentSeason.endDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="default" className="mb-2">Temporada Ativa</Badge>
              <p className="text-sm text-muted-foreground">Multiplicador: {currentSeason.xpMultiplier}x</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atendentes</p>
                <p className="text-2xl font-bold">{attendants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Podem Desbloquear</p>
                <p className="text-2xl font-bold">{attendantStatuses.reduce((sum, s) => sum + s.canUnlock.length, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conquistas Ativas</p>
                <p className="text-2xl font-bold">{achievements.filter(a => a.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Desbloqueadas</p>
                <p className="text-2xl font-bold">{attendantStatuses.reduce((sum, s) => sum + s.currentSeasonAchievements, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações principais */}
      <div className="flex gap-4">
        <Button 
          onClick={() => processAchievements()} 
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Processar Todas as Conquistas
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => analyzeAttendantStatuses()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar Análise
        </Button>
      </div>

      {/* Tabela de atendentes */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Atendentes</CardTitle>
          <CardDescription>
            Conquistas que podem ser desbloqueadas na temporada atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atendente</TableHead>
                <TableHead>Conquistas Temporada</TableHead>
                <TableHead>Podem Desbloquear</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendantStatuses.map((status) => (
                <TableRow key={status.attendantId}>
                  <TableCell className="font-medium">{status.attendantName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {status.currentSeasonAchievements} de {achievements.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {status.canUnlock.length > 0 ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {status.canUnlock.length} disponível{status.canUnlock.length !== 1 ? 'is' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Nenhuma</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress 
                        value={(status.currentSeasonAchievements / achievements.length) * 100} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground">
                        {Math.round((status.currentSeasonAchievements / achievements.length) * 100)}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {status.canUnlock.length > 0 && (
                      <Button 
                        size="sm" 
                        onClick={() => processAchievements(status.attendantId)}
                        disabled={isProcessing}
                      >
                        Desbloquear ({status.canUnlock.length})
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}