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

export async function GET(
  request: NextRequest,
  { params }: { params: { attendantId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { attendantId } = params;

    if (!attendantId) {
      return NextResponse.json(
        { error: "attendantId é obrigatório" },
        { status: 400 },
      );
    }

    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId },
    });

    if (!attendant) {
      return NextResponse.json(
        { error: "Atendente não encontrado" },
        { status: 404 },
      );
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { attendantId },
      orderBy: { data: "asc" },
    });

    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { active: true },
    });

    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      where: { attendantId },
    });

    const unlockedMap = new Map(
      unlockedAchievements.map((ua) => [ua.achievementId, ua]),
    );

    const result = achievementConfigs.map((config) => {
      const unlocked = unlockedMap.get(config.id);
      const rule =
        ACHIEVEMENT_RULES[config.id as keyof typeof ACHIEVEMENT_RULES];

      let progress = 0;

      // Calcular progresso baseado no tipo de conquista
      if (rule) {
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

          progress = Math.min(100, (evaluations.length / requiredCount) * 100);
        } else if (config.id === "mestre-qualidade") {
          const fiveStarCount = evaluations.filter((e) => e.nota === 5).length;
          progress = Math.min(100, (fiveStarCount / 50) * 100);
        } else if (config.id === "satisfacao-garantida") {
          if (evaluations.length >= 10) {
            const positiveEvals = evaluations.filter((e) => e.nota >= 4);
            const percentage =
              (positiveEvals.length / evaluations.length) * 100;
            progress = percentage >= 90 ? 100 : percentage;
          }
        } else if (rule(attendant, evaluations)) {
          progress = 100;
        }
      }

      return {
        config,
        isUnlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt?.toISOString(),
        progress: Math.round(progress),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao obter status das conquistas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
