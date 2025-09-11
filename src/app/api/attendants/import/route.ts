import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AttendantImportService } from "@/services/attendantImportService";
import { AttendantService } from "@/services/attendantService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Debug logging
    console.log("🔍 Session debug:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se o usuário existe no banco de dados
    const userExists = await AttendantImportService.verifyUser(session.user.id);

    console.log("👤 User verification:", {
      sessionUserId: session.user.id,
      userExists: !!userExists,
    });

    if (!userExists) {
      console.error(
        "❌ User from session not found in database:",
        session.user.id,
      );
      return NextResponse.json(
        {
          error: "Usuário da sessão não encontrado no banco de dados",
          details:
            "Sua sessão pode estar desatualizada. Faça logout e login novamente.",
          sessionUserId: session.user.id,
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { attendants, fileName } = body;

    if (!attendants || !Array.isArray(attendants)) {
      return NextResponse.json(
        { error: "Lista de atendentes é obrigatória" },
        { status: 400 },
      );
    }

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "Nome do arquivo é obrigatório" },
        { status: 400 },
      );
    }

    // Criar o registro de importação e importar atendentes
    const result = await AttendantImportService.importAttendants({
      fileName,
      attendants,
      importedById: userExists.id,
    });

    return NextResponse.json({
      success: true,
      message: "Atendentes importados com sucesso",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao importar atendentes:", error);

    // Verificar se é erro de constraint única ou duplicata
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("violates unique constraint")
      ) {
        return NextResponse.json(
          {
            error:
              "Alguns atendentes já existem no sistema (email ou CPF duplicado)",
          },
          { status: 409 },
        );
      }

      // Log the actual error for debugging
      console.error("Detailed error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return NextResponse.json(
        { error: `Erro ao processar dados: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
