import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface TopPerformers {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  evaluationCount: number;
  averageRating: number;
  position: number;
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
    const limit = parseInt(searchParams.get("limit") || "10");

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro limit deve estar entre 1 e 100",
        },
        { status: 400 },
      );
    }

    // Buscar XP por atendente
    const xpByAttendant = await prisma.xpEvent.groupBy({
      by: ["attendantId"],
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: "desc",
        },
      },
      take: limit,
    });

    // Buscar dados dos atendentes e suas avaliações
    const attendantIds = xpByAttendant.map((x) => x.attendantId);

    const [attendants, evaluationStats] = await Promise.all([
      prisma.attendant.findMany({
        where: {
          id: { in: attendantIds },
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.evaluation.groupBy({
        by: ["attendantId"],
        where: {
          attendantId: { in: attendantIds },
        },
        _count: {
          id: true,
        },
        _avg: {
          nota: true,
        },
      }),
    ]);

    const attendantMap = new Map(attendants.map((a) => [a.id, a.name]));
    const evaluationMap = new Map(
      evaluationStats.map((e) => [
        e.attendantId,
        { count: e._count.id, average: e._avg.nota || 0 },
      ]),
    );

    const topPerformers: TopPerformers[] = xpByAttendant.map((item, index) => ({
      attendantId: item.attendantId,
      attendantName: attendantMap.get(item.attendantId) || "Desconhecido",
      totalXp: item._sum.points || 0,
      evaluationCount: evaluationMap.get(item.attendantId)?.count || 0,
      averageRating: evaluationMap.get(item.attendantId)?.average || 0,
      position: index + 1,
    }));

    return NextResponse.json({
      success: true,
      data: topPerformers,
    });
  } catch (error) {
    console.error("Erro ao buscar top performers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar top performers",
      },
      { status: 500 },
    );
  }
}
