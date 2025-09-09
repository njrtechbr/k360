import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GamificationService } from '@/services/gamificationService';
import { getScoreFromRating } from '@/lib/gamification';
import { AchievementCheckerService } from '@/services/gamification/achievement-checker.service';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Temporariamente removendo autenticação para teste
    // const session = await getServerSession(authOptions);
    
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'Não autorizado' },
    //     { status: 401 }
    //   );
    // }

    const evaluations = await prisma.evaluation.findMany({
      orderBy: {
        data: 'desc'
      }
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

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
    const { attendantId, nota, comentario } = body;

    // Validação dos dados
    if (!attendantId || !nota || nota < 1 || nota > 5) {
      return NextResponse.json(
        { error: 'Dados inválidos. Atendente e nota (1-5) são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verificar se o atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId }
    });

    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar configuração de gamificação e temporada ativa
    const [gamificationConfig, activeSeason] = await Promise.all([
      prisma.gamificationConfig.findUnique({ where: { id: 'main' } }),
      GamificationService.findActiveSeason()
    ]);

    if (!gamificationConfig) {
      return NextResponse.json(
        { error: 'Configuração de gamificação não encontrada' },
        { status: 500 }
      );
    }

    // Calcular XP
    const evaluationDate = new Date();
    const ratingScores = {
      1: gamificationConfig.ratingScore1,
      2: gamificationConfig.ratingScore2,
      3: gamificationConfig.ratingScore3,
      4: gamificationConfig.ratingScore4,
      5: gamificationConfig.ratingScore5
    };
    
    const baseScore = getScoreFromRating(nota, ratingScores);
    let xpGained = baseScore;
    
    if (activeSeason && 
        evaluationDate >= new Date(activeSeason.startDate) && 
        evaluationDate <= new Date(activeSeason.endDate)) {
      const totalMultiplier = gamificationConfig.globalXpMultiplier * activeSeason.xpMultiplier;
      xpGained = baseScore * totalMultiplier;
    } else {
      xpGained = baseScore * gamificationConfig.globalXpMultiplier;
    }

    // Criar avaliação
    const evaluation = await prisma.evaluation.create({
      data: {
        attendantId,
        nota,
        comentario: comentario || '',
        data: evaluationDate,
        xpGained
      }
    });

    // Criar evento XP
    await prisma.xpEvent.create({
      data: {
        attendantId: evaluation.attendantId,
        points: xpGained,
        basePoints: baseScore,
        multiplier: activeSeason ? 
          gamificationConfig.globalXpMultiplier * activeSeason.xpMultiplier : 
          gamificationConfig.globalXpMultiplier,
        reason: `Avaliação ${evaluation.nota} estrelas`,
        type: 'EVALUATION',
        relatedId: evaluation.id,
        date: evaluationDate,
        seasonId: activeSeason?.id || null
      }
    });

    // Verificar e desbloquear conquistas
    let achievementResults = null;
    try {
      achievementResults = await AchievementCheckerService.checkAndUnlockAchievements(
        evaluation.attendantId,
        evaluationDate
      );
      
      if (achievementResults.newAchievements.length > 0) {
        console.log(`🏆 ${achievementResults.newAchievements.length} nova(s) conquista(s) desbloqueada(s) para atendente ${evaluation.attendantId}`);
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas:', error);
      // Não falhar a criação da avaliação por causa de erro nas conquistas
    }

    return NextResponse.json({
      evaluation,
      xpGained,
      achievements: achievementResults?.newAchievements || [],
      totalAchievementXp: achievementResults?.totalXpAwarded || 0
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { evaluationIds } = body;

    if (!evaluationIds || !Array.isArray(evaluationIds)) {
      return NextResponse.json(
        { error: 'IDs das avaliações são obrigatórios' },
        { status: 400 }
      );
    }

    await prisma.evaluation.deleteMany({
      where: {
        id: { in: evaluationIds }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Avaliações deletadas com sucesso',
      deletedCount: evaluationIds.length
    });
  } catch (error) {
    console.error('Erro ao deletar avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}