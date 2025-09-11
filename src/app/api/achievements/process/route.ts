import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ProcessRequestSchema = z.object({
  attendantIds: z.array(z.string()).optional(),
  seasonId: z.string().optional(),
  forceReprocess: z.boolean().default(false),
});

export interface ProcessResult {
  attendantsProcessed: number;
  achievementsUnlocked: number;
  xpAwarded: number;
  errors: string[];
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

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem processar conquistas
    if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Acesso negado. Apenas administradores podem processar conquistas.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { attendantIds, seasonId, forceReprocess } =
      ProcessRequestSchema.parse(body);

    // Buscar temporada atual se não especificada
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

    // Buscar atendentes para processar
    let attendantsToProcess;
    if (attendantIds && attendantIds.length > 0) {
      attendantsToProcess = await prisma.attendant.findMany({
        where: { id: { in: attendantIds } },
      });
    } else {
      attendantsToProcess = await prisma.attendant.findMany({
        where: { active: true },
      });
    }

    if (attendantsToProcess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum atendente encontrado para processar",
        },
        { status: 400 },
      );
    }

    const result: ProcessResult = {
      attendantsProcessed: 0,
      achievementsUnlocked: 0,
      xpAwarded: 0,
      errors: [],
    };

    // Processar cada atendente
    for (const attendant of attendantsToProcess) {
      try {
        const attendantResult = await processAchievementsForAttendant(
          attendant.id,
          targetSeason,
          forceReprocess,
        );

        result.attendantsProcessed++;
        result.achievementsUnlocked += attendantResult.achievementsUnlocked;
        result.xpAwarded += attendantResult.xpAwarded;
      } catch (error: any) {
        const errorMsg = `Erro ao processar ${attendant.name}: ${error.message}`;
        result.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Erro no processamento de conquistas:", error);

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
        error: "Falha no processamento de conquistas",
      },
      { status: 500 },
    );
  }
}

/**
 * Processa conquistas para um atendente específico
 */
async function processAchievementsForAttendant(
  attendantId: string,
  season: any,
  forceReprocess: boolean = false,
): Promise<{ achievementsUnlocked: number; xpAwarded: number }> {
  console.log(`🏆 Processando conquistas para atendente: ${attendantId}`);

  // Buscar conquistas ativas
  const achievements = await prisma.achievementConfig.findMany({
    where: { active: true },
  });

  // Buscar conquistas já desbloqueadas na temporada atual
  const unlockedAchievements = await prisma.unlockedAchievement.findMany({
    where: {
      attendantId,
      seasonId: season.id,
    },
  });

  const unlockedIds = new Set(
    unlockedAchievements.map((ua) => ua.achievementId),
  );
  let newUnlocks = 0;
  let totalXpAwarded = 0;

  // Verificar cada conquista
  for (const achievement of achievements) {
    if (!forceReprocess && unlockedIds.has(achievement.id)) {
      continue; // Já desbloqueada nesta temporada
    }

    const shouldUnlock = await checkAchievementCriteria(
      attendantId,
      achievement.id,
      season,
    );

    if (shouldUnlock) {
      try {
        // Se forceReprocess, deletar conquista existente primeiro
        if (forceReprocess && unlockedIds.has(achievement.id)) {
          await prisma.unlockedAchievement.deleteMany({
            where: {
              attendantId,
              achievementId: achievement.id,
              seasonId: season.id,
            },
          });
        }

        await prisma.unlockedAchievement.create({
          data: {
            attendantId,
            achievementId: achievement.id,
            seasonId: season.id,
            unlockedAt: new Date(),
            xpGained: achievement.xp,
          },
        });

        console.log(`✅ Conquista desbloqueada: ${achievement.title}`);
        newUnlocks++;
        totalXpAwarded += achievement.xp;
      } catch (error: any) {
        if (!error.message?.includes("Unique constraint")) {
          throw error;
        }
      }
    }
  }

  if (newUnlocks > 0) {
    console.log(`🎉 ${newUnlocks} novas conquistas desbloqueadas`);
  }

  return { achievementsUnlocked: newUnlocks, xpAwarded: totalXpAwarded };
}

/**
 * Verifica os critérios de uma conquista para um atendente na temporada
 */
async function checkAchievementCriteria(
  attendantId: string,
  achievementId: string,
  season: any,
): Promise<boolean> {
  try {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    // Buscar dados da temporada atual
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

    // Verificar critérios baseados no ID da conquista
    switch (achievementId) {
      case "first_evaluation":
        return evaluationCount >= 1;

      case "ten_evaluations":
        return evaluationCount >= 10;

      case "fifty_evaluations":
        return evaluationCount >= 50;

      case "hundred_evaluations":
        return evaluationCount >= 100;

      case "hundred_xp":
        return seasonXp >= 100;

      case "thousand_xp":
        return seasonXp >= 1000;

      case "five_thousand_xp":
        return seasonXp >= 5000;

      case "ten_thousand_xp":
        return seasonXp >= 10000;

      case "five_star_streak_5":
        return checkFiveStarStreak(seasonEvaluations, 5);

      case "five_star_streak_10":
        return checkFiveStarStreak(seasonEvaluations, 10);

      case "high_average_50":
        return checkHighAverage(seasonEvaluations, 4.5, 50);

      default:
        return false;
    }
  } catch (error) {
    console.error(`Erro ao verificar critérios para ${achievementId}:`, error);
    return false;
  }
}

/**
 * Verifica a sequência de avaliações 5 estrelas
 */
function checkFiveStarStreak(
  evaluations: any[],
  requiredStreak: number,
): boolean {
  if (evaluations.length < requiredStreak) {
    return false;
  }

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

  return maxStreak >= requiredStreak;
}

/**
 * Verifica média alta com mínimo de avaliações
 */
function checkHighAverage(
  evaluations: any[],
  requiredAverage: number,
  minEvaluations: number,
): boolean {
  if (evaluations.length < minEvaluations) {
    return false;
  }

  const average =
    evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
  return average >= requiredAverage;
}
