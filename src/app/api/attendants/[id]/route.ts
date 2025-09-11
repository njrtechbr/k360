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

    const attendant = await prisma.attendant.findUnique({
      where: { id: params.id },
    });
    if (!attendant) {
      return NextResponse.json(
        {
          success: false,
          error: "Atendente não encontrado",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: attendant,
    });
  } catch (error) {
    console.error("Erro ao buscar atendente:", error);
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

    if (
      !session?.user ||
      !["SUPERADMIN", "ADMIN", "SUPERVISOR"].includes(session.user.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 403 },
      );
    }

    const attendantData = await request.json();
    const attendant = await prisma.attendant.update({
      where: { id: params.id },
      data: attendantData,
    });

    return NextResponse.json({
      success: true,
      data: attendant,
      message: "Atendente atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar atendente:", error);
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

    await prisma.attendant.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Atendente deletado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar atendente:", error);
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
