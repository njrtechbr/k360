import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/gamification/achievements/season/[seasonId]
// Buscar conquistas desbloqueadas de uma temporada específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> },
) {
  try {
    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId é obrigatório" },
        { status: 400 },
      );
    }

    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      where: { seasonId },
      include: {
        attendant: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { unlockedAt: "desc" },
    });

    return NextResponse.json(unlockedAchievements);
  } catch (error) {
    console.error("Erro ao buscar conquistas da temporada:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
