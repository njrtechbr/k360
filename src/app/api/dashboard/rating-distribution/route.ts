import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
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

    const ratings = await prisma.evaluation.groupBy({
      by: ["nota"],
      _count: {
        nota: true,
      },
      orderBy: {
        nota: "asc",
      },
    });

    const totalEvaluations = ratings.reduce(
      (sum, rating) => sum + rating._count.nota,
      0,
    );

    const distribution: RatingDistribution[] = ratings.map((rating) => ({
      rating: rating.nota,
      count: rating._count.nota,
      percentage:
        totalEvaluations > 0
          ? (rating._count.nota / totalEvaluations) * 100
          : 0,
    }));

    return NextResponse.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("Erro ao buscar distribuição de notas:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar distribuição de notas",
      },
      { status: 500 },
    );
  }
}
