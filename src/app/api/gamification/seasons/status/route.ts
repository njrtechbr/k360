import { NextRequest, NextResponse } from "next/server";
import { GamificationService } from "@/services/gamificationService";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { z } from "zod";

const statusQuerySchema = z.object({
  status: z.enum(["active", "inactive", "upcoming", "ended"]).optional(),
  includeStats: z.boolean().optional().default(false),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(10),
  sortBy: z
    .enum(["startDate", "endDate", "name", "xpMultiplier"])
    .optional()
    .default("startDate"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * GET /api/gamification/seasons/status
 * Buscar temporadas filtradas por status
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.authenticated,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    // Obter parâmetros de query
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get("status") || undefined,
      includeStats: searchParams.get("includeStats") === "true",
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      sortBy: searchParams.get("sortBy") || "startDate",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    // Validar parâmetros
    const validationResult = statusQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Parâmetros inválidos",
          validStatuses: ["active", "inactive", "upcoming", "ended"],
        },
        { status: 400 },
      );
    }

    const { status, includeStats, page, limit, sortBy, sortOrder } =
      validationResult.data;

    // Buscar todas as temporadas
    const allSeasons = await GamificationService.findAllSeasons();

    // Filtrar por status se especificado
    let filteredSeasons = allSeasons;

    if (status) {
      const now = new Date();

      filteredSeasons = allSeasons.filter((season) => {
        const startDate = new Date(season.startDate);
        const endDate = new Date(season.endDate);

        switch (status) {
          case "active":
            return season.active && now >= startDate && now <= endDate;
          case "inactive":
            return !season.active;
          case "upcoming":
            return season.active && now < startDate;
          case "ended":
            return now > endDate;
          default:
            return true;
        }
      });
    }

    // Adicionar informações de status e estatísticas se solicitado
    const seasonsWithStatus = await Promise.all(
      filteredSeasons.map(async (season) => {
        const now = new Date();
        const startDate = new Date(season.startDate);
        const endDate = new Date(season.endDate);

        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const remaining = endDate.getTime() - now.getTime();

        const progress = Math.max(
          0,
          Math.min(100, (elapsed / totalDuration) * 100),
        );
        const remainingDays = Math.max(
          0,
          Math.ceil(remaining / (1000 * 60 * 60 * 24)),
        );

        const isActive = season.active && now >= startDate && now <= endDate;
        const hasStarted = now >= startDate;
        const hasEnded = now > endDate;

        let statusLabel = "inactive";
        if (season.active) {
          if (!hasStarted) statusLabel = "upcoming";
          else if (hasEnded) statusLabel = "ended";
          else statusLabel = "active";
        }

        const seasonData: any = {
          ...season,
          status: {
            label: statusLabel,
            isActive,
            hasStarted,
            hasEnded,
            progress: Number(progress.toFixed(1)),
            remainingDays,
          },
          duration: {
            totalDays: Math.ceil(totalDuration / (1000 * 60 * 60 * 24)),
            elapsedDays: Math.max(
              0,
              Math.ceil(elapsed / (1000 * 60 * 60 * 24)),
            ),
            remainingDays,
          },
        };

        // Adicionar estatísticas se solicitado
        if (includeStats) {
          try {
            const rankings = await GamificationService.calculateSeasonRankings(
              season.id,
            );
            const totalParticipants = rankings.length;
            const totalXpDistributed = rankings.reduce(
              (sum, rank) => sum + rank.totalXp,
              0,
            );

            seasonData.stats = {
              totalParticipants,
              totalXpDistributed,
              averageXpPerParticipant:
                totalParticipants > 0
                  ? Math.round(totalXpDistributed / totalParticipants)
                  : 0,
              topPerformer:
                rankings.length > 0
                  ? {
                      name: rankings[0].attendantName,
                      xp: rankings[0].totalXp,
                    }
                  : null,
            };
          } catch (error) {
            console.error(
              `Erro ao calcular estatísticas da temporada ${season.id}:`,
              error,
            );
            seasonData.stats = null;
          }
        }

        return seasonData;
      }),
    );

    // Ordenar conforme solicitado
    seasonsWithStatus.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "startDate":
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case "endDate":
          aValue = new Date(a.endDate).getTime();
          bValue = new Date(b.endDate).getTime();
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "xpMultiplier":
          aValue = a.xpMultiplier;
          bValue = b.xpMultiplier;
          break;
        default:
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Aplicar paginação
    const total = seasonsWithStatus.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSeasons = seasonsWithStatus.slice(startIndex, endIndex);

    return NextResponse.json(
      {
        success: true,
        data: {
          seasons: paginatedSeasons,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
          filter: status || "all",
          sort: {
            sortBy,
            sortOrder,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao buscar temporadas por status:", error);

    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar temporadas" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/gamification/seasons/status
 * Atualizar status de múltiplas temporadas
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação - apenas admins podem alterar status
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.adminOnly,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    const body = await request.json();
    const { seasonIds, action } = body;

    // Validar entrada
    if (!Array.isArray(seasonIds) || seasonIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Lista de IDs de temporadas é obrigatória",
        },
        { status: 400 },
      );
    }

    if (!["activate", "deactivate"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ação deve ser "activate" ou "deactivate"',
        },
        { status: 400 },
      );
    }

    const results = [];
    const errors = [];

    for (const seasonId of seasonIds) {
      try {
        if (action === "activate") {
          // Ativar temporada (desativa outras automaticamente)
          const updatedSeason = await GamificationService.updateSeason(
            seasonId,
            { active: true },
          );
          results.push({
            seasonId,
            success: true,
            season: updatedSeason,
          });
        } else {
          // Desativar temporada
          const updatedSeason = await GamificationService.updateSeason(
            seasonId,
            { active: false },
          );
          results.push({
            seasonId,
            success: true,
            season: updatedSeason,
          });
        }
      } catch (error) {
        errors.push({
          seasonId,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    const hasErrors = errors.length > 0;
    const hasSuccess = results.length > 0;

    return NextResponse.json(
      {
        success: !hasErrors || hasSuccess,
        data: {
          results,
          errors,
          summary: {
            total: seasonIds.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        message: hasErrors
          ? `${results.length} temporadas processadas com sucesso, ${errors.length} falharam`
          : `${results.length} temporadas processadas com sucesso`,
      },
      { status: hasErrors && !hasSuccess ? 400 : 200 },
    );
  } catch (error) {
    console.error("Erro ao atualizar status das temporadas:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor ao atualizar status das temporadas",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gamification/seasons/status
 * Criar nova temporada com status específico
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação - apenas admins podem criar temporadas
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.adminOnly,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    const seasonData = await request.json();

    // Validar dados básicos
    if (!seasonData.name || !seasonData.startDate || !seasonData.endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Nome, data de início e data de fim são obrigatórios",
        },
        { status: 400 },
      );
    }

    // Converter datas
    const startDate = new Date(seasonData.startDate);
    const endDate = new Date(seasonData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Datas inválidas fornecidas",
        },
        { status: 400 },
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Data de fim deve ser posterior à data de início",
        },
        { status: 400 },
      );
    }

    // Criar temporada
    const newSeason = await GamificationService.createSeason({
      name: seasonData.name,
      startDate,
      endDate,
      active: seasonData.active || false,
      xpMultiplier: seasonData.xpMultiplier || 1,
    });

    // Adicionar informações de status
    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const remaining = endDate.getTime() - now.getTime();

    const progress = Math.max(
      0,
      Math.min(100, (elapsed / totalDuration) * 100),
    );
    const remainingDays = Math.max(
      0,
      Math.ceil(remaining / (1000 * 60 * 60 * 24)),
    );

    const isActive = newSeason.active && now >= startDate && now <= endDate;
    const hasStarted = now >= startDate;
    const hasEnded = now > endDate;

    let statusLabel = "inactive";
    if (newSeason.active) {
      if (!hasStarted) statusLabel = "upcoming";
      else if (hasEnded) statusLabel = "ended";
      else statusLabel = "active";
    }

    const seasonWithStatus = {
      ...newSeason,
      status: {
        label: statusLabel,
        isActive,
        hasStarted,
        hasEnded,
        progress: Number(progress.toFixed(1)),
        remainingDays,
      },
      duration: {
        totalDays: Math.ceil(totalDuration / (1000 * 60 * 60 * 24)),
        elapsedDays: Math.max(0, Math.ceil(elapsed / (1000 * 60 * 60 * 24))),
        remainingDays,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: seasonWithStatus,
        message: "Temporada criada com sucesso",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar temporada:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
