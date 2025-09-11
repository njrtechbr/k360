import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AttendantImportService } from "@/services/attendantImportService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const imports = await AttendantImportService.findAll();
    return NextResponse.json({
      success: true,
      data: imports,
    });
  } catch (error) {
    console.error("Erro ao buscar importações de atendentes:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
