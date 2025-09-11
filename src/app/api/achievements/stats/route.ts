import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  seasonId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});

export interface AchievementStats {
  overview: {
    totalAchievements: number;
    activeAchievements: number;
    totalUnlocked: number;
    uniqueUnlockers: number;
    totalXpAwarded: number;
    averageUnlocksPerAttendant: number;
  };
  byCategory: Array<{
    category: string;
    totalAchievements: number;
    totalUnlocked: number;
    unlockRate: number;
  }>;
  topAchievements: Array<{
    id: string;
    title: string;
    category: string;
    unlockCount: number;
    unlockRate: number;
    totalXpAwarded: number;
  }>;
  recentActivity: Array<{
    date: string;
    unlocksCount: number;
    xpAwarded: number;
  }>;
  leaderboard: Array<{
    attendantId: string;
    attendantName: string;
    unlockedCount: number;
    totalXp: number;
  }>;
}

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

    // Verificar permissões - todos os usuários autenticados podem ver estatísticas
    const { searchParams } = new URL(request.url);

    const queryParams = {
      seasonId: searchParams.get("seasonId") || undefined,
      period: searchParams.get("period") || undefined,
    };

    const { seasonId, period } = QuerySchema.parse(queryParams);

    // Determinar filtros de data
    let dateFilter: any = {};
    if (period !== "all") {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter.unlockedAt = { gte: startDate };
    }

    // Filtro de temporada
    let seasonFilter: any = {};
    if (seasonId) {
      seasonFilter.seasonId = seasonId;
    }

    const whereClause = { ...dateFilter, ...seasonFilter };

    // Buscar dados básicos
    const [
      totalAchievements,
      activeAchievements,
      totalUnlocked,
      uniqueUnlockers,
      totalXpAwarded,
      totalAttendants,
    ] = await Promise.all([
      prisma.achievementConfig.count(),
      prisma.achievementConfig.count({ where: { active: true } }),
      prisma.unlockedAchievement.count({ where: whereClause }),
      prisma.unlockedAchievement
        .findMany({
          where: whereClause,
          select: { attendantId: true },
          distinct: ["attendantId"],
        })
        .then((results) => results.length),
      prisma.unlockedAchievement
        .aggregate({
          where: whereClause,
          _sum: { xpGained: true },
        })
        .then((result) => result._sum.xpGained || 0),
      prisma.attendant.count({ where: { active: true } }),
    ]);

    // Estatísticas por categoria
    const categoryStats = await prisma.achievementConfig.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { active: true },
    });

    const categoryUnlocks = await prisma.unlockedAchievement.groupBy({
      by: ["achievement"],
      _count: { id: true },
      where: whereClause,
    });

    // Mapear unlocks por achievement para categoria
    const achievementCategories = await prisma.achievementConfig.findMany({
      select: { id: true, category: true },
    });

    const categoryMap = new Map(
      achievementCategories.map((a) => [a.id, a.category]),
    );
    const unlocksByCategory = new Map<string, number>();

    for (const unlock of categoryUnlocks) {
      const category =
        categoryMap.get(unlock.achievement as string) || "Outros";
      unlocksByCategory.set(
        category,
        (unlocksByCategory.get(category) || 0) + unlock._count.id,
      );
    }

    const byCategory = categoryStats.map((cat) => ({
      category: cat.category,
      totalAchievements: cat._count.id,
      totalUnlocked: unlocksByCategory.get(cat.category) || 0,
      unlockRate:
        cat._count.id > 0
          ? Math.round(
              ((unlocksByCategory.get(cat.category) || 0) / cat._count.id) *
                100,
            )
          : 0,
    }));

    // Top conquistas
    const topAchievements = await prisma.unlockedAchievement.groupBy({
      by: ["achievementId"],
      _count: { id: true },
      _sum: { xpGained: true },
      where: whereClause,
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const achievementDetails = await prisma.achievementConfig.findMany({
      where: { id: { in: topAchievements.map((ta) => ta.achievementId) } },
      select: { id: true, title: true, category: true },
    });

    const achievementDetailsMap = new Map(
      achievementDetails.map((a) => [a.id, a]),
    );

    const topAchievementsFormatted = topAchievements.map((ta) => {
      const details = achievementDetailsMap.get(ta.achievementId);
      return {
        id: ta.achievementId,
        title: (details as any)?.title || "Conquista Desconhecida",
        category: (details as any)?.category || "Outros",
        unlockCount: ta._count.id,
        unlockRate:
          totalAttendants > 0
            ? Math.round((ta._count.id / totalAttendants) * 100)
            : 0,
        totalXpAwarded: ta._sum.xpGained || 0,
      };
    });

    // Atividade recente (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUnlocks = await prisma.unlockedAchievement.findMany({
      where: {
        ...seasonFilter,
        unlockedAt: { gte: thirtyDaysAgo },
      },
      select: { unlockedAt: true, xpGained: true },
    });

    // Agrupar por dia
    const dailyActivity = new Map<string, { count: number; xp: number }>();

    for (const unlock of recentUnlocks) {
      const dateKey = unlock.unlockedAt.toISOString().split("T")[0];
      const current = dailyActivity.get(dateKey) || { count: 0, xp: 0 };
      dailyActivity.set(dateKey, {
        count: current.count + 1,
        xp: current.xp + unlock.xpGained,
      });
    }

    const recentActivity = Array.from(dailyActivity.entries())
      .map(([date, data]) => ({
        date,
        unlocksCount: data.count,
        xpAwarded: data.xp,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    // Leaderboard
    const leaderboard = await prisma.unlockedAchievement.groupBy({
      by: ["attendantId"],
      _count: { id: true },
      _sum: { xpGained: true },
      where: whereClause,
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const attendantDetails = await prisma.attendant.findMany({
      where: { id: { in: leaderboard.map((l) => l.attendantId) } },
      select: { id: true, name: true },
    });

    const attendantDetailsMap = new Map(
      attendantDetails.map((a) => [a.id, a.name]),
    );

    const leaderboardFormatted = leaderboard.map((l) => ({
      attendantId: l.attendantId,
      attendantName:
        attendantDetailsMap.get(l.attendantId) || "Atendente Desconhecido",
      unlockedCount: l._count.id,
      totalXp: l._sum.xpGained || 0,
    }));

    const stats: AchievementStats = {
      overview: {
        totalAchievements,
        activeAchievements,
        totalUnlocked,
        uniqueUnlockers,
        totalXpAwarded,
        averageUnlocksPerAttendant:
          totalAttendants > 0
            ? Math.round((totalUnlocked / totalAttendants) * 100) / 100
            : 0,
      },
      byCategory,
      topAchievements: topAchievementsFormatted,
      recentActivity,
      leaderboard: leaderboardFormatted,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas de conquistas:", error);

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
        error: "Falha ao buscar estatísticas de conquistas",
      },
      { status: 500 },
    );
  }
}
