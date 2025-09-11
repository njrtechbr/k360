import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: params.id },
      include: {
        attendant: true,
      },
    });
    if (!evaluation) {
      return NextResponse.json(
        {
          success: false,
          error: "Avaliação não encontrada",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("Erro ao buscar avaliação:", error);
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const evaluationData = await request.json();
    const evaluation = await prisma.evaluation.update({
      where: { id: params.id },
      data: evaluationData,
      include: {
        attendant: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: evaluation,
      message: "Avaliação atualizada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar avaliação:", error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    await prisma.evaluation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Avaliação deletada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar avaliação:", error);
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
