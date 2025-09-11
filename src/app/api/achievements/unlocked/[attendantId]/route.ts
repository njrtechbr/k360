import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  seasonId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  attendantId: string;
  seasonId: string;
  unlockedAt: Date;
  xpGained: number;
  achievement: {
    id: string;
    title: string;
    description: string;
    icon: string;
    xp: number;
    category: string;
  };
  season: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
}

export interface UnlockedAchievementsResponse {
  achievements: UnlockedAchievement[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalUnlocked: number;
    totalXpGained: number;
    currentSeasonUnlocked: number;
    currentSeasonXp: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { attendantId: string } },
) {
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

    const { attendantId } = params;
    const { searchParams } = new URL(request.url);

    const queryParams = {
      seasonId: searchParams.get("seasonId") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const { seasonId, limit, offset } = QuerySchema.parse(queryParams);

    // Verificar se o atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId },
      include: { user: true },
    });

    if (!attendant) {
      return NextResponse.json(
        {
          success: false,
          error: "Atendente não encontrado",
        },
        { status: 404 },
      );
    }

    // Verificar permissões
    const userRole = session.user.role;
    if (!["ADMIN", "SUPERADMIN"].includes(userRole)) {
      if (attendant.userId !== session.user.id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Você só pode visualizar conquistas dos seus próprios atendentes",
          },
          { status: 403 },
        );
      }
    }

    // Construir filtros
    const whereClause: any = { attendantId };

    if (seasonId) {
      whereClause.seasonId = seasonId;
    }

    // Buscar conquistas desbloqueadas com paginação
    const [unlockedAchievements, totalCount] = await Promise.all([
      prisma.unlockedAchievement.findMany({
        where: whereClause,
        include: {
          achievement: true,
          season: true,
        },
        orderBy: { unlockedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.unlockedAchievement.count({
        where: whereClause,
      }),
    ]);

    // Buscar temporada atual para estatísticas
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    // Calcular estatísticas gerais
    const [totalStats, currentSeasonStats] = await Promise.all([
      prisma.unlockedAchievement.aggregate({
        where: { attendantId },
        _count: { id: true },
        _sum: { xpGained: true },
      }),
      currentSeason
        ? prisma.unlockedAchievement.aggregate({
            where: {
              attendantId,
              seasonId: currentSeason.id,
            },
            _count: { id: true },
            _sum: { xpGained: true },
          })
        : null,
    ]);

    const achievements: UnlockedAchievement[] = unlockedAchievements.map(
      (ua) => ({
        id: ua.id,
        achievementId: ua.achievementId,
        attendantId: ua.attendantId,
        seasonId: ua.seasonId,
        unlockedAt: ua.unlockedAt,
        xpGained: ua.xpGained,
        achievement: {
          id: ua.achievement.id,
          title: ua.achievement.title,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          xp: ua.achievement.xp,
          category: ua.achievement.category,
        },
        season: {
          id: ua.season.id,
          name: ua.season.name,
          startDate: ua.season.startDate,
          endDate: ua.season.endDate,
        },
      }),
    );

    const response: UnlockedAchievementsResponse = {
      achievements,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      summary: {
        totalUnlocked: totalStats._count.id || 0,
        totalXpGained: totalStats._sum.xpGained || 0,
        currentSeasonUnlocked: currentSeasonStats?._count.id || 0,
        currentSeasonXp: currentSeasonStats?._sum.xpGained || 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Erro ao buscar conquistas desbloqueadas:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Parâmetros inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar conquistas desbloqueadas",
      },
      { status: 500 },
    );
  }
}
