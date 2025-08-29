
import type { Achievement, Attendant, Evaluation, EvaluationAnalysis } from './types';
import {
    Award, BarChart, BadgeCent, Crown, Sparkles, Target, Trophy, Zap, Rocket, StarHalf, Users, Smile, HeartHandshake, Gem, Medal, MessageSquareQuote, MessageSquarePlus, MessageSquareHeart, MessageSquareWarning
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

export const achievements: Achievement[] = [
  // --- Nível 1 ---
  {
    id: "primeira-impressao",
    title: "Primeira Impressão",
    description: "Receba sua primeira avaliação",
    icon: Sparkles,
    color: "text-orange-500",
    level: 1,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 1,
  },
  // --- Nível 2 ---
  {
    id: "ia-primeiro-positivo",
    title: "Feedback Positivo (IA)",
    description: "Receba um comentário analisado como 'Positivo' pela IA.",
    icon: MessageSquareHeart,
    color: "text-green-500",
    level: 2,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Positivo ?? 0) >= 1;
    },
  },
  // --- Nível 3 ---
  {
    id: "ganhando-ritmo",
    title: "Ganhando Ritmo",
    description: "Receba 10 avaliações",
    icon: Target,
    color: "text-cyan-500",
    level: 3,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 10,
  },
  // --- Nível 5 ---
  {
    id: 'trinca-perfeita',
    title: 'Trinca Perfeita',
    description: 'Receba 3 avaliações de 5 estrelas consecutivas',
    icon: Smile,
    color: 'text-pink-400',
    level: 5,
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
  // --- Nível 7 ---
  {
    id: "ia-ouvinte-atento",
    title: "Ouvinte Atento (IA)",
    description: "Receba um comentário 'Negativo', mostrando abertura a críticas.",
    icon: MessageSquareWarning,
    color: "text-amber-500",
    level: 7,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Negativo ?? 0) >= 1;
    },
  },
  // --- Nível 10 ---
  {
    id: "veterano",
    title: "Veterano",
    description: "Receba 50 avaliações",
    icon: BadgeCent,
    color: "text-gray-500",
    level: 10,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 50,
  },
  // --- Nível 12 ---
  {
    id: "ia-querido-critica",
    title: "Querido pela Crítica (IA)",
    description: "Receba 10 comentários 'Positivos' pela IA.",
    icon: MessageSquarePlus,
    color: "text-emerald-500",
    level: 12,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Positivo ?? 0) >= 10;
    },
  },
  // --- Nível 15 ---
  {
    id: "centuriao",
    title: "Centurião",
    description: "Receba 100 avaliações",
    icon: Trophy,
    color: "text-yellow-500",
    level: 15,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 100,
  },
  // --- Nível 18 ---
  {
    id: "satisfacao-garantida",
    title: "Satisfação Garantida",
    description: "Atingir 90% de avaliações positivas (4-5 estrelas)",
    icon: TrendingUp,
    color: "text-green-500",
    level: 18,
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 20) return false; // Mínimo de 20 avaliações
      const positiveCount = evaluations.filter(ev => ev.nota >= 4).length;
      return (positiveCount / evaluations.length) * 100 >= 90;
    },
  },
  // --- Nível 20 ---
  {
    id: "excelencia",
    title: "Excelência Consistente",
    description: "Manter nota média acima de 4.5 com 50+ avaliações",
    icon: Award,
    color: "text-yellow-600",
    level: 20,
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 50) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg > 4.5;
    },
  },
  // --- Nível 25 ---
  {
    id: "imparavel",
    title: "Imparável",
    description: "Receba 250 avaliações",
    icon: Zap,
    color: "text-blue-500",
    level: 25,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 250,
  },
  // --- Nível 30 ---
  {
    id: "perfeicao",
    title: "Busca pela Perfeição",
    description: "Mantenha nota média 5.0 com pelo menos 25 avaliações",
    icon: Crown,
    color: "text-purple-500",
    level: 30,
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 25) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg === 5;
    },
  },
  // --- Nível 35 ---
  {
    id: 'mestre-qualidade',
    title: 'Mestre da Qualidade',
    description: 'Receba 50 avaliações de 5 estrelas',
    icon: Gem,
    color: 'text-sky-400',
    level: 35,
    isUnlocked: (attendant, evaluations) => {
      return evaluations.filter(ev => ev.nota === 5).length >= 50;
    },
  },
  // --- Nível 40 ---
  {
    id: "ia-mestre-resiliencia",
    title: "Mestre da Resiliência (IA)",
    description: "Receba 5 comentários 'Negativos' e continue melhorando.",
    icon: MessageSquareWarning,
    color: "text-red-500",
    level: 40,
    isUnlocked: (attendant, evaluations, allEval, allAtt, analysis) => {
        if (!analysis) return false;
        const counts = getAttendantSentimentCounts(attendant.id, evaluations, analysis);
        return (counts.Negativo ?? 0) >= 5;
    },
  },
  // --- Nível 50 ---
  {
    id: "lenda",
    title: "Lenda do Atendimento",
    description: "Receba 500 avaliações",
    icon: Rocket,
    color: "text-red-500",
    level: 50,
    isUnlocked: (attendant, evaluations) => evaluations.length >= 500,
  },
];
