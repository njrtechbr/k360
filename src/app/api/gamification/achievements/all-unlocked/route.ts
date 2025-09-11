import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/gamification/achievements/all-unlocked
// Buscar todas as conquistas desbloqueadas de todos os atendentes
export async function GET(request: NextRequest) {
  try {
    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      orderBy: { unlockedAt: "desc" },
    });

    return NextResponse.json(unlockedAchievements);
  } catch (error) {
    console.error("Erro ao buscar conquistas desbloqueadas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
