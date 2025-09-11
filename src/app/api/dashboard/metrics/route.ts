import { NextRequest, NextResponse } from "next/server";
import { DashboardMetrics } from "@/types/dashboard";
import { logError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseUrl = new URL(request.url).origin;

    // Parâmetros para as diferentes métricas
    const seasonId = searchParams.get("seasonId");
    const satisfactionPeriod = searchParams.get("satisfactionPeriod") || "7d";
    const lowSatisfactionThreshold =
      searchParams.get("lowSatisfactionThreshold") || "2.5";
    const inactivityHours = searchParams.get("inactivityHours") || "48";

    // Fazer chamadas paralelas para todas as métricas
    const [gamificationResponse, satisfactionResponse, alertsResponse] =
      await Promise.all([
        fetch(
          `${baseUrl}/api/dashboard/gamification${seasonId ? `?seasonId=${seasonId}` : ""}`,
        ),
        fetch(
          `${baseUrl}/api/dashboard/satisfaction?period=${satisfactionPeriod}`,
        ),
        fetch(
          `${baseUrl}/api/dashboard/alerts?lowSatisfactionThreshold=${lowSatisfactionThreshold}&inactivityHours=${inactivityHours}`,
        ),
      ]);

    // Verificar se todas as respostas foram bem-sucedidas
    if (
      !gamificationResponse.ok ||
      !satisfactionResponse.ok ||
      !alertsResponse.ok
    ) {
      throw new Error("Falha ao buscar uma ou mais métricas");
    }

    // Extrair dados das respostas
    const [gamification, satisfaction, alerts] = await Promise.all([
      gamificationResponse.json(),
      satisfactionResponse.json(),
      alertsResponse.json(),
    ]);

    const metrics: DashboardMetrics = {
      gamification,
      satisfaction,
      alerts,
      lastUpdated: new Date(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logError(error as Error, "API.dashboard.metrics");
    return NextResponse.json(
      { error: "Falha ao buscar métricas do dashboard" },
      { status: 500 },
    );
  }
}
