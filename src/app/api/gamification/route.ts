import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_LEVEL_REWARDS,
} from "@/lib/achievements";

const INITIAL_GAMIFICATION_CONFIG = {
  ratingScores: { "5": 5, "4": 3, "3": 1, "2": -2, "1": -5 },
  achievements: INITIAL_ACHIEVEMENTS,
  levelRewards: INITIAL_LEVEL_REWARDS,
  seasons: [],
  globalXpMultiplier: 1,
};

const mergeAchievementsWithDefaults = (savedAchievements: any[]): any[] => {
  const savedAchievementsMap = new Map(
    savedAchievements.map((ach) => [ach.id, ach]),
  );
  return INITIAL_ACHIEVEMENTS.map((defaultAch) => ({
    ...defaultAch,
    ...savedAchievementsMap.get(defaultAch.id),
  }));
};

const mergeLevelRewardsWithDefaults = (savedRewards: any[]): any[] => {
  const savedRewardsMap = new Map(savedRewards.map((r) => [r.level, r]));
  return INITIAL_LEVEL_REWARDS.map((defaultReward) => ({
    ...defaultReward,
    ...savedRewardsMap.get(defaultReward.level),
  }));
};

export async function GET(request: NextRequest) {
  try {
    // Temporarily disable authentication for testing
    // Allow internal access for PrismaProvider without authentication
    // const userAgent = request.headers.get('user-agent') || '';
    // const isInternalRequest = userAgent.includes('node') || request.headers.get('x-internal-request') === 'true';

    // if (!isInternalRequest) {
    //   const session = await getServerSession(authOptions);
    //
    //   if (!session?.user?.id) {
    //     return NextResponse.json(
    //       { error: 'Não autorizado' },
    //       { status: 401 }
    //     );
    //   }
    // }

    // Buscar configuração de gamificação
    const config = await prisma.gamificationConfig.findFirst();

    // Buscar achievements e level rewards das novas tabelas separadas
    const achievementConfigs = await prisma.achievementConfig.findMany();
    const levelTrackConfigs = await prisma.levelTrackConfig.findMany();

    // Buscar seasons do modelo separado
    const seasons = await prisma.gamificationSeason.findMany({
      orderBy: { startDate: "asc" },
    });

    if (config) {
      // Transformar campos individuais em objeto ratingScores
      const ratingScores = {
        "1": config.ratingScore1,
        "2": config.ratingScore2,
        "3": config.ratingScore3,
        "4": config.ratingScore4,
        "5": config.ratingScore5,
      };

      // Converter dados das novas tabelas para o formato esperado
      const achievementsFromDb = achievementConfigs.map((config) => ({
        id: config.id,
        title: config.title,
        description: config.description,
        xp: config.xp,
        active: config.active,
        icon:
          INITIAL_ACHIEVEMENTS.find((a) => a.id === config.id)?.icon || "🏆",
        color:
          INITIAL_ACHIEVEMENTS.find((a) => a.id === config.id)?.color ||
          "bg-yellow-500",
        isUnlocked: false,
      }));

      const levelRewardsFromDb = levelTrackConfigs.map((config) => ({
        level: config.level,
        title: config.title,
        description: config.description,
        xp: config.xp,
        active: config.active,
        icon:
          INITIAL_LEVEL_REWARDS.find((r) => r.level === config.level)?.icon ||
          "🎯",
      }));

      const mergedAchievements =
        achievementsFromDb.length > 0
          ? mergeAchievementsWithDefaults(achievementsFromDb)
          : INITIAL_ACHIEVEMENTS;

      const mergedLevelRewards =
        levelRewardsFromDb.length > 0
          ? mergeLevelRewardsWithDefaults(levelRewardsFromDb)
          : INITIAL_LEVEL_REWARDS;

      const gamificationConfig = {
        ...config,
        ratingScores,
        achievements: mergedAchievements,
        levelRewards: mergedLevelRewards,
        seasons,
      };

      return NextResponse.json(gamificationConfig);
    } else {
      // Se não existe configuração, criar uma com valores padrão
      const newConfig = await prisma.gamificationConfig.create({
        data: {
          id: "main",
          ratingScore1: INITIAL_GAMIFICATION_CONFIG.ratingScores["1"],
          ratingScore2: INITIAL_GAMIFICATION_CONFIG.ratingScores["2"],
          ratingScore3: INITIAL_GAMIFICATION_CONFIG.ratingScores["3"],
          ratingScore4: INITIAL_GAMIFICATION_CONFIG.ratingScores["4"],
          ratingScore5: INITIAL_GAMIFICATION_CONFIG.ratingScores["5"],
          globalXpMultiplier: INITIAL_GAMIFICATION_CONFIG.globalXpMultiplier,
        },
      });

      // Criar achievements iniciais se não existirem
      if (achievementConfigs.length === 0) {
        await prisma.achievementConfig.createMany({
          data: INITIAL_ACHIEVEMENTS.map(
            ({ isUnlocked, icon, color, ...ach }) => ({
              ...ach,
              active: true,
            }),
          ),
        });
      }

      // Criar level rewards iniciais se não existirem
      if (levelTrackConfigs.length === 0) {
        await prisma.levelTrackConfig.createMany({
          data: INITIAL_LEVEL_REWARDS.map(({ icon, ...reward }) => ({
            ...reward,
            active: true,
          })),
        });
      }

      const ratingScores = {
        "1": newConfig.ratingScore1,
        "2": newConfig.ratingScore2,
        "3": newConfig.ratingScore3,
        "4": newConfig.ratingScore4,
        "5": newConfig.ratingScore5,
      };

      // Recarregar dados após criação inicial
      const finalAchievementConfigs = await prisma.achievementConfig.findMany();
      const finalLevelTrackConfigs = await prisma.levelTrackConfig.findMany();

      const achievementsFromDb = finalAchievementConfigs.map((config) => ({
        id: config.id,
        title: config.title,
        description: config.description,
        xp: config.xp,
        active: config.active,
        icon:
          INITIAL_ACHIEVEMENTS.find((a) => a.id === config.id)?.icon || "🏆",
        color:
          INITIAL_ACHIEVEMENTS.find((a) => a.id === config.id)?.color ||
          "bg-yellow-500",
        isUnlocked: false,
      }));

      const levelRewardsFromDb = finalLevelTrackConfigs.map((config) => ({
        level: config.level,
        title: config.title,
        description: config.description,
        xp: config.xp,
        active: config.active,
        icon:
          INITIAL_LEVEL_REWARDS.find((r) => r.level === config.level)?.icon ||
          "🎯",
      }));

      const gamificationConfig = {
        ...newConfig,
        ratingScores,
        achievements:
          achievementsFromDb.length > 0
            ? achievementsFromDb
            : INITIAL_ACHIEVEMENTS,
        levelRewards:
          levelRewardsFromDb.length > 0
            ? levelRewardsFromDb
            : INITIAL_LEVEL_REWARDS,
        seasons,
      };

      return NextResponse.json(gamificationConfig);
    }
  } catch (error) {
    console.error("Erro ao buscar configurações de gamificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { ratingScores, seasons, globalXpMultiplier } = body;

    // Atualizar configuração principal
    if (ratingScores || globalXpMultiplier !== undefined) {
      await prisma.gamificationConfig.upsert({
        where: { id: "main" },
        update: {
          ...(ratingScores && {
            ratingScore1: ratingScores["1"],
            ratingScore2: ratingScores["2"],
            ratingScore3: ratingScores["3"],
            ratingScore4: ratingScores["4"],
            ratingScore5: ratingScores["5"],
          }),
          ...(globalXpMultiplier !== undefined && { globalXpMultiplier }),
        },
        create: {
          id: "main",
          ratingScore1: ratingScores?.["1"] ?? -25,
          ratingScore2: ratingScores?.["2"] ?? -12,
          ratingScore3: ratingScores?.["3"] ?? 3,
          ratingScore4: ratingScores?.["4"] ?? 10,
          ratingScore5: ratingScores?.["5"] ?? 20,
          globalXpMultiplier: globalXpMultiplier ?? 1,
        },
      });
    }

    // Atualizar seasons se fornecidas
    if (seasons && Array.isArray(seasons)) {
      // Deletar todas as seasons existentes
      await prisma.gamificationSeason.deleteMany();

      // Criar as novas seasons
      if (seasons.length > 0) {
        await prisma.gamificationSeason.createMany({
          data: seasons.map((season: any) => ({
            id: season.id || crypto.randomUUID(),
            name: season.name,
            startDate: new Date(season.startDate),
            endDate: new Date(season.endDate),
            active: season.active,
            xpMultiplier: season.xpMultiplier,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
    });
  } catch (error) {
    console.error("Erro ao salvar configurações de gamificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
