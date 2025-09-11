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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Ação de toggle active
    if (action === "toggle") {
      const currentModule = await prisma.module.findUnique({
        where: { id: params.id },
      });

      if (!currentModule) {
        return NextResponse.json(
          {
            success: false,
            error: "Módulo não encontrado",
          },
          { status: 404 },
        );
      }

      const module = await prisma.module.update({
        where: { id: params.id },
        data: { active: !currentModule.active },
        include: { users: true },
      });

      return NextResponse.json({
        success: true,
        data: module,
        message: `Módulo ${module.active ? "ativado" : "desativado"} com sucesso`,
      });
    }

    // Buscar módulo por ID
    const module = await prisma.module.findUnique({
      where: { id: params.id },
      include: { users: true },
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

    return NextResponse.json({
      success: true,
      data: module,
    });
  } catch (error) {
    console.error("Erro ao buscar módulo:", error);
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

    const moduleData = await request.json();

    // Verificar se o módulo existe
    const existingModule = await prisma.module.findUnique({
      where: { id: params.id },
    });

    if (!existingModule) {
      return NextResponse.json(
        {
          success: false,
          error: "Módulo não encontrado",
        },
        { status: 404 },
      );
    }

    const module = await prisma.module.update({
      where: { id: params.id },
      data: {
        ...(moduleData.name && { name: moduleData.name }),
        ...(moduleData.description && { description: moduleData.description }),
        ...(moduleData.path && { path: moduleData.path }),
        ...(typeof moduleData.active === "boolean" && {
          active: moduleData.active,
        }),
      },
      include: { users: true },
    });

    return NextResponse.json({
      success: true,
      data: module,
      message: "Módulo atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar módulo:", error);
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

    // Verificar se o módulo existe
    const existingModule = await prisma.module.findUnique({
      where: { id: params.id },
    });

    if (!existingModule) {
      return NextResponse.json(
        {
          success: false,
          error: "Módulo não encontrado",
        },
        { status: 404 },
      );
    }

    await prisma.module.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Módulo deletado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar módulo:", error);
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
