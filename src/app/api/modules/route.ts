import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
    const activeOnly = searchParams.get("active");

    // Buscar apenas módulos ativos
    if (activeOnly === "true") {
      const modules = await prisma.module.findMany({
        where: { active: true },
        include: { users: true },
      });
      return NextResponse.json({
        success: true,
        data: modules,
      });
    }

    // Buscar todos os módulos
    const modules = await prisma.module.findMany({
      include: { users: true },
    });
    return NextResponse.json({
      success: true,
      data: modules,
    });
  } catch (error) {
    console.error("Erro ao buscar módulos:", error);
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

export async function POST(request: NextRequest) {
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

    // Validar dados obrigatórios
    if (
      !moduleData.id ||
      !moduleData.name ||
      !moduleData.description ||
      !moduleData.path
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados obrigatórios: id, name, description, path",
        },
        { status: 400 },
      );
    }

    const module = await prisma.module.create({
      data: {
        id: moduleData.id,
        name: moduleData.name,
        description: moduleData.description,
        path: moduleData.path,
        active: moduleData.active ?? true,
      },
      include: { users: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: module,
        message: "Módulo criado com sucesso",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar módulo:", error);
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
