import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface EvaluationTrend {
  date: string;
  count: number;
  averageRating: number;
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
    const days = parseInt(searchParams.get("days") || "30");

    if (days < 1 || days > 365) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro days deve estar entre 1 e 365",
        },
        { status: 400 },
      );
    }

    const startDate = subDays(new Date(), days);

    const evaluations = await prisma.evaluation.findMany({
      where: {
        data: {
          gte: startDate,
        },
      },
      select: {
        data: true,
        nota: true,
      },
    });

    // Agrupar por data
    const groupedByDate = evaluations.reduce(
      (acc, evaluation) => {
        const dateKey = format(evaluation.data, "yyyy-MM-dd");
        if (!acc[dateKey]) {
          acc[dateKey] = { ratings: [], count: 0 };
        }
        acc[dateKey].ratings.push(evaluation.nota);
        acc[dateKey].count++;
        return acc;
      },
      {} as Record<string, { ratings: number[]; count: number }>,
    );

    // Converter para array e calcular médias
    const trend: EvaluationTrend[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, "yyyy-MM-dd");
      const data = groupedByDate[dateKey];

      trend.push({
        date: format(date, "dd/MM", { locale: ptBR }),
        count: data?.count || 0,
        averageRating: data
          ? data.ratings.reduce((sum, rating) => sum + rating, 0) /
            data.ratings.length
          : 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error("Erro ao buscar tendência de avaliações:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar tendência de avaliações",
      },
      { status: 500 },
    );
  }
}
