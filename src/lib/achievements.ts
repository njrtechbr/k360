

import type { Achievement, Attendant, Evaluation, EvaluationAnalysis, LevelReward } from './types';
import {
    Award, BarChart, BadgeCent, Crown, Sparkles, Target, Trophy, Zap, Rocket, StarHalf, Users, Smile, HeartHandshake, Gem, Medal, MessageSquareQuote, MessageSquarePlus, MessageSquareHeart, MessageSquareWarning, TrendingUp, ShieldCheck, Star, Component, Braces, UserCheck, BookOpen
} from "lucide-react";


const getAttendantSentimentCounts = (attendantId: string, evaluations: Evaluation[], analysisResults: EvaluationAnalysis[]) => {
    const attendantEvaluationIds = new Set(evaluations.map(e => e.id));
    return analysisResults
        .filter(ar => attendantEvaluationIds.has(ar.evaluationId))
        .reduce((acc, ar) => {
            acc[ar.sentiment] = (acc[ar.sentiment] || 0) + 1;
            return acc;
        }, {} as Record<EvaluationAnalysis['sentiment'], number>);
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "primeira-impressao",
    title: "Primeira Impressão",
    description: "Receba sua primeira avaliação",
    icon: Sparkles,
    color: "text-orange-500",
    xp: 10,
    active: true,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 1,
  },
  {
    id: "ia-primeiro-positivo",
    title: "Feedback Positivo (IA)",
    description: "Receba um comentário analisado como 'Positivo' pela IA.",
    icon: MessageSquareHeart,
    color: "text-green-500",
    xp: 25,
    active: true,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Positivo ?? 0) >= 1;
    },
  },
  {
    id: "ganhando-ritmo",
    title: "Ganhando Ritmo",
    description: "Receba 10 avaliações",
    icon: Target,
    color: "text-cyan-500",
    xp: 50,
    active: true,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 10,
  },
  {
    id: 'trinca-perfeita',
    title: 'Trinca Perfeita',
    description: 'Receba 3 avaliações de 5 estrelas consecutivas',
    icon: Smile,
    color: 'text-pink-400',
    xp: 100,
    active: true,
    isUnlocked: (attendant, evaluations) => {
      const sortedEvals = [...evaluations].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      let consecutiveFives = 0;
      for (const ev of sortedEvals) {
        if (ev.nota === 5) {
          consecutiveFives++;
          if (consecutiveFives >= 3) return true;
        } else {
          consecutiveFives = 0;
        }
      }
      return false;
    },
  },
  {
    id: "ia-ouvinte-atento",
    title: "Ouvinte Atento (IA)",
    description: "Receba um comentário 'Negativo', mostrando abertura a críticas.",
    icon: MessageSquareWarning,
    color: "text-amber-500",
    xp: 75,
    active: true,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Negativo ?? 0) >= 1;
    },
  },
  {
    id: "veterano",
    title: "Veterano",
    description: "Receba 50 avaliações",
    icon: BadgeCent,
    color: "text-gray-500",
    xp: 150,
    active: true,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 50,
  },
  {
    id: "ia-querido-critica",
    title: "Querido pela Crítica (IA)",
    description: "Receba 10 comentários 'Positivos' pela IA.",
    icon: MessageSquarePlus,
    color: "text-emerald-500",
    xp: 200,
    active: true,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Positivo ?? 0) >= 10;
    },
  },
  {
    id: "centuriao",
    title: "Centurião",
    description: "Receba 100 avaliações",
    icon: Trophy,
    color: "text-yellow-500",
    xp: 300,
    active: true,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 100,
  },
  {
    id: "satisfacao-garantida",
    title: "Satisfação Garantida",
    description: "Atingir 90% de avaliações positivas (4-5 estrelas)",
    icon: TrendingUp,
    color: "text-green-500",
    xp: 500,
    active: true,
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 20) return false; // Mínimo de 20 avaliações
      const positiveCount = evaluations.filter(ev => ev.nota >= 4).length;
      return (positiveCount / evaluations.length) * 100 >= 90;
    },
  },
  {
    id: "excelencia",
    title: "Excelência Consistente",
    description: "Manter nota média acima de 4.5 com 50+ avaliações",
    icon: Award,
    color: "text-yellow-600",
    xp: 750,
    active: true,
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 50) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg > 4.5;
    },
  },
  {
    id: "imparavel",
    title: "Imparável",
    description: "Receba 250 avaliações",
    icon: Zap,
    color: "text-blue-500",
    xp: 1000,
    active: true,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 250,
  },
  {
    id: "perfeicao",
    title: "Busca pela Perfeição",
    description: "Mantenha nota média 5.0 com pelo menos 25 avaliações",
    icon: Crown,
    color: "text-purple-500",
    xp: 1500,
    active: true,
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 25) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg === 5;
    },
  },
  {
    id: 'mestre-qualidade',
    title: 'Mestre da Qualidade',
    description: 'Receba 50 avaliações de 5 estrelas',
    icon: Gem,
    color: 'text-sky-400',
    xp: 1200,
    active: true,
    isUnlocked: (attendant, evaluations) => {
      return evaluations.filter(ev => ev.nota === 5).length >= 50;
    },
  },
  {
    id: "ia-mestre-resiliencia",
    title: "Mestre da Resiliência (IA)",
    description: "Receba 5 comentários 'Negativos' e continue melhorando.",
    icon: MessageSquareWarning,
    color: "text-red-500",
    xp: 500,
    active: true,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Negativo ?? 0) >= 5;
    },
  },
  {
    id: "lenda",
    title: "Lenda do Atendimento",
    description: "Receba 500 avaliações",
    icon: Rocket,
    color: "text-red-500",
    xp: 2500,
    active: true,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 500,
  },
];


export const INITIAL_LEVEL_REWARDS: LevelReward[] = [
    {
        level: 1,
        title: "Iniciante",
        description: "Você começou sua jornada!",
        icon: ShieldCheck,
        color: "text-gray-400",
        active: true,
    },
    {
        level: 5,
        title: "Selo de Bronze",
        description: "Reconhecimento pelo seu esforço inicial.",
        icon: Medal,
        color: "text-orange-400",
        active: true,
    },
    {
        level: 10,
        title: "Especialista em Treinamento",
        description: "Acesso a novos materiais de treinamento.",
        icon: BookOpen,
        color: "text-blue-400",
        active: true,
    },
    {
        level: 15,
        title: "Selo de Prata",
        description: "Um marco de consistência e qualidade.",
        icon: Medal,
        color: "text-gray-400",
        active: true,
    },
    {
        level: 20,
        title: "Mentor de Pares",
        description: "Convidado para ajudar no treinamento de novos colegas.",
        icon: Users,
        color: "text-green-500",
        active: true,
    },
    {
        level: 25,
        title: "Selo de Ouro",
        description: "Prova de sua dedicação e excelência.",
        icon: Medal,
        color: "text-yellow-400",
        active: true,
    },
    {
        level: 30,
        title: "Embaixador da Marca",
        description: "Represente a equipe em eventos internos.",
        icon: UserCheck,
        color: "text-indigo-500",
        active: true,
    },
    {
        level: 40,
        title: "Selo de Platina",
        description: "Um dos pilares da excelência no atendimento.",
        icon: Medal,
        color: "text-cyan-400",
        active: true,
    },
    {
        level: 50,
        title: "Lenda do Atendimento",
        description: "Você alcançou o auge da maestria!",
        icon: Crown,
        color: "text-purple-500",
        active: true,
    }
];
