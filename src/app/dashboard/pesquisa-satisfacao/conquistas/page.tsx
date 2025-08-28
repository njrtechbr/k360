
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo } from "react";
import { Award, BarChart, BadgeCent, Star as StarIcon, TrendingUp, Crown, Sparkles, Target, Trophy, Zap, Rocket, StarHalf, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Attendant, Evaluation } from "@/lib/types";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  isUnlocked: (attendant: Attendant, evaluations: Evaluation[], allEvaluations: Evaluation[], allAttendants: Attendant[]) => boolean;
};

const achievements: Achievement[] = [
  {
    id: "primeira-impressao",
    title: "Primeira Impressão",
    description: "Receba sua primeira avaliação",
    icon: Sparkles,
    color: "text-orange-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 1,
  },
  {
    id: "ganhando-ritmo",
    title: "Ganhando Ritmo",
    description: "Receba 10 avaliações",
    icon: Target,
    color: "text-cyan-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 10,
  },
  {
    id: "veterano",
    title: "Veterano",
    description: "Receba 50 avaliações",
    icon: BadgeCent,
    color: "text-gray-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 50,
  },
  {
    id: "centuriao",
    title: "Centurião",
    description: "Receba 100 avaliações",
    icon: Trophy,
    color: "text-yellow-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 100,
  },
  {
    id: "imparavel",
    title: "Imparável",
    description: "Receba 250 avaliações",
    icon: Zap,
    color: "text-blue-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 250,
  },
  {
    id: "lenda",
    title: "Lenda do Atendimento",
    description: "Receba 500 avaliações",
    icon: Rocket,
    color: "text-red-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 500,
  },
  {
    id: "perfeicao",
    title: "Perfeição",
    description: "Mantenha nota média 5.0 com pelo menos 10 avaliações",
    icon: Crown,
    color: "text-purple-500",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 10) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg === 5;
    },
  },
  {
    id: "excelencia",
    title: "Excelência",
    description: "Mantenha nota média acima de 4.5",
    icon: Award,
    color: "text-yellow-600",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length === 0) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg > 4.5;
    },
  },
  {
    id: "satisfacao-garantida",
    title: "Satisfação Garantida",
    description: "90% de avaliações positivas (4-5 estrelas)",
    icon: TrendingUp,
    color: "text-green-500",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length === 0) return false;
      const positiveCount = evaluations.filter(ev => ev.nota >= 4).length;
      return (positiveCount / evaluations.length) * 100 >= 90;
    },
  },
  {
    id: "favorito-da-galera",
    title: "Favorito da Galera",
    description: "Seja o atendente com o maior número de avaliações",
    icon: Users,
    color: "text-pink-500",
    isUnlocked: (attendant, evaluations, allEvaluations) => {
      if (evaluations.length === 0) return false;
      const evaluationCounts = allEvaluations.reduce((acc, ev) => {
        acc[ev.attendantId] = (acc[ev.attendantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxEvaluations = Math.max(...Object.values(evaluationCounts));
      
      return evaluationCounts[attendant.id] === maxEvaluations;
    }
  },
  {
    id: 'astro-em-ascensao',
    title: 'Astro em Ascensão',
    description: 'Tenha a melhor nota média (mínimo 20 avaliações)',
    icon: StarHalf,
    color: 'text-teal-500',
    isUnlocked: (attendant, evaluations, allEvaluations, allAttendants) => {
      if (evaluations.length < 20) return false;

      const attendantStats = allAttendants.map(att => {
        const attEvals = allEvaluations.filter(e => e.attendantId === att.id);
        if (attEvals.length === 0) return { id: att.id, avgRating: 0, count: 0 };
        const totalRating = attEvals.reduce((sum, ev) => sum + ev.nota, 0);
        return { id: att.id, avgRating: totalRating / attEvals.length, count: attEvals.length };
      });

      const eligibleAttendants = attendantStats.filter(s => s.count >= 20);
      if (eligibleAttendants.length === 0) return false;

      const maxAvgRating = Math.max(...eligibleAttendants.map(a => a.avgRating));
      const currentAttendantAvg = attendantStats.find(a => a.id === attendant.id)?.avgRating;

      return currentAttendantAvg === maxAvgRating;
    },
  },
  {
    id: "consistente",
    title: "Consistente",
    description: "Receba avaliações por 7 dias consecutivos",
    icon: BarChart,
    color: "text-indigo-500",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 7) return false;
        
      const dates = evaluations.map(e => new Date(e.data).toDateString()).sort();
      const uniqueDates = [...new Set(dates)];
      
      if (uniqueDates.length < 7) return false;

      for (let i = 0; i < uniqueDates.length - 6; i++) {
        let consecutiveDays = 1;
        let lastDate = new Date(uniqueDates[i]);

        for (let j = i + 1; j < uniqueDates.length; j++) {
            const currentDate = new Date(uniqueDates[j]);
            const diffTime = lastDate.getTime() - currentDate.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);

            if (diffDays === 1) {
                consecutiveDays++;
                lastDate = currentDate;
            } else if (diffDays > 1) {
                consecutiveDays = 1;
                lastDate = currentDate;
            }
            if (consecutiveDays >= 7) return true;
        }
      }

      return false;
    },
  },
];

export default function AchievementsPage() {
  const { user, isAuthenticated, loading, attendants, evaluations } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  const achievementStats = useMemo(() => {
    return achievements.map(achievement => {
      let unlockedCount = 0;
      attendants.forEach(attendant => {
        const attendantEvaluations = evaluations.filter(ev => ev.attendantId === attendant.id);
        if (achievement.isUnlocked(attendant, attendantEvaluations, evaluations, attendants)) {
          unlockedCount++;
        }
      });
      return {
        ...achievement,
        unlockedCount,
        totalAttendants: attendants.length,
        progress: attendants.length > 0 ? (unlockedCount / attendants.length) * 100 : 0,
      };
    });
  }, [attendants, evaluations]);

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Conquistas Disponíveis</h1>
        <p className="text-muted-foreground">Objetivos que os atendentes podem alcançar para ganhar reconhecimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {achievementStats.map(ach => (
          <Card key={ach.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`p-2 bg-muted rounded-full ${ach.unlockedCount > 0 ? ach.color : 'text-muted-foreground'}`}>
                  <ach.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{ach.title}</CardTitle>
                  <CardDescription>{ach.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {ach.unlockedCount} de {ach.totalAttendants} atendentes desbloquearam
                </p>
                <Progress value={ach.progress} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
