import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Attendant, Evaluation, AchievementConfig } from "@/lib/types";

// Definir as regras de conquistas
const ACHIEVEMENT_RULES = {
  "primeira-impressao": (attendant: Attendant, evaluations: Evaluation[]) => {
    return evaluations.length >= 1;
  },

  "ganhando-ritmo": (attendant: Attendant, evaluations: Evaluation[]) => {
    return evaluations.length >= 10;
  },

  veterano: (attendant: Attendant, evaluations: Evaluation[]) => {
    return evaluations.length >= 50;
  },

  centuriao: (attendant: Attendant, evaluations: Evaluation[]) => {
    return evaluations.length >= 100;
  },

  imparavel: (attendant: Attendant, evaluations: Evaluation[]) => {
    return evaluations.length >= 250;
  },

  lenda: (attendant: Attendant, evaluations: Evaluation[]) => {
    return evaluations.length >= 500;
  },

  "trinca-perfeita": (attendant: Attendant, evaluations: Evaluation[]) => {
    // 3 avaliações de 5 estrelas consecutivas
    for (let i = 0; i <= evaluations.length - 3; i++) {
      const consecutive = evaluations.slice(i, i + 3);
      if (consecutive.every((evaluation) => evaluation.nota === 5)) {
        return true;
      }
    }
    return false;
  },

  "mestre-qualidade": (attendant: Attendant, evaluations: Evaluation[]) => {
    const fiveStarEvals = evaluations.filter(
      (evaluation) => evaluation.nota === 5,
    );
    return fiveStarEvals.length >= 50;
  },

  "satisfacao-garantida": (attendant: Attendant, evaluations: Evaluation[]) => {
    if (evaluations.length < 10) return false;
    const positiveEvals = evaluations.filter(
      (evaluation) => evaluation.nota >= 4,
    );
    const percentage = (positiveEvals.length / evaluations.length) * 100;
    return percentage >= 90;
  },

  excelencia: (attendant: Attendant, evaluations: Evaluation[]) => {
    if (evaluations.length < 50) return false;
    const totalNota = evaluations.reduce(
      (sum, evaluation) => sum + evaluation.nota,
      0,
    );
    const average = totalNota / evaluations.length;
    return average >= 4.5;
  },

  perfeicao: (attendant: Attendant, evaluations: Evaluation[]) => {
    if (evaluations.length < 25) return false;
    const totalNota = evaluations.reduce(
      (sum, evaluation) => sum + evaluation.nota,
      0,
    );
    const average = totalNota / evaluations.length;
    return average === 5.0;
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { attendantId, evaluationDate } = await request.json();

    if (!attendantId || !evaluationDate) {
      return NextResponse.json(
        { error: "attendantId e evaluationDate são obrigatórios" },
        { status: 400 },
      );
    }

    const newEvaluationDate = new Date(evaluationDate);

    // Buscar o atendente
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId },
    });

    if (!attendant) {
      return NextResponse.json(
        { error: "Atendente não encontrado" },
        { status: 404 },
      );
    }

    // Buscar todas as avaliações do atendente ordenadas por data
    const evaluations = await prisma.evaluation.findMany({
      where: { attendantId },
      orderBy: { data: "asc" },
    });

    // Buscar configurações de conquistas ativas
    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { active: true },
    });

    // Buscar conquistas já desbloqueadas
    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      where: { attendantId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(
      unlockedAchievements.map((ua) => ua.achievementId),
    );
    const newAchievements: Array<{
      config: AchievementConfig;
      xpAwarded: number;
    }> = [];
    let totalXpAwarded = 0;

    // Verificar cada conquista
    for (const config of achievementConfigs) {
      // Pular se já foi desbloqueada
      if (unlockedIds.has(config.id)) {
        continue;
      }

      const rule =
        ACHIEVEMENT_RULES[config.id as keyof typeof ACHIEVEMENT_RULES];

      if (!rule) {
        console.log(`Regra não implementada para: ${config.id}`);
        continue;
      }

      // Verificar se a regra é atendida
      if (rule(attendant, evaluations)) {
        console.log(
          `Desbloqueando conquista: ${config.title} para ${attendant.name}`,
        );

        // Encontrar a data de desbloqueio
        let unlockDate = newEvaluationDate;

        // Para conquistas baseadas em quantidade, encontrar a avaliação que completou
        if (
          [
            "primeira-impressao",
            "ganhando-ritmo",
            "veterano",
            "centuriao",
            "imparavel",
            "lenda",
          ].includes(config.id)
        ) {
          const requiredCount = {
            "primeira-impressao": 1,
            "ganhando-ritmo": 10,
            veterano: 50,
            centuriao: 100,
            imparavel: 250,
            lenda: 500,
          }[config.id];

          if (evaluations.length >= requiredCount) {
            unlockDate = evaluations[requiredCount - 1].data;
          }
        }

        // Criar registro de conquista desbloqueada
        await prisma.unlockedAchievement.create({
          data: {
            attendantId,
            achievementId: config.id,
            unlockedAt: unlockDate,
            xpGained: config.xp,
          },
        });

        // Criar evento XP para a conquista
        await prisma.xpEvent.create({
          data: {
            attendantId,
            points: config.xp,
            basePoints: config.xp,
            multiplier: 1,
            reason: `Conquista desbloqueada: ${config.title}`,
            type: "achievement",
            relatedId: config.id,
            date: unlockDate,
          },
        });

        newAchievements.push({ config, xpAwarded: config.xp });
        totalXpAwarded += config.xp;
      }
    }

    return NextResponse.json({ newAchievements, totalXpAwarded });
  } catch (error) {
    console.error("Erro ao verificar e desbloquear conquistas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
