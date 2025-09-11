import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScoreFromRating } from "@/lib/gamification";
import { AchievementApiClient } from "@/services/achievementApiClient";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { evaluationData, gamificationConfig, activeSeason } = body;

    if (!evaluationData) {
      return NextResponse.json(
        { error: "Dados da avaliação são obrigatórios" },
        { status: 400 },
      );
    }

    const evaluationDate = new Date(evaluationData.data);
    const baseScore = getScoreFromRating(
      evaluationData.nota,
      gamificationConfig.ratingScores,
    );

    let xpGained = baseScore;
    if (
      activeSeason &&
      evaluationDate >= new Date(activeSeason.startDate) &&
      evaluationDate <= new Date(activeSeason.endDate)
    ) {
      const totalMultiplier =
        gamificationConfig.globalXpMultiplier * activeSeason.xpMultiplier;
      xpGained = baseScore * totalMultiplier;
    }

    const newEvaluation = {
      ...evaluationData,
      data: evaluationData.data || new Date().toISOString(),
      xpGained,
    };

    const finalEvaluation = await prisma.evaluation.create({
      data: newEvaluation,
    });

    // Criar evento XP para a avaliação
    await prisma.xpEvent.create({
      data: {
        attendantId: finalEvaluation.attendantId,
        points: xpGained,
        basePoints: baseScore,
        multiplier: activeSeason
          ? gamificationConfig.globalXpMultiplier * activeSeason.xpMultiplier
          : gamificationConfig.globalXpMultiplier,
        reason: `Avaliação ${finalEvaluation.nota} estrelas`,
        type: "EVALUATION",
        relatedId: finalEvaluation.id,
        date: evaluationDate,
        seasonId: activeSeason?.id || null,
      },
    });

    // Verificar e desbloquear conquistas
    let achievementResults = null;
    try {
      achievementResults =
        await AchievementApiClient.checkAndUnlockAchievements(
          finalEvaluation.attendantId,
          evaluationDate,
        );

      if (achievementResults.newAchievements.length > 0) {
        console.log(
          `🏆 ${achievementResults.newAchievements.length} nova(s) conquista(s) desbloqueada(s) para atendente ${finalEvaluation.attendantId}`,
        );
      }
    } catch (error) {
      console.error("Erro ao verificar conquistas:", error);
      // Não falhar a criação da avaliação por causa de erro nas conquistas
    }

    return NextResponse.json(
      {
        evaluation: finalEvaluation,
        xpGained,
        achievements: achievementResults?.newAchievements || [],
        totalAchievementXp: achievementResults?.totalXpAwarded || 0,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
