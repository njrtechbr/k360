import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AlertMetrics } from "@/types/dashboard";
import { logError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lowSatisfactionThreshold =
      Number(searchParams.get("lowSatisfactionThreshold")) || 2.5;
    const inactivityHours = Number(searchParams.get("inactivityHours")) || 48;

    // Detectar alertas de baixa satisfação
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    const lowSatisfactionCount = await prisma.evaluation.count({
      where: {
        nota: { lte: lowSatisfactionThreshold },
        data: { gte: cutoffDate },
      },
    });

    // Detectar usuários inativos
    const inactivityCutoff = new Date();
    inactivityCutoff.setHours(inactivityCutoff.getHours() - inactivityHours);

    const totalAttendants = await prisma.attendant.count();
    const activeAttendants = await prisma.attendant.count({
      where: {
        OR: [
          {
            evaluations: {
              some: { data: { gte: inactivityCutoff } },
            },
          },
          {
            xpGrants: {
              some: { grantedAt: { gte: inactivityCutoff } },
            },
          },
        ],
      },
    });

    const inactiveUsersCount = totalAttendants - activeAttendants;

    // Gerar alertas do sistema
    const systemAlerts = [];

    if (lowSatisfactionCount > 0) {
      systemAlerts.push({
        id: `low-satisfaction-${Date.now()}`,
        type: "satisfaction" as const,
        message: `${lowSatisfactionCount} avaliações com nota baixa nas últimas 24h`,
        severity:
          lowSatisfactionCount > 5 ? ("high" as const) : ("medium" as const),
        createdAt: new Date(),
        resolved: false,
      });
    }

    if (inactiveUsersCount > 0) {
      systemAlerts.push({
        id: `inactive-users-${Date.now()}`,
        type: "inactivity" as const,
        message: `${inactiveUsersCount} usuários inativos há mais de ${inactivityHours}h`,
        severity:
          inactiveUsersCount > 10 ? ("high" as const) : ("medium" as const),
        createdAt: new Date(),
        resolved: false,
      });
    }

    const metrics: AlertMetrics = {
      lowSatisfactionCount,
      inactiveUsersCount,
      systemAlerts,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logError(error as Error, "API.dashboard.alerts");
    return NextResponse.json(
      { error: "Falha ao buscar métricas de alertas" },
      { status: 500 },
    );
  }
}
