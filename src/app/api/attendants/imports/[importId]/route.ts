import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { importId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      !["SUPERADMIN", "ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 403 },
      );
    }

    const result = await prisma.attendant.deleteMany({
      where: { importId: params.importId },
    });
    const count = result.count;

    return NextResponse.json({
      success: true,
      data: { count },
      message: `${count} atendentes deletados com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao deletar atendentes por importação:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
