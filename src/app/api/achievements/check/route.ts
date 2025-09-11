import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CheckRequestSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
  achievementId: z.string().min(1, "ID da conquista é obrigatório"),
  seasonId: z.string().optional(),
});

export interface CheckResult {
  attendantId: string;
  achievementId: string;
  seasonId: string;
  meetsRequirements: boolean;
  isAlreadyUnlocked: boolean;
  progress: {
    current: number;
    required: number;
    percentage: number;
  };
  details: {
    evaluationCount: number;
    seasonXp: number;
    averageRating: number;
    fiveStarCount: number;
    maxStreak: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { attendantId, achievementId, seasonId } =
      CheckRequestSchema.parse(body);

    // Verificar se o atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId },
      include: { user: true },
    });

    if (!attendant) {
      return NextResponse.json(
        {
          success: false,
          error: "Atendente não encontrado",
        },
        { status: 404 },
      );
    }

    // Verificar permissões
    const userRole = session.user.role;
    if (!["ADMIN", "SUPERADMIN"].includes(userRole)) {
      if (attendant.userId !== session.user.id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Você só pode verificar conquistas dos seus próprios atendentes",
          },
          { status: 403 },
        );
      }
    }

    // Verificar se a conquista existe
    const achievement = await prisma.achievementConfig.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return NextResponse.json(
        {
          success: false,
          error: "Conquista não encontrada",
        },
        { status: 404 },
      );
    }

    // Buscar temporada
    let targetSeason;
    if (seasonId) {
      targetSeason = await prisma.gamificationSeason.findUnique({
        where: { id: seasonId },
      });

      if (!targetSeason) {
        return NextResponse.json(
          {
            success: false,
            error: "Temporada não encontrada",
          },
          { status: 404 },
        );
      }
    } else {
      targetSeason = await prisma.gamificationSeason.findFirst({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!targetSeason) {
        return NextResponse.json(
          {
            success: false,
            error: "Nenhuma temporada ativa encontrada",
          },
          { status: 400 },
        );
      }
    }

    // Verificar se já foi desbloqueada
    const existingUnlock = await prisma.unlockedAchievement.findFirst({
      where: {
        attendantId,
        achievementId,
        seasonId: targetSeason.id,
      },
    });

    // Buscar dados da temporada
    const seasonStart = new Date(targetSeason.startDate);
    const seasonEnd = new Date(targetSeason.endDate);

    const seasonEvaluations = await prisma.evaluation.findMany({
      where: {
        attendantId,
        data: {
          gte: seasonStart,
          lte: seasonEnd,
        },
      },
      orderBy: { data: "asc" },
    });

    const seasonXpEvents = await prisma.xpEvent.findMany({
      where: {
        attendantId,
        date: {
          gte: seasonStart,
          lte: seasonEnd,
        },
      },
    });

    const evaluationCount = seasonEvaluations.length;
    const seasonXp = seasonXpEvents.reduce(
      (sum, event) => sum + (event.points || 0),
      0,
    );
    const averageRating =
      evaluationCount > 0
        ? seasonEvaluations.reduce((sum, e) => sum + e.nota, 0) /
          evaluationCount
        : 0;
    const fiveStarCount = seasonEvaluations.filter((e) => e.nota === 5).length;
    const maxStreak = calculateMaxStreak(seasonEvaluations);

    // Verificar critérios e calcular progresso
    const { meetsRequirements, progress } = checkAchievementProgress(
      achievementId,
      {
        evaluationCount,
        seasonXp,
        averageRating,
        fiveStarCount,
        maxStreak,
        evaluations: seasonEvaluations,
      },
    );

    const result: CheckResult = {
      attendantId,
      achievementId,
      seasonId: targetSeason.id,
      meetsRequirements,
      isAlreadyUnlocked: !!existingUnlock,
      progress,
      details: {
        evaluationCount,
        seasonXp,
        averageRating: Math.round(averageRating * 100) / 100,
        fiveStarCount,
        maxStreak,
      },
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Erro na verificação de conquista:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Falha na verificação de conquista",
      },
      { status: 500 },
    );
  }
} /**
 *
 Verifica critérios de conquista e calcula progresso
 */
function checkAchievementProgress(
  achievementId: string,
  data: {
    evaluationCount: number;
    seasonXp: number;
    averageRating: number;
    fiveStarCount: number;
    maxStreak: number;
    evaluations: any[];
  },
): {
  meetsRequirements: boolean;
  progress: { current: number; required: number; percentage: number };
} {
  let current = 0;
  let required = 0;
  let meetsRequirements = false;

  switch (achievementId) {
    case "first_evaluation":
      current = data.evaluationCount;
      required = 1;
      meetsRequirements = current >= required;
      break;

    case "ten_evaluations":
      current = data.evaluationCount;
      required = 10;
      meetsRequirements = current >= required;
      break;

    case "fifty_evaluations":
      current = data.evaluationCount;
      required = 50;
      meetsRequirements = current >= required;
      break;

    case "hundred_evaluations":
      current = data.evaluationCount;
      required = 100;
      meetsRequirements = current >= required;
      break;

    case "hundred_xp":
      current = data.seasonXp;
      required = 100;
      meetsRequirements = current >= required;
      break;

    case "thousand_xp":
      current = data.seasonXp;
      required = 1000;
      meetsRequirements = current >= required;
      break;

    case "five_thousand_xp":
      current = data.seasonXp;
      required = 5000;
      meetsRequirements = current >= required;
      break;

    case "ten_thousand_xp":
      current = data.seasonXp;
      required = 10000;
      meetsRequirements = current >= required;
      break;

    case "five_star_streak_5":
      current = data.maxStreak;
      required = 5;
      meetsRequirements = current >= required;
      break;

    case "five_star_streak_10":
      current = data.maxStreak;
      required = 10;
      meetsRequirements = current >= required;
      break;

    case "high_average_50":
      current =
        data.evaluationCount >= 50 ? Math.round(data.averageRating * 100) : 0;
      required = 450; // 4.5 * 100 para trabalhar com inteiros
      meetsRequirements =
        data.evaluationCount >= 50 && data.averageRating >= 4.5;
      break;

    default:
      current = 0;
      required = 1;
      meetsRequirements = false;
  }

  const percentage =
    required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0;

  return {
    meetsRequirements,
    progress: {
      current,
      required,
      percentage,
    },
  };
}

/**
 * Calcula a maior sequência de avaliações 5 estrelas
 */
function calculateMaxStreak(evaluations: any[]): number {
  let currentStreak = 0;
  let maxStreak = 0;

  for (const evaluation of evaluations) {
    if (evaluation.nota === 5) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}
