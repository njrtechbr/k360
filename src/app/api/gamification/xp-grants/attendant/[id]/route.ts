import { NextRequest, NextResponse } from "next/server";
import { XpAvulsoService } from "@/services/xpAvulsoService";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { xpAvulsoRateLimiter } from "@/lib/rate-limit";

/**
 * GET /api/gamification/xp-grants/attendant/[id]
 * Buscar concessões de XP avulso de um atendente específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Verificar autenticação (supervisores e acima podem visualizar)
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

    const attendantId = params.id;

    // Validar ID do atendente
    if (!attendantId || typeof attendantId !== "string") {
      return NextResponse.json(
        { error: "ID do atendente é obrigatório e deve ser uma string válida" },
        { status: 400 },
      );
    }

    // Obter parâmetros de query para paginação e ordenação
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50"); // Limite padrão maior para perfil
    const includeAll = searchParams.get("includeAll") === "true";
    const sortBy =
      (searchParams.get("sortBy") as
        | "grantedAt"
        | "points"
        | "typeName"
        | "granterName") || "grantedAt";
    const sortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    // Validar parâmetros de paginação
    if (page < 1 || limit < 1 || limit > 200) {
      return NextResponse.json(
        {
          error:
            "Parâmetros de paginação inválidos. Page >= 1, Limit entre 1 e 200",
        },
        { status: 400 },
      );
    }

    // Validar parâmetros de ordenação
    const validSortBy = ["grantedAt", "points", "typeName", "granterName"];
    const validSortOrder = ["asc", "desc"];

    if (!validSortBy.includes(sortBy)) {
      return NextResponse.json(
        {
          error:
            "Parâmetro sortBy inválido. Valores válidos: grantedAt, points, typeName, granterName",
          validValues: validSortBy,
        },
        { status: 400 },
      );
    }

    if (!validSortOrder.includes(sortOrder)) {
      return NextResponse.json(
        {
          error: "Parâmetro sortOrder inválido. Valores válidos: asc, desc",
          validValues: validSortOrder,
        },
        { status: 400 },
      );
    }

    // Buscar concessões do atendente com ordenação customizável
    const grants = await XpAvulsoService.findGrantsByAttendantWithSort(
      attendantId,
      sortBy,
      sortOrder,
    );

    // Calcular estatísticas do atendente
    const totalPoints = grants.reduce((sum, grant) => sum + grant.points, 0);
    const totalGrants = grants.length;

    // Agrupar por tipo de XP
    const grantsByType = grants.reduce(
      (acc, grant) => {
        const typeId = grant.type.id;
        if (!acc[typeId]) {
          acc[typeId] = {
            type: {
              id: grant.type.id,
              name: grant.type.name,
              category: grant.type.category,
              icon: grant.type.icon,
              color: grant.type.color,
            },
            count: 0,
            totalPoints: 0,
            grants: [],
          };
        }

        acc[typeId].count++;
        acc[typeId].totalPoints += grant.points;
        acc[typeId].grants.push({
          id: grant.id,
          points: grant.points,
          justification: grant.justification,
          grantedAt: grant.grantedAt,
          granter: {
            id: grant.granter.id,
            name: grant.granter.name,
            role: grant.granter.role,
          },
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    // Converter para array e ordenar por total de pontos
    const typesSummary = Object.values(grantsByType).sort(
      (a: any, b: any) => b.totalPoints - a.totalPoints,
    );

    // Obter concessões recentes (últimas 10)
    const recentGrants = grants.slice(0, 10).map((grant) => ({
      id: grant.id,
      type: {
        id: grant.type.id,
        name: grant.type.name,
        category: grant.type.category,
        icon: grant.type.icon,
        color: grant.type.color,
      },
      points: grant.points,
      justification: grant.justification,
      grantedAt: grant.grantedAt,
      granter: {
        id: grant.granter.id,
        name: grant.granter.name,
        role: grant.granter.role,
      },
    }));

    // Aplicar paginação se não for para incluir todos
    let paginatedGrants = grants;
    let pagination = null;

    if (!includeAll) {
      const offset = (page - 1) * limit;
      paginatedGrants = grants.slice(offset, offset + limit);

      pagination = {
        page,
        limit,
        total: totalGrants,
        totalPages: Math.ceil(totalGrants / limit),
        hasNext: offset + limit < totalGrants,
        hasPrev: page > 1,
      };
    }

    // Mapear concessões paginadas
    const mappedGrants = paginatedGrants.map((grant) => ({
      id: grant.id,
      type: {
        id: grant.type.id,
        name: grant.type.name,
        category: grant.type.category,
        icon: grant.type.icon,
        color: grant.type.color,
      },
      points: grant.points,
      justification: grant.justification,
      grantedAt: grant.grantedAt,
      granter: {
        id: grant.granter.id,
        name: grant.granter.name,
        role: grant.granter.role,
      },
    }));

    // Preparar resposta
    const responseData: any = {
      attendant: {
        id: grants[0]?.attendant.id || attendantId,
        name: grants[0]?.attendant.name || "Atendente não encontrado",
      },
      summary: {
        totalGrants,
        totalPoints,
        averagePoints:
          totalGrants > 0 ? Math.round(totalPoints / totalGrants) : 0,
      },
      grantsByType: typesSummary,
      recentGrants,
      grants: mappedGrants,
    };

    // Adicionar paginação se aplicável
    if (pagination) {
      responseData.pagination = pagination;
    }

    // Retornar dados organizados
    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      {
        headers: {
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": limitResult.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(
            limitResult.resetTime / 1000,
          ).toString(),
        },
      },
    );
  } catch (error) {
    console.error("Erro ao buscar concessões do atendente:", error);

    // Tratar erro específico de atendente não encontrado
    if (error instanceof Error && error.message.includes("não encontrado")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar concessões do atendente" },
      { status: 500 },
    );
  }
}
