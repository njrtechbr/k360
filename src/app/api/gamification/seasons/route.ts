import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GamificationService } from "@/services/gamificationService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Obter parâmetros de query para filtragem
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const activeOnly = searchParams.get("activeOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    let seasons = await GamificationService.findAllSeasons();

    // Filtrar apenas temporadas ativas se solicitado
    if (activeOnly) {
      seasons = seasons.filter((season) => season.active);
    }

    // Adicionar informações de status para todas as temporadas
    const seasonsWithStatus = await Promise.all(
      seasons.map(async (season) => {
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

    // Aplicar paginação
    const total = seasonsWithStatus.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSeasons = seasonsWithStatus.slice(startIndex, endIndex);

    return NextResponse.json({
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
        filters: {
          activeOnly,
          includeStats,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao buscar temporadas:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      !["SUPERADMIN", "ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const seasonData = await request.json();
    const season = await GamificationService.createSeason(seasonData);

    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar temporada:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      !["SUPERADMIN", "ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("id");

    if (!seasonId) {
      return NextResponse.json(
        { error: "ID da temporada é obrigatório" },
        { status: 400 },
      );
    }

    const seasonData = await request.json();
    const season = await GamificationService.updateSeason(seasonId, seasonData);

    return NextResponse.json(season);
  } catch (error) {
    console.error("Erro ao atualizar temporada:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("id");

    if (!seasonId) {
      return NextResponse.json(
        { error: "ID da temporada é obrigatório" },
        { status: 400 },
      );
    }

    await GamificationService.deleteSeason(seasonId);

    return NextResponse.json({
      success: true,
      message: "Temporada deletada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar temporada:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
