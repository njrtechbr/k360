import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BackupErrorHandler } from "@/services/backupErrorHandler";

/**
 * GET /api/backup/error-stats
 * Retorna estatísticas de erros de backup
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar permissões (apenas ADMIN e SUPERADMIN podem ver estatísticas de erro)
    if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Sem permissão para acessar estatísticas de erro" },
        { status: 403 },
      );
    }

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");

    // Validar parâmetros
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: "Parâmetro days deve estar entre 1 e 365" },
        { status: 400 },
      );
    }

    // Obter estatísticas de erro
    const stats = await BackupErrorHandler.getErrorStats(days);

    return NextResponse.json({
      success: true,
      data: {
        period: `${days} dias`,
        stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas de erro:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor ao obter estatísticas",
      },
      { status: 500 },
    );
  }
}
