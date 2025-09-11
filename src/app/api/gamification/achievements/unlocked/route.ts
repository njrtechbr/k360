import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/gamification/achievements/unlocked
// Buscar conquistas desbloqueadas de um atendente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get("attendantId");

    if (!attendantId) {
      return NextResponse.json(
        { error: "attendantId é obrigatório" },
        { status: 400 },
      );
    }

    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      where: { attendantId },
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

// POST /api/gamification/achievements/unlocked
// Desbloquear uma conquista para um atendente
export async function POST(request: NextRequest) {
  try {
    const { attendantId, achievementId } = await request.json();

    if (!attendantId || !achievementId) {
      return NextResponse.json(
        { error: "attendantId e achievementId são obrigatórios" },
        { status: 400 },
      );
    }

    // Verificar se já foi desbloqueada
    const existing = await prisma.unlockedAchievement.findUnique({
      where: {
        attendantId_achievementId: {
          attendantId,
          achievementId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Conquista já foi desbloqueada" },
        { status: 409 },
      );
    }

    // Buscar configuração da conquista
    const achievement = await prisma.achievementConfig.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: "Configuração de conquista não encontrada" },
        { status: 404 },
      );
    }

    // Desbloquear conquista
    const unlockedAchievement = await prisma.unlockedAchievement.create({
      data: {
        attendantId,
        achievementId,
        xpGained: achievement.xp,
      },
    });

    // Criar evento XP para a conquista se ela dá XP
    if (achievement.xp > 0) {
      // Buscar temporada ativa para aplicar multiplicador
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { active: true },
      });

      const multiplier = activeSeason?.xpMultiplier || 1;
      const finalPoints = achievement.xp * multiplier;

      await prisma.xpEvent.create({
        data: {
          attendantId,
          points: finalPoints,
          basePoints: achievement.xp,
          multiplier: multiplier,
          reason: `Conquista desbloqueada: ${achievement.title}`,
          type: "achievement",
          relatedId: unlockedAchievement.id,
          date: new Date(),
          seasonId: activeSeason?.id,
        },
      });
    }

    return NextResponse.json(unlockedAchievement, { status: 201 });
  } catch (error) {
    console.error("Erro ao desbloquear conquista:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
