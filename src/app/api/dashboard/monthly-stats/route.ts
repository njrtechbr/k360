import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MonthlyStats {
  month: string;
  evaluations: number;
  averageRating: number;
  xpGenerated: number;
}

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
    const months = parseInt(searchParams.get("months") || "6");

    if (months < 1 || months > 24) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro months deve estar entre 1 e 24",
        },
        { status: 400 },
      );
    }

    const results: MonthlyStats[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);

      const [evaluationStats, xpStats] = await Promise.all([
        prisma.evaluation.aggregate({
          where: {
            data: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: { id: true },
          _avg: { nota: true },
        }),
        prisma.xpEvent.aggregate({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            type: "evaluation",
          },
          _sum: { points: true },
        }),
      ]);

      results.push({
        month: format(date, "MMM/yy", { locale: ptBR }),
        evaluations: evaluationStats._count.id,
        averageRating: evaluationStats._avg.nota || 0,
        xpGenerated: xpStats._sum.points || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas mensais:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar estatísticas mensais",
      },
      { status: 500 },
    );
  }
}
