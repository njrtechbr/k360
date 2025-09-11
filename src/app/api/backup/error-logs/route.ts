import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  BackupErrorHandler,
  BackupErrorType,
  ErrorSeverity,
} from "@/services/backupErrorHandler";

/**
 * GET /api/backup/error-logs
 * Retorna logs de erro filtrados
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar permissões (apenas ADMIN e SUPERADMIN podem ver logs de erro)
    if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Sem permissão para acessar logs de erro" },
        { status: 403 },
      );
    }

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url);
    const errorType = searchParams.get("errorType") as BackupErrorType | null;
    const severity = searchParams.get("severity") as ErrorSeverity | null;
    const resolved =
      searchParams.get("resolved") === "true"
        ? true
        : searchParams.get("resolved") === "false"
          ? false
          : undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    // Validar parâmetros
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Parâmetro limit deve estar entre 1 e 1000" },
        { status: 400 },
      );
    }

    if (errorType && !Object.values(BackupErrorType).includes(errorType)) {
      return NextResponse.json(
        { error: "Tipo de erro inválido" },
        { status: 400 },
      );
    }

    if (severity && !Object.values(ErrorSeverity).includes(severity)) {
      return NextResponse.json(
        { error: "Severidade inválida" },
        { status: 400 },
      );
    }

    // Obter logs filtrados
    const logs = await BackupErrorHandler.getErrorLogs({
      errorType: errorType || undefined,
      severity: severity || undefined,
      resolved,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        logs,
        count: logs.length,
        filters: {
          errorType,
          severity,
          resolved,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          limit,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erro ao obter logs de erro:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor ao obter logs",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/backup/error-logs
 * Limpa logs antigos
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar permissões (apenas SUPERADMIN pode limpar logs)
    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Apenas SUPERADMIN pode limpar logs de erro" },
        { status: 403 },
      );
    }

    // Obter parâmetros do body
    const body = await request.json();
    const daysToKeep = body.daysToKeep || 30;

    // Validar parâmetros
    if (daysToKeep < 1 || daysToKeep > 365) {
      return NextResponse.json(
        { error: "Parâmetro daysToKeep deve estar entre 1 e 365" },
        { status: 400 },
      );
    }

    // Limpar logs antigos
    const removedCount = await BackupErrorHandler.cleanupOldLogs(daysToKeep);

    return NextResponse.json({
      success: true,
      data: {
        removedCount,
        daysToKeep,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erro ao limpar logs:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor ao limpar logs",
      },
      { status: 500 },
    );
  }
}
