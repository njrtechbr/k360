import { NextRequest, NextResponse } from "next/server";
import { GamificationService } from "@/services/gamificationService";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { z } from "zod";

const bulkActionSchema = z.object({
  action: z.enum(["activate", "deactivate", "delete", "clone"]),
  seasonIds: z
    .array(z.string())
    .min(1, "Pelo menos um ID de temporada é obrigatório"),
  options: z
    .object({
      newName: z.string().optional(), // Para clonagem
      preserveXpEvents: z.boolean().optional().default(false), // Para deleção
    })
    .optional(),
});

/**
 * POST /api/gamification/seasons/manage
 * Gerenciamento em lote de temporadas (ativar, desativar, deletar, clonar)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação - apenas admins podem gerenciar temporadas
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

    // Validar entrada
    const validationResult = bulkActionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { action, seasonIds, options = {} } = validationResult.data;

    const results = [];
    const errors = [];

    for (const seasonId of seasonIds) {
      try {
        let result;

        switch (action) {
          case "activate":
            result = await GamificationService.updateSeason(seasonId, {
              active: true,
            });
            results.push({
              seasonId,
              action: "activated",
              success: true,
              data: result,
            });
            break;

          case "deactivate":
            result = await GamificationService.updateSeason(seasonId, {
              active: false,
            });
            results.push({
              seasonId,
              action: "deactivated",
              success: true,
              data: result,
            });
            break;

          case "delete":
            // Verificar se deve preservar eventos XP
            if (!options.preserveXpEvents) {
              // Resetar eventos XP da temporada antes de deletar
              await GamificationService.resetXpEvents(seasonId);
            }

            await GamificationService.deleteSeason(seasonId);
            results.push({
              seasonId,
              action: "deleted",
              success: true,
              data: null,
            });
            break;

          case "clone":
            // Buscar temporada original
            const allSeasons = await GamificationService.findAllSeasons();
            const originalSeason = allSeasons.find((s) => s.id === seasonId);

            if (!originalSeason) {
              throw new Error("Temporada original não encontrada");
            }

            // Criar nova temporada baseada na original
            const newSeasonName =
              options.newName || `${originalSeason.name} (Cópia)`;
            const clonedSeason = await GamificationService.createSeason({
              name: newSeasonName,
              startDate: originalSeason.startDate,
              endDate: originalSeason.endDate,
              active: false, // Sempre criar como inativa
              xpMultiplier: originalSeason.xpMultiplier,
            });

            results.push({
              seasonId,
              action: "cloned",
              success: true,
              data: {
                original: originalSeason,
                cloned: clonedSeason,
              },
            });
            break;

          default:
            throw new Error(`Ação não suportada: ${action}`);
        }
      } catch (error) {
        errors.push({
          seasonId,
          action,
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
            action,
          },
        },
        message: hasErrors
          ? `${results.length} temporadas processadas com sucesso, ${errors.length} falharam`
          : `${results.length} temporadas processadas com sucesso`,
      },
      { status: hasErrors && !hasSuccess ? 400 : 200 },
    );
  } catch (error) {
    console.error("Erro no gerenciamento de temporadas:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor no gerenciamento de temporadas",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/gamification/seasons/manage
 * Obter informações de gerenciamento (estatísticas, validações, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
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

    // Buscar todas as temporadas
    const allSeasons = await GamificationService.findAllSeasons();

    // Calcular estatísticas gerais
    const now = new Date();
    const activeSeasons = allSeasons.filter((s) => s.active);
    const upcomingSeasons = allSeasons.filter(
      (s) => s.active && new Date(s.startDate) > now,
    );
    const currentSeasons = allSeasons.filter(
      (s) =>
        s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now,
    );
    const endedSeasons = allSeasons.filter((s) => new Date(s.endDate) < now);

    // Verificar conflitos de datas
    const conflicts = [];
    for (let i = 0; i < activeSeasons.length; i++) {
      for (let j = i + 1; j < activeSeasons.length; j++) {
        const season1 = activeSeasons[i];
        const season2 = activeSeasons[j];

        const start1 = new Date(season1.startDate);
        const end1 = new Date(season1.endDate);
        const start2 = new Date(season2.startDate);
        const end2 = new Date(season2.endDate);

        // Verificar sobreposição
        if (start1 <= end2 && end1 >= start2) {
          conflicts.push({
            season1: { id: season1.id, name: season1.name },
            season2: { id: season2.id, name: season2.name },
            type: "date_overlap",
          });
        }
      }
    }

    // Calcular XP total por temporada
    const seasonStats = await Promise.all(
      allSeasons.map(async (season) => {
        try {
          const rankings = await GamificationService.calculateSeasonRankings(
            season.id,
          );
          const totalXp = rankings.reduce((sum, rank) => sum + rank.totalXp, 0);

          return {
            seasonId: season.id,
            name: season.name,
            totalParticipants: rankings.length,
            totalXp,
            averageXp:
              rankings.length > 0 ? Math.round(totalXp / rankings.length) : 0,
          };
        } catch (error) {
          return {
            seasonId: season.id,
            name: season.name,
            totalParticipants: 0,
            totalXp: 0,
            averageXp: 0,
            error: "Erro ao calcular estatísticas",
          };
        }
      }),
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            total: allSeasons.length,
            active: activeSeasons.length,
            upcoming: upcomingSeasons.length,
            current: currentSeasons.length,
            ended: endedSeasons.length,
          },
          conflicts,
          seasonStats,
          recommendations: {
            hasMultipleActive: activeSeasons.length > 1,
            hasConflicts: conflicts.length > 0,
            hasNoActive: activeSeasons.length === 0,
            shouldCreateNew:
              currentSeasons.length === 0 && upcomingSeasons.length === 0,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao obter informações de gerenciamento:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
