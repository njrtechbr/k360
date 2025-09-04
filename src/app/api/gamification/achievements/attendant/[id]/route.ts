import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AchievementsService } from '@/services/gamification';

const prisma = new PrismaClient();

// GET /api/gamification/achievements/attendant/[id]
// Buscar achievements de um atendente específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeRecent = searchParams.get('includeRecent') === 'true';
    const category = searchParams.get('category');
    const unlockedOnly = searchParams.get('unlockedOnly') === 'true';

    // Verificar se atendente existe
    const attendant = await prisma.user.findUnique({
      where: { id: attendantId },
      select: { id: true, name: true, email: true, department: true }
    });

    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar achievements do atendente
    let whereClause: any = {};
    if (category) {
      whereClause.achievement = { category };
    }

    const attendantAchievements = await prisma.attendantAchievement.findMany({
      where: {
        attendantId,
        ...whereClause
      },
      include: {
        achievement: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    // Buscar todos os achievements para comparação
    const allAchievements = await prisma.achievement.findMany({
      where: category ? { category } : {},
      orderBy: { difficulty: 'asc' }
    });

    // Combinar dados
    const achievementsWithProgress = allAchievements.map(achievement => {
      const attendantProgress = attendantAchievements.find(
        aa => aa.achievementId === achievement.id
      );
      
      return {
        ...achievement,
        isUnlocked: !!attendantProgress,
        unlockedAt: attendantProgress?.unlockedAt || null,
        progress: attendantProgress?.progress || 0
      };
    });

    // Filtrar apenas desbloqueados se solicitado
    let filteredAchievements = unlockedOnly 
      ? achievementsWithProgress.filter(a => a.isUnlocked)
      : achievementsWithProgress;

    let result: any = {
      attendant,
      achievements: filteredAchievements,
      summary: {
        total: allAchievements.length,
        unlocked: attendantAchievements.length,
        progress: allAchievements.length > 0 
          ? (attendantAchievements.length / allAchievements.length) * 100 
          : 0
      }
    };

    // Incluir achievements recentes se solicitado
    if (includeRecent) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentAchievements = attendantAchievements.filter(
        aa => aa.unlockedAt && aa.unlockedAt >= thirtyDaysAgo
      );

      result.recentAchievements = recentAchievements.map(aa => ({
        ...aa.achievement,
        unlockedAt: aa.unlockedAt
      }));
    }

    // Incluir estatísticas detalhadas se solicitado
    if (includeStats) {
      // Estatísticas por categoria
      const categoryStats = await Promise.all(
        ['ATTENDANCE', 'PERFORMANCE', 'ENGAGEMENT', 'MILESTONE'].map(async (cat) => {
          const categoryAchievements = allAchievements.filter(a => a.category === cat);
          const unlockedInCategory = attendantAchievements.filter(
            aa => aa.achievement.category === cat
          );
          
          return {
            category: cat,
            total: categoryAchievements.length,
            unlocked: unlockedInCategory.length,
            progress: categoryAchievements.length > 0 
              ? (unlockedInCategory.length / categoryAchievements.length) * 100 
              : 0
          };
        })
      );

      // Estatísticas por dificuldade
      const difficultyStats = await Promise.all(
        ['EASY', 'MEDIUM', 'HARD', 'LEGENDARY'].map(async (diff) => {
          const difficultyAchievements = allAchievements.filter(a => a.difficulty === diff);
          const unlockedInDifficulty = attendantAchievements.filter(
            aa => aa.achievement.difficulty === diff
          );
          
          return {
            difficulty: diff,
            total: difficultyAchievements.length,
            unlocked: unlockedInDifficulty.length,
            progress: difficultyAchievements.length > 0 
              ? (unlockedInDifficulty.length / difficultyAchievements.length) * 100 
              : 0
          };
        })
      );

      // XP total dos achievements
      const totalXpFromAchievements = attendantAchievements.reduce(
        (sum, aa) => sum + (aa.achievement.xpReward || 0), 0
      );

      // Próximos achievements sugeridos
      const nextAchievements = AchievementsService.findNewlyUnlockedAchievements(
        allAchievements,
        attendantAchievements.map(aa => aa.achievement)
      ).slice(0, 5);

      result.stats = {
        categoryStats,
        difficultyStats,
        totalXpFromAchievements,
        nextSuggested: nextAchievements
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar achievements do atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/achievements/attendant/[id]
// Desbloquear achievement para um atendente
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const body = await request.json();
    const { achievementId, progress = 100 } = body;

    if (!achievementId) {
      return NextResponse.json(
        { error: 'ID do achievement é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se atendente existe
    const attendant = await prisma.user.findUnique({
      where: { id: attendantId }
    });

    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se achievement existe
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId }
    });

    if (!achievement) {
      return NextResponse.json(
        { error: 'Achievement não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se achievement já foi desbloqueado
    const existingProgress = await prisma.attendantAchievement.findUnique({
      where: {
        attendantId_achievementId: {
          attendantId,
          achievementId
        }
      }
    });

    if (existingProgress) {
      // Atualizar progresso se ainda não foi completamente desbloqueado
      if (existingProgress.progress < 100 && progress > existingProgress.progress) {
        const updatedProgress = await prisma.attendantAchievement.update({
          where: {
            attendantId_achievementId: {
              attendantId,
              achievementId
            }
          },
          data: {
            progress,
            unlockedAt: progress >= 100 ? new Date() : existingProgress.unlockedAt
          }
        });

        return NextResponse.json({
          message: progress >= 100 ? 'Achievement desbloqueado!' : 'Progresso atualizado',
          data: updatedProgress,
          achievement
        });
      } else {
        return NextResponse.json(
          { error: 'Achievement já foi desbloqueado ou progresso é menor que o atual' },
          { status: 400 }
        );
      }
    }

    // Criar novo progresso/desbloqueio
    const attendantAchievement = await prisma.attendantAchievement.create({
      data: {
        attendantId,
        achievementId,
        progress,
        unlockedAt: progress >= 100 ? new Date() : null
      }
    });

    // Se achievement foi completamente desbloqueado, adicionar XP
    if (progress >= 100 && achievement.xpReward > 0) {
      // Buscar temporada ativa
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { isActive: true }
      });

      if (activeSeason) {
        await prisma.xpEvent.create({
          data: {
            attendantId,
            seasonId: activeSeason.id,
            xpGained: achievement.xpReward,
            source: 'ACHIEVEMENT',
            reason: `Achievement desbloqueado: ${achievement.name}`,
            metadata: {
              achievementId: achievement.id,
              achievementName: achievement.name
            }
          }
        });
      }
    }

    return NextResponse.json({
      message: progress >= 100 ? 'Achievement desbloqueado com sucesso!' : 'Progresso registrado',
      data: attendantAchievement,
      achievement,
      xpAwarded: progress >= 100 ? achievement.xpReward : 0
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao desbloquear achievement:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/gamification/achievements/attendant/[id]
// Atualizar progresso de achievement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const body = await request.json();
    const { achievementId, progress } = body;

    if (!achievementId || progress === undefined) {
      return NextResponse.json(
        { error: 'achievementId e progress são obrigatórios' },
        { status: 400 }
      );
    }

    if (progress < 0 || progress > 100) {
      return NextResponse.json(
        { error: 'Progresso deve estar entre 0 e 100' },
        { status: 400 }
      );
    }

    // Verificar se progresso existe
    const existingProgress = await prisma.attendantAchievement.findUnique({
      where: {
        attendantId_achievementId: {
          attendantId,
          achievementId
        }
      },
      include: {
        achievement: true
      }
    });

    if (!existingProgress) {
      return NextResponse.json(
        { error: 'Progresso de achievement não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar progresso
    const wasUnlocked = existingProgress.progress >= 100;
    const willBeUnlocked = progress >= 100;
    
    const updatedProgress = await prisma.attendantAchievement.update({
      where: {
        attendantId_achievementId: {
          attendantId,
          achievementId
        }
      },
      data: {
        progress,
        unlockedAt: willBeUnlocked && !wasUnlocked ? new Date() : existingProgress.unlockedAt
      }
    });

    // Se achievement foi desbloqueado agora, adicionar XP
    if (willBeUnlocked && !wasUnlocked && existingProgress.achievement.xpReward > 0) {
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { isActive: true }
      });

      if (activeSeason) {
        await prisma.xpEvent.create({
          data: {
            attendantId,
            seasonId: activeSeason.id,
            xpGained: existingProgress.achievement.xpReward,
            source: 'ACHIEVEMENT',
            reason: `Achievement desbloqueado: ${existingProgress.achievement.name}`,
            metadata: {
              achievementId: existingProgress.achievement.id,
              achievementName: existingProgress.achievement.name
            }
          }
        });
      }
    }

    return NextResponse.json({
      message: willBeUnlocked && !wasUnlocked 
        ? 'Achievement desbloqueado!' 
        : 'Progresso atualizado',
      data: updatedProgress,
      achievement: existingProgress.achievement,
      xpAwarded: willBeUnlocked && !wasUnlocked ? existingProgress.achievement.xpReward : 0
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/gamification/achievements/attendant/[id]
// Remover achievement de um atendente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const { searchParams } = new URL(request.url);
    const achievementId = searchParams.get('achievementId');

    if (!achievementId) {
      return NextResponse.json(
        { error: 'achievementId é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se progresso existe
    const existingProgress = await prisma.attendantAchievement.findUnique({
      where: {
        attendantId_achievementId: {
          attendantId,
          achievementId
        }
      },
      include: {
        achievement: true
      }
    });

    if (!existingProgress) {
      return NextResponse.json(
        { error: 'Achievement não encontrado para este atendente' },
        { status: 404 }
      );
    }

    // Remover achievement
    await prisma.attendantAchievement.delete({
      where: {
        attendantId_achievementId: {
          attendantId,
          achievementId
        }
      }
    });

    // Se achievement estava desbloqueado, remover XP relacionado
    if (existingProgress.progress >= 100) {
      await prisma.xpEvent.deleteMany({
        where: {
          attendantId,
          source: 'ACHIEVEMENT',
          metadata: {
            path: ['achievementId'],
            equals: achievementId
          }
        }
      });
    }

    return NextResponse.json({
      message: 'Achievement removido com sucesso',
      removedAchievement: existingProgress.achievement,
      xpRemoved: existingProgress.progress >= 100 ? existingProgress.achievement.xpReward : 0
    });
  } catch (error) {
    console.error('Erro ao remover achievement:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}