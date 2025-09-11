import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export interface RecentActivity {
  id: string;
  type:
    | "evaluation"
    | "achievement"
    | "xp_event"
    | "attendant_added"
    | "season_started";
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  attendant?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    rating?: number;
    xp?: number;
    achievement?: string;
  };
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
    const limit = parseInt(searchParams.get("limit") || "20");

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro limit deve estar entre 1 e 100",
        },
        { status: 400 },
      );
    }

    const activities: RecentActivity[] = [];

    // Buscar avaliações recentes
    const recentEvaluations = await prisma.evaluation.findMany({
      take: Math.floor(limit * 0.4),
      orderBy: { data: "desc" },
      include: {
        attendant: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    recentEvaluations.forEach((evaluation) => {
      activities.push({
        id: `eval-${evaluation.id}`,
        type: "evaluation",
        title: "Nova Avaliação",
        description: `Avaliação de ${evaluation.nota} estrelas para ${evaluation.attendant.name}`,
        timestamp: evaluation.data,
        attendant: {
          id: evaluation.attendant.id,
          name: evaluation.attendant.name,
          avatar: evaluation.attendant.avatarUrl || undefined,
        },
        metadata: {
          rating: evaluation.nota,
        },
      });
    });

    // Buscar conquistas recentes
    const recentAchievements = await prisma.unlockedAchievement.findMany({
      take: Math.floor(limit * 0.3),
      orderBy: { unlockedAt: "desc" },
      include: {
        attendant: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Buscar informações das conquistas separadamente
    const achievementIds = recentAchievements.map((ua) => ua.achievementId);
    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { id: { in: achievementIds } },
      select: { id: true, title: true, xp: true },
    });

    const achievementMap = new Map(achievementConfigs.map((ac) => [ac.id, ac]));

    recentAchievements.forEach((achievement) => {
      const achievementConfig = achievementMap.get(achievement.achievementId);
      if (achievementConfig) {
        activities.push({
          id: `achievement-${achievement.id}`,
          type: "achievement",
          title: "Conquista Desbloqueada",
          description: `${achievement.attendant.name} desbloqueou "${achievementConfig.title}"`,
          timestamp: achievement.unlockedAt,
          attendant: {
            id: achievement.attendant.id,
            name: achievement.attendant.name,
            avatar: achievement.attendant.avatarUrl || undefined,
          },
          metadata: {
            achievement: achievementConfig.title,
            xp: achievementConfig.xp,
          },
        });
      }
    });

    // Buscar eventos XP recentes (apenas manuais para não duplicar com avaliações)
    const recentXpEvents = await prisma.xpEvent.findMany({
      take: Math.floor(limit * 0.2),
      orderBy: { date: "desc" },
      where: {
        type: "manual",
      },
      include: {
        attendant: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    recentXpEvents.forEach((xpEvent) => {
      activities.push({
        id: `xp-${xpEvent.id}`,
        type: "xp_event",
        title: "XP Concedido",
        description: `${xpEvent.attendant.name} recebeu ${xpEvent.points} XP - ${xpEvent.reason}`,
        timestamp: xpEvent.date,
        attendant: {
          id: xpEvent.attendant.id,
          name: xpEvent.attendant.name,
          avatar: xpEvent.attendant.avatarUrl || undefined,
        },
        metadata: {
          xp: xpEvent.points,
        },
      });
    });

    // Buscar atendentes adicionados recentemente
    const recentAttendants = await prisma.attendant.findMany({
      take: Math.floor(limit * 0.1),
      orderBy: { dataAdmissao: "desc" },
      where: {
        dataAdmissao: {
          gte: subDays(new Date(), 30), // Últimos 30 dias
        },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        dataAdmissao: true,
      },
    });

    recentAttendants.forEach((attendant) => {
      activities.push({
        id: `attendant-${attendant.id}`,
        type: "attendant_added",
        title: "Novo Atendente",
        description: `${attendant.name} foi adicionado à equipe`,
        timestamp: attendant.dataAdmissao,
        attendant: {
          id: attendant.id,
          name: attendant.name,
          avatar: attendant.avatarUrl || undefined,
        },
      });
    });

    // Ordenar todas as atividades por timestamp e limitar
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: sortedActivities,
    });
  } catch (error) {
    console.error("Erro ao buscar atividades recentes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar atividades recentes",
      },
      { status: 500 },
    );
  }
}
