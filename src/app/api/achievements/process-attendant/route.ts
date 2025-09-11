import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ProcessAttendantRequestSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
  seasonId: z.string().optional(),
  forceReprocess: z.boolean().default(false),
});

export interface AttendantProcessResult {
  attendantId: string;
  attendantName: string;
  achievementsUnlocked: number;
  xpAwarded: number;
  newAchievements: Array<{
    id: string;
    title: string;
    xp: number;
    unlockedAt: Date;
  }>;
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

    // Verificar permissões - ADMIN, SUPERADMIN podem processar qualquer atendente
    // SUPERVISOR e USUARIO podem processar apenas seus próprios atendentes
    const userRole = session.user.role;
    if (!["ADMIN", "SUPERADMIN", "SUPERVISOR", "USUARIO"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Acesso negado",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { attendantId, seasonId, forceReprocess } =
      ProcessAttendantRequestSchema.parse(body);

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

    // Verificar se o usuário tem permissão para processar este atendente
    if (!["ADMIN", "SUPERADMIN"].includes(userRole)) {
      if (attendant.userId !== session.user.id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Você só pode processar conquistas dos seus próprios atendentes",
          },
          { status: 403 },
        );
      }
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

    console.log(
      `🏆 Processando conquistas para atendente: ${attendant.name} (${attendantId})`,
    );

    // Buscar conquistas ativas
    const achievements = await prisma.achievementConfig.findMany({
      where: { active: true },
    });

    // Buscar conquistas já desbloqueadas na temporada
    const existingUnlocked = await prisma.unlockedAchievement.findMany({
      where: {
        attendantId,
        seasonId: targetSeason.id,
      },
      include: {
        achievement: true,
      },
    });

    const unlockedIds = new Set(existingUnlocked.map((ua) => ua.achievementId));
    const newAchievements: AttendantProcessResult["newAchievements"] = [];
    let totalXpAwarded = 0;

    // Verificar cada conquista
    for (const achievement of achievements) {
      if (!forceReprocess && unlockedIds.has(achievement.id)) {
        continue; // Já desbloqueada nesta temporada
      }

      const shouldUnlock = await checkAchievementCriteria(
        attendantId,
        achievement.id,
        targetSeason,
      );

      if (shouldUnlock) {
        try {
          // Se forceReprocess, deletar conquista existente primeiro
          if (forceReprocess && unlockedIds.has(achievement.id)) {
            await prisma.unlockedAchievement.deleteMany({
              where: {
                attendantId,
                achievementId: achievement.id,
                seasonId: targetSeason.id,
              },
            });
          }

          const unlockedAt = new Date();

          await prisma.unlockedAchievement.create({
            data: {
              attendantId,
              achievementId: achievement.id,
              seasonId: targetSeason.id,
              unlockedAt,
              xpGained: achievement.xp,
            },
          });

          newAchievements.push({
            id: achievement.id,
            title: achievement.title,
            xp: achievement.xp,
            unlockedAt,
          });

          totalXpAwarded += achievement.xp;
          console.log(`✅ Conquista desbloqueada: ${achievement.title}`);
        } catch (error: any) {
          if (!error.message?.includes("Unique constraint")) {
            throw error;
          }
        }
      }
    }

    const result: AttendantProcessResult = {
      attendantId,
      attendantName: attendant.name,
      achievementsUnlocked: newAchievements.length,
      xpAwarded: totalXpAwarded,
      newAchievements,
    };

    if (newAchievements.length > 0) {
      console.log(
        `🎉 ${newAchievements.length} novas conquistas desbloqueadas para ${attendant.name}`,
      );
    } else {
      console.log(`ℹ️ Nenhuma nova conquista para ${attendant.name}`);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Erro no processamento de conquistas do atendente:", error);

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
        error: "Falha no processamento de conquistas do atendente",
      },
      { status: 500 },
    );
  }
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
