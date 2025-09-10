import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Endpoint otimizado para estatísticas básicas - carregamento rápido
export async function GET(request: NextRequest) {
  try {
    // Usar Promise.allSettled para não falhar se uma query der erro
    const [
      totalEvaluationsResult,
      totalAttendantsResult,
      averageRatingResult,
      activeSeasonsResult
    ] = await Promise.allSettled([
      prisma.evaluation.count(),
      prisma.attendant.count(),
      prisma.evaluation.aggregate({
        _avg: { nota: true }
      }),
      prisma.gamificationSeason.count({
        where: { active: true }
      })
    ]);

    // Extrair valores com fallbacks
    const totalEvaluations = totalEvaluationsResult.status === 'fulfilled' ? totalEvaluationsResult.value : 0;
    const totalAttendants = totalAttendantsResult.status === 'fulfilled' ? totalAttendantsResult.value : 0;
    const averageRating = averageRatingResult.status === 'fulfilled' ? 
      (averageRatingResult.value._avg.nota || 0) : 0;
    const activeSeasons = activeSeasonsResult.status === 'fulfilled' ? activeSeasonsResult.value : 0;

    // Calcular XP e conquistas de forma assíncrona (não bloquear resposta)
    const stats = {
      totalEvaluations,
      totalAttendants,
      averageRating: Number(averageRating.toFixed(2)),
      activeSeasons,
      totalXp: 0, // Será carregado separadamente
      unlockedAchievements: 0 // Será carregado separadamente
    };

    // Carregar dados pesados em background
    Promise.allSettled([
      prisma.xpEvent.aggregate({
        _sum: { points: true }
      }),
      prisma.unlockedAchievement.count()
    ]).then(([xpResult, achievementsResult]) => {
      // Estes dados podem ser atualizados via WebSocket ou polling
      console.log('Dados pesados carregados:', {
        totalXp: xpResult.status === 'fulfilled' ? (xpResult.value._sum.points || 0) : 0,
        unlockedAchievements: achievementsResult.status === 'fulfilled' ? achievementsResult.value : 0
      });
    }).catch(error => {
      console.error('Erro ao carregar dados pesados:', error);
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas básicas:', error);
    
    // Retornar dados padrão em caso de erro
    return NextResponse.json({
      totalEvaluations: 0,
      totalAttendants: 0,
      averageRating: 0,
      totalXp: 0,
      activeSeasons: 0,
      unlockedAchievements: 0,
      error: 'Erro ao carregar estatísticas'
    }, { status: 200 }); // Não retornar 500 para não quebrar o dashboard
  }
}