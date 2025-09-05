import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getScoreFromRating } from '@/lib/gamification';
import { AchievementCheckerService } from '@/services/gamification/achievement-checker.service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { evaluations, fileName } = body;

    if (!evaluations || !Array.isArray(evaluations)) {
      return NextResponse.json(
        { error: 'Lista de avaliações é obrigatória' },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { error: 'Nome do arquivo é obrigatório' },
        { status: 400 }
      );
    }

    // Criar mapa de atendentes para rastreamento
    const attendantIds = [...new Set(evaluations.map((evaluation: any) => evaluation.attendantId))];
    const attendantMap = {
      attendants: attendantIds,
      totalEvaluations: evaluations.length,
      importDate: new Date().toISOString(),
    };

    // Criar o registro de importação
    const evaluationImport = await prisma.evaluationImport.create({
      data: {
        fileName,
        importedById: session.user.id,
        importedAt: new Date(),
        attendantMap,
      },
    });

    // Buscar configuração de gamificação
    const gamificationConfig = await prisma.gamificationConfig.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // Função para obter XP baseado na nota
    const getXpFromRating = (rating: number): number => {
      if (!gamificationConfig || !gamificationConfig.ratingScores) return 0;
      return getScoreFromRating(rating, gamificationConfig.ratingScores);
    };

    // Preparar dados das avaliações com importId e xpGained
    const evaluationsData = evaluations.map((evaluation: any) => ({
      attendantId: evaluation.attendantId,
      nota: evaluation.nota,
      comentario: evaluation.comentario || null,
      data: new Date(evaluation.data),
      xpGained: getXpFromRating(evaluation.nota),
      importId: evaluationImport.id,
    }));

    // Buscar temporadas ativas para calcular multiplicadores
    const activeSeasons = await prisma.gamificationSeason.findMany({
      where: { active: true }
    });

    // Inserir avaliações e criar eventos XP individualmente para obter os IDs
    const createdEvaluationsIds: string[] = [];
    const xpEventsData: any[] = [];

    for (const evaluationData of evaluationsData) {
      // Criar avaliação individual
      const createdEvaluation = await prisma.evaluation.create({
        data: evaluationData
      });
      
      createdEvaluationsIds.push(createdEvaluation.id);
      
      // Preparar evento XP para esta avaliação
      const evaluationDate = new Date(evaluationData.data);
      const baseScore = evaluationData.xpGained;
      
      // Encontrar temporada ativa para a data da avaliação
      const seasonForEvaluation = activeSeasons.find(s => 
        evaluationDate >= new Date(s.startDate) && 
        evaluationDate <= new Date(s.endDate)
      );
      
      const seasonMultiplier = seasonForEvaluation?.xpMultiplier ?? 1;
      const totalMultiplier = gamificationConfig.globalXpMultiplier * seasonMultiplier;
      const finalXp = baseScore * totalMultiplier;
      
      xpEventsData.push({
        attendantId: evaluationData.attendantId,
        points: finalXp,
        basePoints: baseScore,
        multiplier: totalMultiplier,
        reason: `Avaliação de ${evaluationData.nota} estrela(s)`,
        date: evaluationData.data,
        type: 'evaluation',
        relatedId: createdEvaluation.id,
        seasonId: seasonForEvaluation?.id || null,
      });
    }

    // Inserir eventos XP em lote
    await prisma.xpEvent.createMany({
      data: xpEventsData,
      skipDuplicates: true,
    });

    // Verificar conquistas para cada atendente que teve avaliações importadas
    const uniqueAttendantIds = [...new Set(evaluationsData.map(e => e.attendantId))];
    let totalAchievementsUnlocked = 0;
    let totalAchievementXp = 0;

    for (const attendantId of uniqueAttendantIds) {
      try {
        const attendantEvaluations = evaluationsData.filter(e => e.attendantId === attendantId);
        const latestEvaluationDate = new Date(Math.max(...attendantEvaluations.map(e => new Date(e.data).getTime())));
        
        const achievementResults = await AchievementCheckerService.checkAndUnlockAchievements(
          attendantId,
          latestEvaluationDate
        );
        
        totalAchievementsUnlocked += achievementResults.newAchievements.length;
        totalAchievementXp += achievementResults.totalXpAwarded;
        
        if (achievementResults.newAchievements.length > 0) {
          console.log(`🏆 ${achievementResults.newAchievements.length} nova(s) conquista(s) desbloqueada(s) para atendente ${attendantId}`);
        }
      } catch (error) {
        console.error(`Erro ao verificar conquistas para atendente ${attendantId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      importId: evaluationImport.id,
      fileName,
      evaluationsCount: createdEvaluationsIds.length,
      xpEventsCount: xpEventsData.length,
      achievementsUnlocked: totalAchievementsUnlocked,
      achievementXpAwarded: totalAchievementXp,
      message: `${createdEvaluationsIds.length} avaliações, ${xpEventsData.length} eventos XP e ${totalAchievementsUnlocked} conquistas processadas com sucesso`,
    });

  } catch (error) {
    console.error('Erro ao importar avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}