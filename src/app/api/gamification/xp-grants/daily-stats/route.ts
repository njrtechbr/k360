import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware, AuthConfigs } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamification/xp-grants/daily-stats
 * Buscar estatísticas diárias de concessões de XP para um usuário
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await AuthMiddleware.checkAuth(request, AuthConfigs.adminOnly);

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Obter parâmetros de query
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Calcular início e fim do dia atual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar concessões do dia
    const todayGrants = await prisma.xpGrant.findMany({
      where: {
        grantedBy: userId,
        grantedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        points: true
      }
    });

    // Calcular estatísticas
    const totalGrantsToday = todayGrants.length;
    const totalPointsToday = todayGrants.reduce((sum, grant) => sum + grant.points, 0);
    
    // Limites configuráveis
    const DAILY_LIMIT_POINTS = 1000;
    const DAILY_LIMIT_GRANTS = 50;
    
    const remainingPoints = Math.max(0, DAILY_LIMIT_POINTS - totalPointsToday);
    const remainingGrants = Math.max(0, DAILY_LIMIT_GRANTS - totalGrantsToday);

    // Retornar estatísticas
    return NextResponse.json({
      success: true,
      data: {
        todayGrants: totalGrantsToday,
        todayPoints: totalPointsToday,
        remainingPoints,
        remainingGrants,
        limits: {
          maxPoints: DAILY_LIMIT_POINTS,
          maxGrants: DAILY_LIMIT_GRANTS
        },
        canGrant: remainingPoints > 0 && remainingGrants > 0
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas diárias:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar estatísticas' },
      { status: 500 }
    );
  }
}