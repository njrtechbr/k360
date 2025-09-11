import { NextRequest, NextResponse } from "next/server";
import { AchievementApiClient } from "@/services/achievementApiClient";

// GET /api/gamification/achievements/check/[attendantId]
// Verificar status das conquistas de um atendente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attendantId: string }> },
) {
  try {
    const { attendantId } = await params;

    if (!attendantId) {
      return NextResponse.json(
        { error: "ID do atendente é obrigatório" },
        { status: 400 },
      );
    }

    const achievementStatus =
      await AchievementApiClient.getAttendantAchievementStatus(attendantId);

    return NextResponse.json({
      attendantId,
      achievements: achievementStatus,
      summary: {
        total: achievementStatus.length,
        unlocked: achievementStatus.filter((a) => a.isUnlocked).length,
        progress:
          achievementStatus.length > 0
            ? Math.round(
                (achievementStatus.filter((a) => a.isUnlocked).length /
                  achievementStatus.length) *
                  100,
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar conquistas do atendente:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST /api/gamification/achievements/check/[attendantId]
// Forçar verificação e desbloqueio de conquistas para um atendente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attendantId: string }> },
) {
  try {
    const { attendantId } = await params;

    if (!attendantId) {
      return NextResponse.json(
        { error: "ID do atendente é obrigatório" },
        { status: 400 },
      );
    }

    const achievementResults =
      await AchievementApiClient.checkAndUnlockAchievements(
        attendantId,
        new Date(),
      );

    return NextResponse.json({
      attendantId,
      newAchievements: achievementResults.newAchievements,
      totalXpAwarded: achievementResults.totalXpAwarded,
      message:
        achievementResults.newAchievements.length > 0
          ? `${achievementResults.newAchievements.length} nova(s) conquista(s) desbloqueada(s)!`
          : "Nenhuma nova conquista desbloqueada",
    });
  } catch (error) {
    console.error("Erro ao verificar conquistas do atendente:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
