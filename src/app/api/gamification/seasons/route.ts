import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GamificationService } from '@/services/gamificationService';
import type { GamificationSeason } from '@prisma/client';

const prisma = new PrismaClient();

// Funções auxiliares para temporadas
function isSeasonActive(season: GamificationSeason): boolean {
  const now = new Date();
  return season.active && season.startDate <= now && season.endDate >= now;
}

function filterSeasonsByStatus(seasons: GamificationSeason[], status: string): GamificationSeason[] {
  const now = new Date();
  
  switch (status) {
    case 'active':
      return seasons.filter(s => isSeasonActive(s));
    case 'upcoming':
      return seasons.filter(s => s.startDate > now);
    case 'past':
      return seasons.filter(s => s.endDate < now);
    default:
      return seasons;
  }
}

function findActiveSeason(seasons: GamificationSeason[]): GamificationSeason | null {
  return seasons.find(s => isSeasonActive(s)) || null;
}

function findNextSeason(seasons: GamificationSeason[]): GamificationSeason | null {
  const now = new Date();
  const upcomingSeasons = seasons
    .filter(s => s.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  return upcomingSeasons[0] || null;
}

function findPreviousSeason(seasons: GamificationSeason[]): GamificationSeason | null {
  const now = new Date();
  const pastSeasons = seasons
    .filter(s => s.endDate < now)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  
  return pastSeasons[0] || null;
}

function validateSeason(season: GamificationSeason): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!season.name || season.name.trim().length === 0) {
    errors.push('Nome é obrigatório');
  }
  
  if (season.endDate <= season.startDate) {
    errors.push('Data de fim deve ser posterior à data de início');
  }
  
  if (season.xpMultiplier < 0.1) {
    errors.push('Multiplicador deve ser pelo menos 0.1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// GET /api/gamification/seasons
// Buscar todas as temporadas com filtros opcionais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'upcoming', 'past'
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Buscar todas as temporadas
    const seasons = await prisma.gamificationSeason.findMany({
      orderBy: { startDate: 'desc' },
      take: limit,
      skip: offset
    });

    // Filtrar por status se especificado
    let filteredSeasons = seasons;
    if (status) {
      filteredSeasons = filterSeasonsByStatus(seasons, status);
    }

    // Calcular estatísticas se solicitado
    let stats = null;
    if (includeStats) {
      const now = new Date();
      const activeSeasons = seasons.filter(s => isSeasonActive(s));
      const upcomingSeasons = filterSeasonsByStatus(seasons, 'upcoming');
      const pastSeasons = filterSeasonsByStatus(seasons, 'past');

      // Buscar estatísticas de XP por temporada
      const seasonXpStats = await Promise.all(
        seasons.map(async (season) => {
          const xpResult = await prisma.xpEvent.aggregate({
            where: { seasonId: season.id },
            _sum: { xpGained: true },
            _count: true
          });
          
          const participantsCount = await prisma.xpEvent.groupBy({
            by: ['attendantId'],
            where: { seasonId: season.id }
          });

          return {
            seasonId: season.id,
            seasonName: season.name,
            totalXp: xpResult._sum.xpGained || 0,
            totalEvents: xpResult._count,
            participantsCount: participantsCount.length
          };
        })
      );

      stats = {
        total: seasons.length,
        active: activeSeasons.length,
        upcoming: upcomingSeasons.length,
        past: pastSeasons.length,
        seasonXpStats
      };
    }

    // Identificar temporadas especiais
    const activeSeason = findActiveSeason(filteredSeasons);
    const nextSeason = findNextSeason(filteredSeasons);
    const previousSeason = findPreviousSeason(filteredSeasons);

    return NextResponse.json({
      seasons: filteredSeasons,
      activeSeason,
      nextSeason,
      previousSeason,
      stats,
      pagination: {
        total: seasons.length,
        limit,
        offset,
        hasMore: offset + limit < seasons.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar temporadas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/seasons
// Criar nova temporada
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      startDate,
      endDate,
      active = false,
      config = {}
    } = body;

    // Validar dados obrigatórios
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: name, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validar datas
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      );
    }

    // Verificar sobreposição com outras temporadas ativas
    if (active) {
      const overlappingSeasons = await prisma.gamificationSeason.findMany({
        where: {
          active: true,
          OR: [
            {
              AND: [
                { startDate: { lte: start } },
                { endDate: { gte: start } }
              ]
            },
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: end } }
              ]
            },
            {
              AND: [
                { startDate: { gte: start } },
                { endDate: { lte: end } }
              ]
            }
          ]
        }
      });

      if (overlappingSeasons.length > 0) {
        return NextResponse.json(
          { error: 'Já existe uma temporada ativa no período especificado' },
          { status: 400 }
        );
      }
    }

    // Criar temporada
    const season = await prisma.gamificationSeason.create({
      data: {
        name,
        description: description || '',
        startDate: start,
        endDate: end,
        active,
        xpMultiplier: config.xpMultiplier || 1
      }
    });

    // Validar temporada criada
    const validation = validateSeason(season);
    if (!validation.isValid) {
      // Se a validação falhar, deletar a temporada criada
      await prisma.gamificationSeason.delete({
        where: { id: season.id }
      });
      
      return NextResponse.json(
        { error: `Temporada inválida: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/gamification/seasons
// Atualizar temporada existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da temporada é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a temporada existe
    const existingSeason = await prisma.gamificationSeason.findUnique({
      where: { id }
    });
    
    if (!existingSeason) {
      return NextResponse.json(
        { error: 'Temporada não encontrada' },
        { status: 404 }
      );
    }

    // Validar datas se fornecidas
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingSeason.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : existingSeason.endDate;
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Data de início deve ser anterior à data de fim' },
          { status: 400 }
        );
      }
    }

    // Verificar sobreposição se ativando temporada
    if (updateData.active === true && !existingSeason.active) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingSeason.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : existingSeason.endDate;
      
      const overlappingSeasons = await prisma.gamificationSeason.findMany({
        where: {
          id: { not: id },
          active: true,
          OR: [
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: startDate } }
              ]
            },
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: endDate } }
              ]
            },
            {
              AND: [
                { startDate: { gte: startDate } },
                { endDate: { lte: endDate } }
              ]
            }
          ]
        }
      });

      if (overlappingSeasons.length > 0) {
        return NextResponse.json(
          { error: 'Já existe uma temporada ativa no período especificado' },
          { status: 400 }
        );
      }
    }

    // Atualizar temporada
    const updatedSeason = await prisma.gamificationSeason.update({
      where: { id },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined
      }
    });

    return NextResponse.json(updatedSeason);
  } catch (error) {
    console.error('Erro ao atualizar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/gamification/seasons
// Deletar temporada
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID da temporada é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a temporada existe
    const existingSeason = await prisma.gamificationSeason.findUnique({
      where: { id }
    });
    
    if (!existingSeason) {
      return NextResponse.json(
        { error: 'Temporada não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se há eventos de XP associados
    const xpEventsCount = await prisma.xpEvent.count({
      where: { seasonId: id }
    });

    if (xpEventsCount > 0) {
      return NextResponse.json(
        { 
          error: `Não é possível deletar temporada com ${xpEventsCount} eventos de XP associados`,
          suggestion: 'Considere desativar a temporada em vez de deletá-la'
        },
        { status: 400 }
      );
    }

    // Deletar temporada
    await prisma.gamificationSeason.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Temporada deletada com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao deletar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}