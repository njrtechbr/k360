import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GamificationService } from "@/services/gamificationService";

/**
 * GET /api/gamification/seasons/active
 * Buscar temporada ativa atual
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    // Obter parâmetros de query
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    // Buscar todas as temporadas ativas
    const allSeasons = await GamificationService.findAllSeasons();
    const now = new Date();

    // Filtrar temporadas que estão ativas e dentro do período
    const activeSeasons = allSeasons.filter((season) => {
      if (!season.active) return false;

      const startDate = new Date(season.startDate);
      const endDate = new Date(season.endDate);

      return now >= startDate && now <= endDate;
    });

    // Se não há temporada ativa, retornar null
    if (activeSeasons.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Nenhuma temporada ativa encontrada",
      });
    }

    // Se há múltiplas temporadas ativas, pegar a mais recente
    const activeSeason = activeSeasons.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    )[0];

    // Calcular informações de status
    const startDate = new Date(activeSeason.startDate);
    const endDate = new Date(activeSeason.endDate);

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

    const seasonData: any = {
      ...activeSeason,
      status: {
        label: "active",
        isActive: true,
        hasStarted: true,
        hasEnded: false,
        progress: Number(progress.toFixed(1)),
        remainingDays,
      },
      duration: {
        totalDays: Math.ceil(totalDuration / (1000 * 60 * 60 * 24)),
        elapsedDays: Math.max(0, Math.ceil(elapsed / (1000 * 60 * 60 * 24))),
        remainingDays,
      },
    };

    // Adicionar estatísticas se solicitado
    if (includeStats) {
      try {
        const rankings = await GamificationService.calculateSeasonRankings(
          activeSeason.id,
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
          `Erro ao calcular estatísticas da temporada ativa ${activeSeason.id}:`,
          error,
        );
        seasonData.stats = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: seasonData,
    });
  } catch (error) {
    console.error("Erro ao buscar temporada ativa:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
