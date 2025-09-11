import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/gamification/achievements/process-season
// Processar conquistas para a temporada atual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendantId, seasonId } = body;

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId é obrigatório" },
        { status: 400 },
      );
    }

    // Buscar temporada
    const season = await prisma.gamificationSeason.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Temporada não encontrada" },
        { status: 404 },
      );
    }

    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    // Buscar conquistas ativas
    const achievements = await prisma.achievementConfig.findMany({
      where: { active: true },
    });

    // Buscar atendentes (específico ou todos)
    const attendants = await prisma.attendant.findMany({
      where: attendantId ? { id: attendantId } : undefined,
    });

    let unlockedCount = 0;

    for (const attendant of attendants) {
      // Buscar conquistas já desbloqueadas na temporada
      const existingUnlocked = await prisma.unlockedAchievement.findMany({
        where: {
          attendantId: attendant.id,
          unlockedAt: {
            gte: seasonStart,
            lte: seasonEnd,
          },
        },
      });

      const unlockedIds = new Set(existingUnlocked.map((u) => u.achievementId));

      // Verificar cada conquista
      for (const achievement of achievements) {
        if (unlockedIds.has(achievement.id)) {
          continue; // Já desbloqueada
        }

        const shouldUnlock = await checkAchievementCriteria(
          attendant.id,
          achievement.id,
          seasonStart,
          seasonEnd,
        );

        if (shouldUnlock) {
          try {
            // Desbloquear conquista
            const unlocked = await prisma.unlockedAchievement.create({
              data: {
                attendantId: attendant.id,
                achievementId: achievement.id,
                xpGained: achievement.xp,
                unlockedAt: new Date(),
                seasonId: season.id,
              },
            });

            // Criar evento XP
            if (achievement.xp > 0) {
              await prisma.xpEvent.create({
                data: {
                  attendantId: attendant.id,
                  points: achievement.xp,
                  basePoints: achievement.xp,
                  multiplier: season.xpMultiplier || 1,
                  reason: `Conquista desbloqueada: ${achievement.title}`,
                  date: new Date(),
                  type: "ACHIEVEMENT",
                  relatedId: unlocked.id,
                  seasonId: season.id,
                },
              });
            }

            unlockedCount++;
          } catch (error) {
            console.error(
              `Erro ao desbloquear conquista ${achievement.id} para ${attendant.name}:`,
              error,
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      unlockedCount,
      message: `${unlockedCount} conquistas desbloqueadas com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao processar conquistas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

async function checkAchievementCriteria(
  attendantId: string,
  achievementId: string,
  seasonStart: Date,
  seasonEnd: Date,
): Promise<boolean> {
  try {
    // Buscar dados da temporada
    const [xpEvents, evaluations] = await Promise.all([
      prisma.xpEvent.findMany({
        where: {
          attendantId,
          date: { gte: seasonStart, lte: seasonEnd },
          type: { not: "ACHIEVEMENT" }, // Excluir XP de conquistas
        },
      }),
      prisma.evaluation.findMany({
        where: {
          attendantId,
          data: { gte: seasonStart, lte: seasonEnd },
        },
        orderBy: { data: "asc" },
      }),
    ]);

    const seasonXp = xpEvents.reduce((sum, e) => sum + (e.points || 0), 0);
    const evaluationCount = evaluations.length;

    // Critérios baseados no ID da conquista
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
        return checkFiveStarStreak(evaluations, 5);
      case "five_star_streak_10":
        return checkFiveStarStreak(evaluations, 10);
      case "high_average_50":
        return checkHighAverage(evaluations, 4.5, 50);
      default:
        return false;
    }
  } catch (error) {
    console.error("Erro ao verificar critérios:", error);
    return false;
  }
}

function checkFiveStarStreak(
  evaluations: any[],
  requiredStreak: number,
): boolean {
  if (evaluations.length < requiredStreak) return false;

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

function checkHighAverage(
  evaluations: any[],
  requiredAverage: number,
  minEvaluations: number,
): boolean {
  if (evaluations.length < minEvaluations) return false;
  const average =
    evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
  return average >= requiredAverage;
}
