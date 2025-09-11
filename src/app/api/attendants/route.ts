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
    const cpf = searchParams.get("cpf");
    const setor = searchParams.get("setor");
    const funcao = searchParams.get("funcao");

    // Buscar por email específico
    if (email) {
      const attendant = await prisma.attendant.findUnique({
        where: { email },
      });
      return NextResponse.json({
        success: true,
        data: attendant,
      });
    }

    // Buscar por CPF específico
    if (cpf) {
      const attendant = await prisma.attendant.findUnique({
        where: { cpf },
      });
      return NextResponse.json({
        success: true,
        data: attendant,
      });
    }

    // Buscar por setor
    if (setor) {
      const attendants = await prisma.attendant.findMany({
        where: { setor },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({
        success: true,
        data: attendants,
      });
    }

    // Buscar por função
    if (funcao) {
      const attendants = await prisma.attendant.findMany({
        where: { funcao },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({
        success: true,
        data: attendants,
      });
    }

    // Buscar todos os atendentes
    const attendants = await prisma.attendant.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      success: true,
      data: attendants,
    });
  } catch (error) {
    console.error("Erro ao buscar atendentes:", error);
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

    // Verificar se é importação em lote
    if (Array.isArray(attendantData)) {
      const attendants = [];
      for (const data of attendantData) {
        const attendant = await prisma.attendant.create({
          data,
        });
        attendants.push(attendant);
      }
      return NextResponse.json(
        {
          success: true,
          data: attendants,
          message: `${attendants.length} atendentes criados com sucesso`,
        },
        { status: 201 },
      );
    }

    // Criação individual
    const attendant = await prisma.attendant.create({
      data: attendantData,
    });

    return NextResponse.json(
      {
        success: true,
        data: attendant,
        message: "Atendente criado com sucesso",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar atendente:", error);
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
