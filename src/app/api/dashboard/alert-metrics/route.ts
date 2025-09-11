import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlertMetrics } from "@/types/dashboard";

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

    const { searchParams } = new URL(request.url);
    const lowSatisfactionThreshold = parseFloat(
      searchParams.get("lowSatisfactionThreshold") || "3.0",
    );
    const inactivityHours = parseInt(
      searchParams.get("inactivityHours") || "72",
    );

    // Validar parâmetros
    if (lowSatisfactionThreshold < 1 || lowSatisfactionThreshold > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Threshold de satisfação deve estar entre 1 e 5",
        },
        { status: 400 },
      );
    }

    if (inactivityHours < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Horas de inatividade deve ser maior que 0",
        },
        { status: 400 },
      );
    }

    // Contar alertas de satisfação baixa
    const lowSatisfactionCount = await detectLowSatisfactionAlerts(
      lowSatisfactionThreshold,
    );

    // Contar usuários inativos
    const inactiveUsersCount = await detectInactiveUsers(inactivityHours);

    // Buscar alertas do sistema
    const systemAlerts = await getSystemAlerts();

    const metrics: AlertMetrics = {
      lowSatisfactionCount,
      inactiveUsersCount,
      systemAlerts,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Erro ao buscar métricas de alertas:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar métricas de alertas",
      },
      { status: 500 },
    );
  }
}

async function detectLowSatisfactionAlerts(
  threshold: number = 3.0,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  const attendantsWithLowRating = await prisma.attendant.findMany({
    where: {
      evaluations: {
        some: {
          data: { gte: cutoffDate },
        },
      },
    },
    include: {
      evaluations: {
        where: {
          data: { gte: cutoffDate },
        },
        select: { nota: true },
      },
    },
  });

  let alertCount = 0;

  for (const attendant of attendantsWithLowRating) {
    if (attendant.evaluations.length === 0) continue;

    const average =
      attendant.evaluations.reduce(
        (sum, evaluation) => sum + evaluation.nota,
        0,
      ) / attendant.evaluations.length;

    if (average < threshold) {
      alertCount++;
    }
  }

  return alertCount;
}

async function detectInactiveUsers(
  inactivityHours: number = 72,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - inactivityHours);

  return await prisma.attendant.count({
    where: {
      AND: [
        {
          evaluations: {
            none: {
              data: { gte: cutoffDate },
            },
          },
        },
        {
          xpGrants: {
            none: {
              grantedAt: { gte: cutoffDate },
            },
          },
        },
      ],
    },
  });
}

async function getSystemAlerts(): Promise<AlertMetrics["systemAlerts"]> {
  const alerts: AlertMetrics["systemAlerts"] = [];

  // Verificar se há temporada ativa
  const activeSeason = await prisma.gamificationSeason.findFirst({
    where: { active: true },
  });

  if (!activeSeason) {
    alerts.push({
      id: "no-active-season",
      type: "system",
      message: "Nenhuma temporada de gamificação ativa encontrada",
      severity: "medium",
      createdAt: new Date(),
      resolved: false,
    });
  }

  // Verificar se há avaliações recentes (últimas 24h)
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  const recentEvaluations = await prisma.evaluation.count({
    where: { data: { gte: cutoffDate } },
  });

  if (recentEvaluations === 0) {
    alerts.push({
      id: "no-recent-evaluations",
      type: "system",
      message: "Nenhuma avaliação registrada nas últimas 24 horas",
      severity: "low",
      createdAt: new Date(),
      resolved: false,
    });
  }

  // Verificar média de satisfação muito baixa (< 2.0)
  const averageRating = await calculateAverageRating("24h");
  if (averageRating > 0 && averageRating < 2.0) {
    alerts.push({
      id: "very-low-satisfaction",
      type: "satisfaction",
      message: `Média de satisfação crítica: ${averageRating.toFixed(2)}`,
      severity: "high",
      createdAt: new Date(),
      resolved: false,
    });
  }

  return alerts;
}

async function calculateAverageRating(
  period?: "24h" | "7d" | "30d",
): Promise<number> {
  const where: any = {};

  if (period) {
    const cutoffDate = new Date();
    switch (period) {
      case "24h":
        cutoffDate.setHours(cutoffDate.getHours() - 24);
        break;
      case "7d":
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case "30d":
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
    }
    where.data = { gte: cutoffDate };
  }

  const result = await prisma.evaluation.aggregate({
    where,
    _avg: { nota: true },
  });

  return Number((result._avg.nota || 0).toFixed(2));
}
