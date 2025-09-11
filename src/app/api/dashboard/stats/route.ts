import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface DashboardStats {
  totalEvaluations: number;
  totalAttendants: number;
  averageRating: number;
  totalXp: number;
  activeSeasons: number;
  unlockedAchievements: number;
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

    const [
      totalEvaluations,
      totalAttendants,
      averageRatingResult,
      totalXpResult,
      activeSeasons,
      unlockedAchievements,
    ] = await Promise.all([
      prisma.evaluation.count(),
      prisma.attendant.count(),
      prisma.evaluation.aggregate({
        _avg: { nota: true },
      }),
      prisma.xpEvent.aggregate({
        _sum: { points: true },
      }),
      prisma.gamificationSeason.count({
        where: { active: true },
      }),
      prisma.unlockedAchievement.count(),
    ]);

    const stats: DashboardStats = {
      totalEvaluations,
      totalAttendants,
      averageRating: averageRatingResult._avg.nota || 0,
      totalXp: totalXpResult._sum.points || 0,
      activeSeasons,
      unlockedAchievements,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas gerais:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar estatísticas gerais",
      },
      { status: 500 },
    );
  }
}
