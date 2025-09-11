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
    const attendantId = searchParams.get("attendantId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Buscar por atendente específico
    if (attendantId) {
      const evaluations = await prisma.evaluation.findMany({
        where: { attendantId },
        include: {
          attendant: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        success: true,
        data: evaluations,
      });
    }

    // Buscar por período
    if (startDate && endDate) {
      const evaluations = await prisma.evaluation.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          attendant: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({
        success: true,
        data: evaluations,
      });
    }

    // Buscar todas as avaliações
    const evaluations = await prisma.evaluation.findMany({
      include: {
        attendant: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
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

    // Verificar se é importação em lote
    if (Array.isArray(evaluationData)) {
      const evaluations = [];
      for (const data of evaluationData) {
        const evaluation = await prisma.evaluation.create({
          data,
          include: {
            attendant: true,
          },
        });
        evaluations.push(evaluation);
      }
      return NextResponse.json(
        {
          success: true,
          data: evaluations,
          message: `${evaluations.length} avaliações criadas com sucesso`,
        },
        { status: 201 },
      );
    }

    // Criação individual
    const evaluation = await prisma.evaluation.create({
      data: evaluationData,
      include: {
        attendant: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: evaluation,
        message: "Avaliação criada com sucesso",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
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
