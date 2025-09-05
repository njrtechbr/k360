import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { attendantId } = await request.json();

    console.log('🚀 Iniciando processamento automático de conquistas...');

    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!currentSeason) {
      return NextResponse.json(
        { error: 'Nenhuma temporada ativa encontrada' },
        { status: 400 }
      );
    }

    let totalUnlocks = 0;

    if (attendantId) {
      // Processar apenas um atendente específico
      totalUnlocks = await processAchievementsForAttendant(attendantId, currentSeason);
    } else {
      // Processar todos os atendentes com avaliações na temporada
      const attendantsWithEvals = await prisma.evaluation.findMany({
        where: {
          data: {
            gte: currentSeason.startDate,
            lte: currentSeason.endDate
          }
        },
        select: { attendantId: true },
        distinct: ['attendantId']
      });

      console.log(`👥 Processando ${attendantsWithEvals.length} atendentes...`);

      for (const { attendantId: id } of attendantsWithEvals) {
        const unlocks = await processAchievementsForAttendant(id, currentSeason);
        totalUnlocks += unlocks;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processamento concluído! ${totalUnlocks} conquistas desbloqueadas.`,
      unlockedCount: totalUnlocks,
      seasonName: currentSeason.name
    });

  } catch (error) {
    console.error('Erro no processamento automático:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function processAchievementsForAttendant(attendantId: string, season: any): Promise<number> {
  try {
    // Buscar conquistas ativas
    const achievements = await prisma.achievementConfig.findMany({
      where: { active: true }
    });

    // Buscar conquistas já desbloqueadas na temporada atual
    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      where: {
        attendantId,
        seasonId: season.id
      }
    });

    const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));
    let newUnlocks = 0;

    // Verificar cada conquista
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) {
        continue; // Já desbloqueada nesta temporada
      }

      const shouldUnlock = await checkAchievementCriteria(attendantId, achievement.id, season);

      if (shouldUnlock) {
        try {
          await prisma.unlockedAchievement.create({
            data: {
              attendantId,
              achievementId: achievement.id,
              seasonId: season.id,
              unlockedAt: new Date(),
              xpGained: achievement.xp
            }
          });

          console.log(`✅ ${achievement.title} desbloqueada para atendente ${attendantId}`);
          newUnlocks++;
        } catch (error: any) {
          if (!error.message?.includes('Unique constraint')) {
            console.error(`❌ Erro ao desbloquear ${achievement.title}:`, error);
          }
        }
      }
    }

    return newUnlocks;
  } catch (error) {
    console.error(`Erro no processamento para atendente ${attendantId}:`, error);
    return 0;
  }
}

async function checkAchievementCriteria(
  attendantId: string, 
  achievementId: string, 
  season: any
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
          lte: seasonEnd
        }
      },
      orderBy: { data: 'asc' }
    });

    const seasonXpEvents = await prisma.xpEvent.findMany({
      where: {
        attendantId,
        date: {
          gte: seasonStart,
          lte: seasonEnd
        }
      }
    });

    const evaluationCount = seasonEvaluations.length;
    const seasonXp = seasonXpEvents.reduce((sum, event) => sum + (event.points || 0), 0);

    // Verificar critérios baseados no ID da conquista
    switch (achievementId) {
      case 'first_evaluation':
        return evaluationCount >= 1;
        
      case 'ten_evaluations':
        return evaluationCount >= 10;
        
      case 'fifty_evaluations':
        return evaluationCount >= 50;
        
      case 'hundred_evaluations':
        return evaluationCount >= 100;
        
      case 'hundred_xp':
        return seasonXp >= 100;
        
      case 'thousand_xp':
        return seasonXp >= 1000;
        
      case 'five_thousand_xp':
        return seasonXp >= 5000;
        
      case 'ten_thousand_xp':
        return seasonXp >= 10000;
        
      case 'five_star_streak_5':
        return checkFiveStarStreak(seasonEvaluations, 5);
        
      case 'five_star_streak_10':
        return checkFiveStarStreak(seasonEvaluations, 10);
        
      case 'high_average_50':
        return checkHighAverage(seasonEvaluations, 4.5, 50);
        
      default:
        return false;
    }
  } catch (error) {
    console.error(`Erro ao verificar critérios para ${achievementId}:`, error);
    return false;
  }
}

function checkFiveStarStreak(evaluations: any[], requiredStreak: number): boolean {
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
  minEvaluations: number
): boolean {
  if (evaluations.length < minEvaluations) return false;

  const average = evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
  return average >= requiredAverage;
}