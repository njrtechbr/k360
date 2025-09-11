import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const { importId } = await params;

    if (!importId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID da importação é obrigatório",
        },
        { status: 400 },
      );
    }

    const result = await prisma.evaluation.deleteMany({
      where: { importId },
    });
    const deletedCount = result.count;

    return NextResponse.json({
      success: true,
      data: { count: deletedCount },
      message: `${deletedCount} avaliações deletadas com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao deletar avaliações por importação:", error);
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const { importId } = await params;

    if (!importId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID da importação é obrigatório",
        },
        { status: 400 },
      );
    }

    // Por enquanto, retornar informação básica
    // TODO: Implementar busca de detalhes da importação via API
    return NextResponse.json({
      success: true,
      data: {
        id: importId,
        message: "Endpoint de detalhes da importação ainda não implementado",
      },
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes da importação:", error);
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
