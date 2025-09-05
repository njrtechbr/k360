import { NextRequest, NextResponse } from 'next/server';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware, AuthConfigs } from '@/lib/auth-middleware';
import { xpAvulsoRateLimiter } from '@/lib/rate-limit';

/**
 * GET /api/gamification/xp-grants/statistics
 * Obter estatísticas de concessões de XP avulso
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar rate limiting
    const limitResult = await xpAvulsoRateLimiter.checkLimit(request);
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas. Tente novamente em alguns instantes.',
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString()
          }
        }
      );
    }

    // Verificar autenticação (supervisores e acima podem visualizar)
    const authResult = await AuthMiddleware.checkAuth(request, AuthConfigs.supervisorAndAbove);

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Obter parâmetro de período
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Validar período
    const validPeriods = ['7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { 
          error: 'Período inválido. Períodos válidos: 7d, 30d, 90d',
          validPeriods 
        },
        { status: 400 }
      );
    }

    // Obter estatísticas
    const statistics = await XpAvulsoService.getGrantStatistics(period);

    // Calcular métricas adicionais
    const periodDays = parseInt(period.replace('d', ''));
    const dailyAverage = statistics.totalGrants / periodDays;
    const pointsPerDay = statistics.totalPoints / periodDays;

    // Preparar resposta com dados organizados
    return NextResponse.json(
      {
        success: true,
        data: {
          period: {
            value: period,
            days: periodDays,
            label: `Últimos ${periodDays} dias`
          },
          overview: {
            totalGrants: statistics.totalGrants,
            totalPoints: statistics.totalPoints,
            averagePoints: Math.round(statistics.averagePoints),
            dailyAverageGrants: Math.round(dailyAverage * 100) / 100,
            dailyAveragePoints: Math.round(pointsPerDay)
          },
          grantsByType: statistics.grantsByType.map(type => ({
            typeId: type.typeId,
            typeName: type.typeName,
            count: type.count,
            totalPoints: type.totalPoints,
            averagePoints: Math.round(type.totalPoints / type.count),
            percentage: Math.round((type.count / statistics.totalGrants) * 100)
          })).sort((a, b) => b.totalPoints - a.totalPoints),
          grantsByGranter: statistics.grantsByGranter.map(granter => ({
            granterId: granter.granterId,
            granterName: granter.granterName,
            count: granter.count,
            totalPoints: granter.totalPoints,
            averagePoints: Math.round(granter.totalPoints / granter.count),
            percentage: Math.round((granter.count / statistics.totalGrants) * 100)
          })).sort((a, b) => b.totalPoints - a.totalPoints),
          trends: {
            mostUsedType: statistics.grantsByType.length > 0 
              ? statistics.grantsByType.reduce((prev, current) => 
                  prev.count > current.count ? prev : current
                ).typeName
              : null,
            mostActiveGranter: statistics.grantsByGranter.length > 0
              ? statistics.grantsByGranter.reduce((prev, current) => 
                  prev.count > current.count ? prev : current
                ).granterName
              : null,
            averageGrantsPerGranter: statistics.grantsByGranter.length > 0
              ? Math.round(statistics.totalGrants / statistics.grantsByGranter.length)
              : 0
          }
        }
      },
      {
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString()
        }
      }
    );

  } catch (error) {
    console.error('Erro ao obter estatísticas de XP avulso:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor ao obter estatísticas' },
      { status: 500 }
    );
  }
}