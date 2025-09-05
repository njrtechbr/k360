

"use client";

import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, BarChart3, Calendar, Crown, History, Mail, Phone, Sparkles, Star, TrendingDown, TrendingUp, Trophy, UserCircle, Award, Target, Zap, Medal, Shield } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getLevelFromXp } from "@/lib/xp";
import type { XpEvent, UnlockedAchievement, AchievementConfig } from "@/lib/types";

const RatingStars = ({ rating, className }: { rating: number, className?: string }) => {
    const totalStars = 5;
    return (
        <div className="flex items-center">
            {[...Array(totalStars)].map((_, index) => (
                <Star
                    key={index}
                    className={`h-4 w-4 ${className} ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);

const AchievementCard = ({ achievement, unlockedAt }: { achievement: AchievementConfig, unlockedAt?: Date }) => (
    <Card className={cn("transition-all hover:shadow-md", unlockedAt ? "border-yellow-200 bg-yellow-50/50" : "opacity-60")}>
        <CardContent className="p-4">
            <div className="flex items-start gap-3">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm">{achievement.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                    <div className="flex items-center justify-between">
                        <Badge variant={unlockedAt ? "default" : "secondary"} className="text-xs">
                            +{achievement.xp} XP
                        </Badge>
                        {unlockedAt && (
                            <span className="text-xs text-muted-foreground">
                                {format(unlockedAt, "dd/MM/yy", { locale: ptBR })}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

const AchievementBadge = ({ achievement, unlockedAt }: { achievement: AchievementConfig, unlockedAt?: Date }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all cursor-pointer hover:scale-110",
                    unlockedAt 
                        ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-md hover:shadow-lg" 
                        : "border-gray-200 bg-gray-50 opacity-40 hover:opacity-60"
                )}>
                    <span className={cn("text-lg", unlockedAt ? "grayscale-0" : "grayscale")}>
                        {achievement.icon}
                    </span>
                    {unlockedAt && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                    <p className="font-semibold text-sm">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    <div className="flex items-center justify-between pt-1">
                        <Badge variant="outline" className="text-xs">+{achievement.xp} XP</Badge>
                        {unlockedAt && (
                            <span className="text-xs text-green-600 font-medium">
                                Desbloqueado em {format(unlockedAt, "dd/MM/yy", { locale: ptBR })}
                            </span>
                        )}
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const StatCard = ({ icon, label, value, description, color = "default" }: { 
    icon: React.ReactNode, 
    label: string, 
    value: string | number, 
    description?: string,
    color?: "default" | "success" | "warning" | "destructive"
}) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", {
                    "bg-blue-100 text-blue-600": color === "default",
                    "bg-green-100 text-green-600": color === "success", 
                    "bg-yellow-100 text-yellow-600": color === "warning",
                    "bg-red-100 text-red-600": color === "destructive"
                })}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
            </div>
        </CardContent>
    </Card>
);


export default function AttendantProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const { attendants, evaluations, loading, user, xpEvents, seasons } = useAuth();
    const [achievements, setAchievements] = useState<AchievementConfig[]>([]);
    const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);

    // Função para garantir conquistas únicas
    const getUniqueUnlockedAchievements = (unlocked: UnlockedAchievement[]) => {
        const seen = new Set();
        return unlocked.filter(achievement => {
            if (seen.has(achievement.achievementId)) {
                return false;
            }
            seen.add(achievement.achievementId);
            return true;
        });
    };

    // Função para calcular porcentagem de forma segura
    const calculateAchievementPercentage = () => {
        if (achievements.length === 0) return 0;
        const percentage = (unlockedAchievements.length / achievements.length) * 100;
        return Math.min(100, Math.max(0, Math.round(percentage)));
    };

    const attendant = useMemo(() => attendants.find(a => a.id === id), [attendants, id]);
    
    // Buscar conquistas
    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const [achievementsRes, unlockedRes] = await Promise.all([
                    fetch('/api/gamification/achievements'),
                    fetch(`/api/gamification/achievements/unlocked?attendantId=${id}`)
                ]);
                
                if (achievementsRes.ok) {
                    const achievementsData = await achievementsRes.json();
                    setAchievements(achievementsData);
                }
                
                if (unlockedRes.ok) {
                    const unlockedData = await unlockedRes.json();
                    setUnlockedAchievements(getUniqueUnlockedAchievements(unlockedData));
                }
            } catch (error) {
                console.error('Erro ao buscar conquistas:', error);
            }
        };

        if (id) {
            fetchAchievements();
        }
    }, [id]);

    // Calcular estatísticas completas
    const stats = useMemo(() => {
        if (!attendant || !xpEvents || !evaluations || !seasons) {
            return {
                totalXp: 0,
                totalEvaluations: 0,
                averageRating: 0,
                currentLevel: { level: 1, title: 'Iniciante', xpRequired: 100, progress: 0 },
                seasonStats: {},
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                streaks: { current: 0, best: 0 },
                seasonHistory: []
            };
        }

        // XP total
        const attendantXpEvents = xpEvents.filter(e => e.attendantId === id);
        const totalXp = attendantXpEvents.reduce((sum, e) => sum + (e.points || 0), 0);
        
        // Avaliações do atendente
        const attendantEvaluations = evaluations.filter(e => e.attendantId === id);
        const totalEvaluations = attendantEvaluations.length;
        const averageRating = totalEvaluations > 0 
            ? attendantEvaluations.reduce((sum, e) => sum + e.nota, 0) / totalEvaluations 
            : 0;

        // Nível atual
        const currentLevel = getLevelFromXp(totalXp);

        // Distribuição de notas
        const ratingDistribution = attendantEvaluations.reduce((acc, e) => {
            acc[e.nota as keyof typeof acc]++;
            return acc;
        }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

        // Sequências de 5 estrelas
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        
        const sortedEvaluations = [...attendantEvaluations].sort((a, b) => 
            new Date(a.data).getTime() - new Date(b.data).getTime()
        );
        
        for (const evaluation of sortedEvaluations) {
            if (evaluation.nota === 5) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }
        
        // Sequência atual (últimas avaliações)
        for (let i = sortedEvaluations.length - 1; i >= 0; i--) {
            if (sortedEvaluations[i].nota === 5) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Preparar dados das temporadas
        const now = new Date();
        const sortedSeasons = [...seasons].sort((a, b) => 
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        // Encontrar temporada atual
        const currentSeason = sortedSeasons.find(season => {
            const seasonStart = new Date(season.startDate);
            const seasonEnd = new Date(season.endDate);
            return now >= seasonStart && now <= seasonEnd;
        });

        // XP da temporada atual
        let currentSeasonXp = 0;
        if (currentSeason) {
            const currentSeasonStart = new Date(currentSeason.startDate);
            const currentSeasonEnd = new Date(currentSeason.endDate);
            currentSeasonXp = attendantXpEvents.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate >= currentSeasonStart && eventDate <= currentSeasonEnd;
            }).reduce((sum, e) => sum + (e.points || 0), 0);
        }

        // Estatísticas detalhadas por temporada
        const seasonStats: Record<string, any> = {};
        const seasonHistory: any[] = [];
        
        sortedSeasons.forEach(season => {
            const seasonStart = new Date(season.startDate);
            const seasonEnd = new Date(season.endDate);
            const isFinished = now > seasonEnd;
            const isActive = now >= seasonStart && now <= seasonEnd;
            
            // Eventos XP da temporada
            const seasonXpEvents = attendantXpEvents.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate >= seasonStart && eventDate <= seasonEnd;
            });
            
            const seasonXp = seasonXpEvents.reduce((sum, e) => sum + (e.points || 0), 0);
            
            // Avaliações da temporada
            const seasonEvals = attendantEvaluations.filter(e => {
                const evalDate = new Date(e.data);
                return evalDate >= seasonStart && evalDate <= seasonEnd;
            });

            // Conquistas da temporada (apenas desta temporada específica)
            const seasonAchievements = unlockedAchievements.filter(achievement => {
                const unlockedDate = new Date(achievement.unlockedAt);
                return unlockedDate >= seasonStart && unlockedDate <= seasonEnd;
            });

            // Distribuição de notas da temporada
            const seasonRatingDist = seasonEvals.reduce((acc, e) => {
                acc[e.nota as keyof typeof acc]++;
                return acc;
            }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

            // Sequência de 5 estrelas na temporada
            let seasonStreak = 0;
            let bestSeasonStreak = 0;
            let tempSeasonStreak = 0;
            
            const sortedSeasonEvals = [...seasonEvals].sort((a, b) => 
                new Date(a.data).getTime() - new Date(b.data).getTime()
            );
            
            for (const evaluation of sortedSeasonEvals) {
                if (evaluation.nota === 5) {
                    tempSeasonStreak++;
                    bestSeasonStreak = Math.max(bestSeasonStreak, tempSeasonStreak);
                } else {
                    tempSeasonStreak = 0;
                }
            }

            // Sequência atual da temporada (se for a temporada ativa)
            if (isActive) {
                for (let i = sortedSeasonEvals.length - 1; i >= 0; i--) {
                    if (sortedSeasonEvals[i].nota === 5) {
                        seasonStreak++;
                    } else {
                        break;
                    }
                }
            }

            const seasonData = {
                id: season.id,
                name: season.name,
                startDate: season.startDate,
                endDate: season.endDate,
                xpMultiplier: season.xpMultiplier,
                isActive,
                isFinished,
                xp: seasonXp,
                evaluations: seasonEvals.length,
                average: seasonEvals.length > 0 
                    ? seasonEvals.reduce((sum, e) => sum + e.nota, 0) / seasonEvals.length 
                    : 0,
                achievements: seasonAchievements,
                ratingDistribution: seasonRatingDist,
                streaks: {
                    current: isActive ? seasonStreak : 0,
                    best: bestSeasonStreak
                },
                xpEvents: seasonXpEvents
            };

            seasonStats[season.id] = seasonData;
            
            // Adicionar ao histórico apenas temporadas com dados
            if (seasonEvals.length > 0 || seasonAchievements.length > 0 || seasonXp > 0) {
                seasonHistory.push(seasonData);
            }
        });

        return {
            totalXp,
            currentSeasonXp,
            currentSeason,
            totalEvaluations,
            averageRating,
            currentLevel,
            seasonStats,
            ratingDistribution,
            streaks: { current: currentStreak, best: bestStreak },
            seasonHistory: seasonHistory.reverse() // Mais recente primeiro
        };
    }, [attendant, xpEvents, evaluations, seasons, unlockedAchievements, id]);
    
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    if (!attendant) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Atendente não encontrado</h1>
                <p className="text-muted-foreground">O atendente que você está procurando não existe ou foi removido.</p>
                <Button asChild className="mt-4">
                    <Link href="/dashboard/rh/atendentes">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/rh/atendentes">
                        <ArrowLeft />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Perfil do Atendente</h1>
                    <p className="text-muted-foreground">Desempenho, conquistas e progressão</p>
                </div>
            </div>

            {/* Header com informações principais */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                            <AvatarFallback><UserCircle className="h-10 w-10" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold">{attendant.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary">{attendant.funcao}</Badge>
                                        <Badge variant={attendant.status === 'Ativo' ? "default" : "destructive"}>
                                            {attendant.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        <span className="capitalize">{attendant.setor}</span>
                                        <span>•</span>
                                        <span>Desde {format(new Date(attendant.dataAdmissao), 'MMM/yyyy', { locale: ptBR })}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Crown className="h-5 w-5 text-yellow-500" />
                                        <span className="text-lg font-bold">Nível {stats.currentLevel.level}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{stats.currentLevel.title}</p>
                                    <div className="space-y-1 mt-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-blue-500" />
                                            <span className="font-semibold">{Math.round(stats.totalXp)} XP Total</span>
                                        </div>
                                        {stats.currentSeason && (
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-medium">{Math.round(stats.currentSeasonXp)} XP ({stats.currentSeason.name})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Barra de progresso do nível */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span>Progresso para o próximo nível</span>
                                    <span>{stats.currentLevel.progress}%</span>
                                </div>
                                <Progress value={stats.currentLevel.progress} className="h-2" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Conquistas em Destaque */}
            {unlockedAchievements.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Conquistas Desbloqueadas
                            <Badge variant="secondary" className="ml-2">
                                {unlockedAchievements.length}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Selos e conquistas obtidas pelo atendente
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {unlockedAchievements
                                .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
                                .slice(0, 12)
                                .map(unlocked => {
                                    const achievement = achievements.find(a => a.id === unlocked.achievementId);
                                    if (!achievement) return null;
                                    
                                    return (
                                        <TooltipProvider key={unlocked.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-3 py-2 hover:shadow-md transition-all cursor-pointer">
                                                        <span className="text-lg">{achievement.icon}</span>
                                                        <div className="text-left">
                                                            <p className="font-medium text-sm text-gray-900">{achievement.title}</p>
                                                            <p className="text-xs text-gray-600">+{achievement.xp} XP</p>
                                                        </div>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <div className="space-y-2">
                                                        <p className="font-semibold">{achievement.title}</p>
                                                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                                        <div className="flex items-center justify-between pt-1 border-t">
                                                            <Badge variant="outline" className="text-xs">+{achievement.xp} XP</Badge>
                                                            <span className="text-xs text-green-600 font-medium">
                                                                {format(new Date(unlocked.unlockedAt), "dd/MM/yy", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                })}
                            
                            {unlockedAchievements.length > 12 && (
                                <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
                                    +{unlockedAchievements.length - 12} mais
                                </div>
                            )}
                        </div>
                        
                        {achievements.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Progresso geral das conquistas</span>
                                    <span className="font-medium">
                                        {calculateAchievementPercentage()}%
                                    </span>
                                </div>
                                <Progress 
                                    value={calculateAchievementPercentage()} 
                                    className="h-2" 
                                />

                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Estatísticas principais */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard 
                    icon={<Sparkles size={20} />}
                    label="XP Total"
                    value={Math.round(stats.totalXp)}
                    description="Todos os tempos"
                    color="default"
                />
                <StatCard 
                    icon={<Target size={20} />}
                    label="XP Temporada"
                    value={Math.round(stats.currentSeasonXp)}
                    description={stats.currentSeason?.name || "Nenhuma ativa"}
                    color="success"
                />
                <StatCard 
                    icon={<Star size={20} />}
                    label="Nota Média"
                    value={stats.averageRating.toFixed(2)}
                    description={`${stats.totalEvaluations} avaliações`}
                    color="warning"
                />
                <StatCard 
                    icon={<Zap size={20} />}
                    label="Sequência Atual"
                    value={`${stats.streaks.current}★`}
                    description="5 estrelas seguidas"
                    color="warning"
                />
                <StatCard 
                    icon={<Trophy size={20} />}
                    label="Conquistas Totais"
                    value={unlockedAchievements.length}
                    description={`de ${achievements.length} disponíveis`}
                    color="default"
                />
            </div>

            {/* Tabs com conteúdo detalhado */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="achievements">Conquistas</TabsTrigger>
                    <TabsTrigger value="seasons">Temporadas</TabsTrigger>
                    <TabsTrigger value="season-history">Histórico</TabsTrigger>
                    <TabsTrigger value="xp-events">Eventos XP</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Distribuição de notas */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Distribuição de Notas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {Object.entries(stats.ratingDistribution).map(([rating, count]) => (
                                    <div key={rating} className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 w-12">
                                            <span className="text-sm font-medium">{rating}</span>
                                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                        </div>
                                        <Progress 
                                            value={stats.totalEvaluations > 0 ? (count / stats.totalEvaluations) * 100 : 0} 
                                            className="flex-1 h-2" 
                                        />
                                        <span className="text-sm text-muted-foreground w-8">{count}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Recordes pessoais */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Medal className="h-5 w-5" />
                                    Recordes Pessoais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Melhor sequência 5★</span>
                                    <Badge variant="outline">{stats.streaks.best} seguidas</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Sequência atual 5★</span>
                                    <Badge variant={stats.streaks.current > 0 ? "default" : "secondary"}>
                                        {stats.streaks.current} seguidas
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Total de XP</span>
                                    <Badge variant="outline">{Math.round(stats.totalXp)} pontos</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="achievements" className="space-y-6">
                    {/* Resumo de Conquistas */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard 
                            icon={<Trophy size={20} />}
                            label="Total Desbloqueadas"
                            value={unlockedAchievements.length}
                            description={`de ${achievements.length} disponíveis`}
                            color="success"
                        />
                        <StatCard 
                            icon={<Target size={20} />}
                            label="Taxa de Conclusão"
                            value={`${calculateAchievementPercentage()}%`}
                            description="Progresso geral"
                            color="default"
                        />
                        <StatCard 
                            icon={<Sparkles size={20} />}
                            label="XP de Conquistas"
                            value={unlockedAchievements.reduce((sum, u) => {
                                const achievement = achievements.find(a => a.id === u.achievementId);
                                return sum + (achievement?.xp || 0);
                            }, 0)}
                            description="Bônus total ganho"
                            color="warning"
                        />
                        <StatCard 
                            icon={<Calendar size={20} />}
                            label="Última Conquista"
                            value={unlockedAchievements.length > 0 ? format(
                                new Date(Math.max(...unlockedAchievements.map(u => new Date(u.unlockedAt).getTime()))),
                                "dd/MM",
                                { locale: ptBR }
                            ) : "Nenhuma"}
                            description="Mais recente"
                            color="default"
                        />
                    </div>

                    {/* Galeria Completa de Conquistas */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <Award className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-semibold">Todas as Conquistas</h3>
                            <Badge variant="outline">
                                {unlockedAchievements.length} de {achievements.length}
                            </Badge>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {achievements.map(achievement => {
                                const unlocked = unlockedAchievements.find(u => u.achievementId === achievement.id);
                                const isUnlocked = !!unlocked;
                                
                                return (
                                    <div
                                        key={achievement.id}
                                        className={cn(
                                            "relative p-4 rounded-lg border-2 transition-all hover:shadow-md",
                                            isUnlocked 
                                                ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-sm" 
                                                : "border-gray-200 bg-gray-50/50 opacity-60"
                                        )}
                                    >
                                        {/* Indicador de desbloqueio */}
                                        {isUnlocked && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                                <div className="w-3 h-3 bg-white rounded-full" />
                                            </div>
                                        )}
                                        
                                        {/* Conteúdo da conquista */}
                                        <div className="flex items-start gap-3">
                                            <div className={cn("text-2xl", isUnlocked ? "grayscale-0" : "grayscale opacity-50")}>
                                                {achievement.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={cn("font-semibold text-sm mb-1", isUnlocked ? "text-gray-900" : "text-gray-500")}>
                                                    {achievement.title}
                                                </h4>
                                                <p className={cn("text-xs mb-3 line-clamp-2", isUnlocked ? "text-gray-600" : "text-gray-400")}>
                                                    {achievement.description}
                                                </p>
                                                
                                                {/* Footer com XP e data */}
                                                <div className="flex items-center justify-between">
                                                    <Badge 
                                                        variant={isUnlocked ? "default" : "secondary"} 
                                                        className="text-xs"
                                                    >
                                                        +{achievement.xp} XP
                                                    </Badge>
                                                    {unlocked && (
                                                        <span className="text-xs text-green-600 font-medium">
                                                            {format(new Date(unlocked.unlockedAt), "dd/MM/yy", { locale: ptBR })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Conquistas Recentes */}
                    {unlockedAchievements.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <History className="h-5 w-5 text-green-500" />
                                <h3 className="text-lg font-semibold">Conquistas Recentes</h3>
                                <Badge variant="secondary">
                                    Últimas {Math.min(6, unlockedAchievements.length)} desbloqueadas
                                </Badge>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {[...unlockedAchievements]
                                    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
                                    .slice(0, 6)
                                    .map(unlocked => {
                                        const achievement = achievements.find(a => a.id === unlocked.achievementId);
                                        return achievement ? (
                                            <AchievementCard 
                                                key={`recent-${unlocked.id}`}
                                                achievement={achievement}
                                                unlockedAt={new Date(unlocked.unlockedAt)}
                                            />
                                        ) : null;
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Conquistas por Categoria */}
                    {(() => {
                        // Organizar conquistas por categoria baseado no título/descrição
                        const categories = {
                            progressao: {
                                name: "📈 Progressão",
                                description: "Conquistas baseadas no número de avaliações",
                                achievements: achievements.filter(a => 
                                    a.title.includes("Impressão") || 
                                    a.title.includes("Veterano") || 
                                    a.title.includes("Experiente") || 
                                    a.title.includes("Centurião")
                                )
                            },
                            experiencia: {
                                name: "💎 Experiência",
                                description: "Conquistas baseadas no XP acumulado",
                                achievements: achievements.filter(a => 
                                    a.title.includes("Passos") || 
                                    a.title.includes("Milionário") || 
                                    a.title.includes("Lenda") || 
                                    a.title.includes("Mestre")
                                )
                            },
                            qualidade: {
                                name: "✨ Qualidade",
                                description: "Conquistas baseadas na excelência do atendimento",
                                achievements: achievements.filter(a => 
                                    a.title.includes("Sequência") || 
                                    a.title.includes("Perfeição") || 
                                    a.title.includes("Excelência")
                                )
                            },
                            especiais: {
                                name: "🏆 Especiais",
                                description: "Conquistas exclusivas e temporárias",
                                achievements: achievements.filter(a => 
                                    a.title.includes("Campeão") || 
                                    a.title.includes("Vencedor") ||
                                    (!a.title.includes("Impressão") && 
                                     !a.title.includes("Veterano") && 
                                     !a.title.includes("Experiente") && 
                                     !a.title.includes("Centurião") &&
                                     !a.title.includes("Passos") && 
                                     !a.title.includes("Milionário") && 
                                     !a.title.includes("Lenda") && 
                                     !a.title.includes("Mestre") &&
                                     !a.title.includes("Sequência") && 
                                     !a.title.includes("Perfeição") && 
                                     !a.title.includes("Excelência"))
                                )
                            }
                        };

                        return Object.entries(categories).map(([key, category]) => {
                            if (category.achievements.length === 0) return null;
                            
                            const unlockedInCategory = category.achievements.filter(achievement => 
                                unlockedAchievements.some(u => u.achievementId === achievement.id)
                            ).length;

                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{category.name}</h3>
                                            <p className="text-sm text-muted-foreground">{category.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline">
                                                {unlockedInCategory} de {category.achievements.length}
                                            </Badge>
                                            <div className="mt-1">
                                                <Progress 
                                                    value={(unlockedInCategory / category.achievements.length) * 100} 
                                                    className="w-24 h-2" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-8">
                                        {category.achievements.map(achievement => {
                                            const unlocked = unlockedAchievements.find(u => u.achievementId === achievement.id);
                                            return (
                                                <AchievementCard 
                                                    key={`${key}-${achievement.id}`}
                                                    achievement={achievement}
                                                    unlockedAt={unlocked?.unlockedAt ? new Date(unlocked.unlockedAt) : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </TabsContent>

                <TabsContent value="seasons" className="space-y-4">
                    <div className="grid gap-4">
                        {Object.entries(stats.seasonStats).map(([seasonId, seasonData]: [string, any]) => (
                            <Card key={seasonId} className={cn(
                                "transition-all",
                                seasonData.isActive && "border-blue-200 bg-blue-50/50",
                                seasonData.isFinished && "border-gray-200"
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold">{seasonData.name}</h4>
                                                <Badge variant={seasonData.isActive ? "default" : seasonData.isFinished ? "secondary" : "outline"}>
                                                    {seasonData.isActive ? "Ativa" : seasonData.isFinished ? "Finalizada" : "Futura"}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {seasonData.xpMultiplier}x XP
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {format(new Date(seasonData.startDate), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(seasonData.endDate), "dd/MM/yyyy", { locale: ptBR })}
                                            </p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Avaliações</p>
                                                    <p className="font-semibold">{seasonData.evaluations}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Média</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-semibold">{seasonData.average.toFixed(2)}</span>
                                                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Conquistas</p>
                                                    <p className="font-semibold">{seasonData.achievements.length}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Melhor Sequência</p>
                                                    <p className="font-semibold">{seasonData.streaks.best}★</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Sparkles className="h-4 w-4 text-blue-500" />
                                                <span className="font-semibold text-lg">{Math.round(seasonData.xp)} XP</span>
                                            </div>
                                            {seasonData.isActive && seasonData.streaks.current > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    {seasonData.streaks.current}★ atual
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="season-history" className="space-y-4">
                    {stats.seasonHistory.map((seasonData: any) => (
                        <Card key={seasonData.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            {seasonData.name}
                                        </CardTitle>
                                        <CardDescription>
                                            {format(new Date(seasonData.startDate), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(seasonData.endDate), "dd/MM/yyyy", { locale: ptBR })}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={seasonData.isActive ? "default" : "secondary"}>
                                        {seasonData.isActive ? "Ativa" : "Finalizada"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Estatísticas da temporada */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatCard 
                                        icon={<Sparkles size={16} />}
                                        label="XP Total"
                                        value={Math.round(seasonData.xp)}
                                        color="default"
                                    />
                                    <StatCard 
                                        icon={<BarChart3 size={16} />}
                                        label="Avaliações"
                                        value={seasonData.evaluations}
                                        color="success"
                                    />
                                    <StatCard 
                                        icon={<Star size={16} />}
                                        label="Média"
                                        value={seasonData.average.toFixed(2)}
                                        color="warning"
                                    />
                                    <StatCard 
                                        icon={<Trophy size={16} />}
                                        label="Conquistas"
                                        value={seasonData.achievements.length}
                                        color="default"
                                    />
                                </div>

                                {/* Conquistas da temporada */}
                                {seasonData.achievements.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <Trophy className="h-4 w-4" />
                                            Conquistas Desbloqueadas ({seasonData.achievements.length})
                                        </h4>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            {seasonData.achievements.map((achievement: any) => {
                                                const config = achievements.find(a => a.id === achievement.achievementId);
                                                return config ? (
                                                    <div key={achievement.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <div className="text-lg">{config.icon}</div>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{config.title}</p>
                                                            <p className="text-xs text-muted-foreground">{config.description}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <Badge variant="secondary" className="text-xs">+{config.xp} XP</Badge>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {format(new Date(achievement.unlockedAt), "dd/MM", { locale: ptBR })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Distribuição de notas da temporada */}
                                {seasonData.evaluations > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4" />
                                            Distribuição de Notas
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.entries(seasonData.ratingDistribution).map(([rating, count]: [string, any]) => (
                                                <div key={rating} className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 w-12">
                                                        <span className="text-sm font-medium">{rating}</span>
                                                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                                    </div>
                                                    <Progress 
                                                        value={seasonData.evaluations > 0 ? (count / seasonData.evaluations) * 100 : 0} 
                                                        className="flex-1 h-2" 
                                                    />
                                                    <span className="text-sm text-muted-foreground w-8">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    
                    {stats.seasonHistory.length === 0 && (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">Nenhum histórico encontrado</h3>
                                <p className="text-muted-foreground">Este atendente ainda não possui dados em temporadas anteriores.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="xp-events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Histórico Completo de XP
                            </CardTitle>
                            <CardDescription>Todos os eventos que geraram pontos de experiência</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Evento</TableHead>
                                        <TableHead>Temporada</TableHead>
                                        <TableHead>Pontos</TableHead>
                                        <TableHead className="text-right">Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {xpEvents
                                        .filter(e => e.attendantId === id)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((event, index) => {
                                            const eventSeason = seasons?.find(s => s.id === event.seasonId);
                                            return (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {event.type === 'ACHIEVEMENT' ? (
                                                                <Trophy className="h-4 w-4 text-amber-500" />
                                                            ) : (
                                                                <Star className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                            <span>{event.reason}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {eventSeason ? (
                                                            <Badge variant="outline" className="text-xs">
                                                                {eventSeason.name}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={event.points >= 0 ? 'secondary' : 'destructive'} className="flex items-center gap-1 w-fit">
                                                            {event.points >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                            {event.points >= 0 ? `+${Math.round(event.points)}` : Math.round(event.points)} XP
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm text-muted-foreground">
                                                        {format(new Date(event.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
