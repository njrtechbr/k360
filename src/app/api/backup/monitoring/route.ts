import { NextRequest, NextResponse } from "next/server";
import { BackupMonitoring } from "@/services/backupMonitoring";
import { backupAuthMiddleware } from "@/lib/middleware/backupSecurityMiddleware";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e autorização
    const authResult = await backupAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "metrics";

    const monitoring = BackupMonitoring.getInstance();

    switch (action) {
      case "metrics":
        const metrics = await monitoring.collectMetrics();
        return NextResponse.json({ metrics });

      case "alerts":
        const includeResolved = searchParams.get("includeResolved") === "true";
        const alerts = monitoring.getAlerts(includeResolved);
        return NextResponse.json({ alerts });

      case "health":
        const healthCheck = await monitoring.performHealthCheck();
        return NextResponse.json({ healthCheck });

      default:
        return NextResponse.json(
          { error: "Ação não reconhecida" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Erro no endpoint de monitoramento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e autorização
    const authResult = await backupAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const body = await request.json();
    const { action, alertId } = body;

    const monitoring = BackupMonitoring.getInstance();

    switch (action) {
      case "resolve_alert":
        if (!alertId) {
          return NextResponse.json(
            { error: "ID do alerta é obrigatório" },
            { status: 400 },
          );
        }

        const resolved = await monitoring.resolveAlert(alertId);
        if (!resolved) {
          return NextResponse.json(
            { error: "Alerta não encontrado" },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          message: "Alerta resolvido",
        });

      case "start_monitoring":
        await monitoring.startMonitoring();
        return NextResponse.json({
          success: true,
          message: "Monitoramento iniciado",
        });

      case "stop_monitoring":
        await monitoring.stopMonitoring();
        return NextResponse.json({
          success: true,
          message: "Monitoramento parado",
        });

      case "force_cleanup":
        await monitoring.performAutomaticCleanup();
        return NextResponse.json({
          success: true,
          message: "Limpeza executada",
        });

      case "force_health_check":
        const healthCheck = await monitoring.performHealthCheck();
        return NextResponse.json({ success: true, healthCheck });

      default:
        return NextResponse.json(
          { error: "Ação não reconhecida" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Erro no endpoint de monitoramento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
