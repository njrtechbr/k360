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
    const email = searchParams.get("email");
    const checkSuperAdmin = searchParams.get("checkSuperAdmin");

    // Buscar por email específico
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      return NextResponse.json({
        success: true,
        data: user,
      });
    }

    // Verificar se existe super admin
    if (checkSuperAdmin === "true") {
      const superAdmin = await prisma.user.findFirst({
        where: { role: "SUPERADMIN" },
      });
      const hasSuperAdmin = !!superAdmin;
      return NextResponse.json({
        success: true,
        data: { hasSuperAdmin },
      });
    }

    // Buscar todos os usuários
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
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

    const userData = await request.json();
    const user = await prisma.user.create({
      data: userData,
    });

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: "Usuário criado com sucesso",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
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
