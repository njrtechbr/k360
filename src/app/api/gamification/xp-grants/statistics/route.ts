import { NextRequest, NextResponse } from "next/server";
import { XpAvulsoService } from "@/services/xpAvulsoService";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { xpAvulsoRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const statisticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  userId: z.string().optional(),
});

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
          error: "Muitas tentativas. Tente novamente em alguns instantes.",
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": limitResult.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(
              limitResult.resetTime / 1000,
            ).toString(),
          },
        },
      );
    }

    // Verificar autenticação e autorização (SUPERVISOR, ADMIN e SUPERADMIN podem ver estatísticas)
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.supervisorAndAbove,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get("period") || "30d",
      userId: searchParams.get("userId") || undefined,
    };

    // Validar parâmetros
    const validationResult = statisticsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const validPeriods = ["7d", "30d", "90d"];
      return NextResponse.json(
        {
          error: "Período inválido. Períodos válidos: 7d, 30d, 90d",
          validPeriods,
        },
        { status: 400 },
      );
    }

    const { period, userId } = validationResult.data;

    // Buscar estatísticas usando o serviço
    const statistics = userId
      ? await XpAvulsoService.getGrantStatistics(period, userId)
      : await XpAvulsoService.getGrantStatistics(period);

    // Calcular informações adicionais do período
    const periodInfo = {
      "7d": { days: 7, label: "Últimos 7 dias" },
      "30d": { days: 30, label: "Últimos 30 dias" },
      "90d": { days: 90, label: "Últimos 90 dias" },
    };

    const periodData = periodInfo[period];

    // Calcular médias diárias
    const dailyAverageGrants = Number(
      (statistics.totalGrants / periodData.days).toFixed(2),
    );
    const dailyAveragePoints = Number(
      (statistics.totalPoints / periodData.days).toFixed(0),
    );

    // Calcular percentuais para tipos
    const grantsByTypeWithPercentage = statistics.grantsByType.map((type) => ({
      ...type,
      averagePoints:
        type.count > 0 ? Number((type.totalPoints / type.count).toFixed(1)) : 0,
      percentage:
        statistics.totalGrants > 0
          ? Number(((type.count / statistics.totalGrants) * 100).toFixed(1))
          : 0,
    }));

    // Calcular percentuais para responsáveis
    const grantsByGranterWithPercentage = statistics.grantsByGranter.map(
      (granter) => ({
        ...granter,
        averagePoints:
          granter.count > 0
            ? Number((granter.totalPoints / granter.count).toFixed(1))
            : 0,
        percentage:
          statistics.totalGrants > 0
            ? Number(
                ((granter.count / statistics.totalGrants) * 100).toFixed(1),
              )
            : 0,
      }),
    );

    // Calcular tendências
    const mostUsedType =
      grantsByTypeWithPercentage.length > 0
        ? grantsByTypeWithPercentage[0].typeName
        : null;

    const mostActiveGranter =
      grantsByGranterWithPercentage.length > 0
        ? grantsByGranterWithPercentage[0].granterName
        : null;

    const averageGrantsPerGranter =
      grantsByGranterWithPercentage.length > 0
        ? Number(
            (
              statistics.totalGrants / grantsByGranterWithPercentage.length
            ).toFixed(1),
          )
        : 0;

    // Estruturar resposta
    const response = {
      success: true,
      data: {
        period: {
          value: period,
          days: periodData.days,
          label: periodData.label,
        },
        overview: {
          totalGrants: statistics.totalGrants,
          totalPoints: statistics.totalPoints,
          averagePoints: statistics.averagePoints,
          dailyAverageGrants,
          dailyAveragePoints,
        },
        grantsByType: grantsByTypeWithPercentage,
        grantsByGranter: grantsByGranterWithPercentage,
        trends: {
          mostUsedType,
          mostActiveGranter,
          averageGrantsPerGranter,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar estatísticas de XP:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
