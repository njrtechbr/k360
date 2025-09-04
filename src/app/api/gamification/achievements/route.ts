import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AchievementsService } from '@/services/gamification';
import type { Achievement, AchievementCategory, AchievementDifficulty } from '@/lib/types';

const prisma = new PrismaClient();

// POST /api/gamification/achievements
// Criar novo achievement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      difficulty,
      xpReward,
      icon,
      requirements,
      isActive = true
    } = body;

    // Validações básicas
    if (!name || !description || !category || !difficulty) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, description, category, difficulty' },
        { status: 400 }
      );
    }

    if (!Object.values(AchievementCategory).includes(category)) {
      return NextResponse.json(
        { error: 'Categoria inválida' },
        { status: 400 }
      );
    }

    if (!Object.values(AchievementDifficulty).includes(difficulty)) {
      return NextResponse.json(
        { error: 'Dificuldade inválida' },
        { status: 400 }
      );
    }

    if (xpReward && (typeof xpReward !== 'number' || xpReward < 0)) {
      return NextResponse.json(
        { error: 'XP reward deve ser um número positivo' },
        { status: 400 }
      );
    }

    // Verificar se já existe achievement com mesmo nome
    const existingAchievement = await prisma.achievement.findFirst({
      where: { name }
    });

    if (existingAchievement) {
      return NextResponse.json(
        { error: 'Já existe um achievement com este nome' },
        { status: 400 }
      );
    }

    // Criar achievement
    const achievement = await prisma.achievement.create({
      data: {
        name,
        description,
        category,
        difficulty,
        xpReward: xpReward || 0,
        icon: icon || '🏆',
        requirements: requirements || {},
        isActive
      }
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar achievement:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/gamification/achievements
// Atualizar achievement existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do achievement é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se achievement existe
    const existingAchievement = await prisma.achievement.findUnique({
      where: { id }
    });

    if (!existingAchievement) {
      return NextResponse.json(
        { error: 'Achievement não encontrado' },
        { status: 404 }
      );
    }

    // Validações se campos estão sendo atualizados
    if (updateData.category && !Object.values(AchievementCategory).includes(updateData.category)) {
      return NextResponse.json(
        { error: 'Categoria inválida' },
        { status: 400 }
      );
    }

    if (updateData.difficulty && !Object.values(AchievementDifficulty).includes(updateData.difficulty)) {
      return NextResponse.json(
        { error: 'Dificuldade inválida' },
        { status: 400 }
      );
    }

    if (updateData.xpReward && (typeof updateData.xpReward !== 'number' || updateData.xpReward < 0)) {
      return NextResponse.json(
        { error: 'XP reward deve ser um número positivo' },
        { status: 400 }
      );
    }

    // Verificar nome único se sendo atualizado
    if (updateData.name && updateData.name !== existingAchievement.name) {
      const nameConflict = await prisma.achievement.findFirst({
        where: {
          name: updateData.name,
          id: { not: id }
        }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Já existe um achievement com este nome' },
          { status: 400 }
        );
      }
    }

    // Atualizar achievement
    const updatedAchievement = await prisma.achievement.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedAchievement);
  } catch (error) {
    console.error('Erro ao atualizar achievement:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/gamification/achievements
// Buscar achievements com filtros e estatísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get('attendantId');
    const category = searchParams.get('category') as AchievementCategory | null;
    const difficulty = searchParams.get('difficulty') as AchievementDifficulty | null;
    const unlockedOnly = searchParams.get('unlockedOnly') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeProgress = searchParams.get('includeProgress') === 'true';
    const sortBy = searchParams.get('sortBy') || 'difficulty';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Buscar achievements base
    let whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (difficulty) {
      whereClause.difficulty = difficulty;
    }

    const achievements = await prisma.achievement.findMany({
      where: whereClause,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    });

    let result: any = {
      achievements,
      pagination: {
        page,
        limit,
        total: await prisma.achievement.count({ where: whereClause })
      }
    };

    // Se attendantId fornecido, buscar progresso específico
    if (attendantId) {
      const attendantAchievements = await prisma.attendantAchievement.findMany({
        where: {
          attendantId,
          achievementId: { in: achievements.map(a => a.id) }
        }
      });

      // Combinar achievements com progresso do atendente
      result.achievements = achievements.map(achievement => {
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
      if (unlockedOnly) {
        result.achievements = result.achievements.filter((a: any) => a.isUnlocked);
      }

      // Buscar achievements recém-desbloqueados (últimos 7 dias)
      if (includeProgress) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentlyUnlocked = await prisma.attendantAchievement.findMany({
          where: {
            attendantId,
            unlockedAt: { gte: sevenDaysAgo }
          },
          include: {
            achievement: true
          },
          orderBy: {
            unlockedAt: 'desc'
          }
        });

        result.recentlyUnlocked = recentlyUnlocked.map(aa => ({
          ...aa.achievement,
          unlockedAt: aa.unlockedAt
        }));
      }
    }

    // Incluir estatísticas gerais se solicitado
    if (includeStats) {
      const stats = await AchievementsService.getAchievementStats(achievements);
      
      // Estatísticas de desbloqueio por categoria
      const categoryStats = await prisma.attendantAchievement.groupBy({
        by: ['achievementId'],
        _count: true
      });

      const achievementUnlockCounts = categoryStats.reduce((acc, stat) => {
        acc[stat.achievementId] = stat._count;
        return acc;
      }, {} as Record<string, number>);

      // Estatísticas por categoria
      const categoriesStats = await Promise.all(
        Object.values(AchievementCategory).map(async (cat) => {
          const categoryAchievements = achievements.filter(a => a.category === cat);
          const totalUnlocks = categoryAchievements.reduce((sum, a) => 
            sum + (achievementUnlockCounts[a.id] || 0), 0
          );
          
          return {
            category: cat,
            totalAchievements: categoryAchievements.length,
            totalUnlocks,
            averageUnlocksPerAchievement: categoryAchievements.length > 0 
              ? totalUnlocks / categoryAchievements.length 
              : 0
          };
        })
      );

      result.stats = {
        ...stats,
        categoriesStats,
        achievementUnlockCounts
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar achievements:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/gamification/achievements
// Deletar achievement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const forceDelete = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'ID do achievement é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se achievement existe
    const achievement = await prisma.achievement.findUnique({
      where: { id }
    });

    if (!achievement) {
      return NextResponse.json(
        { error: 'Achievement não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se há atendentes com este achievement
    const attendantAchievementsCount = await prisma.attendantAchievement.count({
      where: { achievementId: id }
    });

    if (attendantAchievementsCount > 0 && !forceDelete) {
      return NextResponse.json(
        {
          error: `Não é possível deletar achievement com ${attendantAchievementsCount} atendentes associados`,
          suggestion: 'Use o parâmetro ?force=true para deletar todas as associações',
          attendantsCount: attendantAchievementsCount
        },
        { status: 400 }
      );
    }

    // Se forceDelete, deletar todas as associações primeiro
    if (forceDelete && attendantAchievementsCount > 0) {
      await prisma.attendantAchievement.deleteMany({
        where: { achievementId: id }
      });
    }

    // Deletar achievement
    await prisma.achievement.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Achievement deletado com sucesso',
      deletedAssociationsCount: forceDelete ? attendantAchievementsCount : 0
    });
  } catch (error) {
    console.error('Erro ao deletar achievement:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}