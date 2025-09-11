import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
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

    // Verificar se o módulo existe
    const module = await prisma.module.findUnique({
      where: { id: params.id },
    });

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          error: "Módulo não encontrado",
        },
        { status: 404 },
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não encontrado",
        },
        { status: 404 },
      );
    }

    // Remover usuário do módulo
    const updatedModule = await prisma.module.update({
      where: { id: params.id },
      data: {
        users: {
          disconnect: { id: params.userId },
        },
      },
      include: { users: true },
    });

    return NextResponse.json({
      success: true,
      data: updatedModule,
      message: "Usuário removido do módulo com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover usuário do módulo:", error);
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
