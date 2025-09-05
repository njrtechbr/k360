import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { XpService } from '@/services/gamification';
import type { XpEvent } from '@/lib/types';

const prisma = new PrismaClient();

// GET /api/gamification/xp-events
// Buscar eventos de XP com filtros opcionais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get('attendantId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir filtros do Prisma
    const where: any = {};
    
    if (attendantId) {
      where.attendantId = attendantId;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Buscar eventos de XP
    const [events, totalCount] = await Promise.all([
      prisma.xpEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.xpEvent.count({ where })
    ]);

    // Calcular estatísticas se solicitado
    const includeStats = searchParams.get('includeStats') === 'true';
    let stats = null;
    
    if (includeStats) {
      const totalXp = await prisma.xpEvent.aggregate({
        where,
        _sum: {
          points: true
        }
      });

      const eventsByType = await prisma.xpEvent.groupBy({
        by: ['type'],
        where,
        _sum: {
          points: true
        },
        _count: true
      });

      stats = {
        totalEvents: totalCount,
        totalXp: totalXp._sum.points || 0,
        averageXp: totalCount > 0 ? (totalXp._sum.points || 0) / totalCount : 0,
        eventsByType: eventsByType.map(item => ({
          type: item.type,
          totalXp: item._sum.points || 0,
          count: item._count
        }))
      };
    }

    return NextResponse.json({
      events,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      stats
    });
  } catch (error) {
    console.error('Erro ao buscar eventos de XP:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/xp-events
// Criar novo evento de XP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      attendantId,
      points,
      basePoints,
      multiplier = 1,
      reason,
      type = 'manual',
      relatedId
    } = body;

    // Validar dados obrigatórios
    if (!attendantId || !points || !reason || !type) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: attendantId, points, reason, type' },
        { status: 400 }
      );
    }

    // Verificar se o atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId }
    });
    
    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Criar evento de XP
    const xpEvent = await prisma.xpEvent.create({
      data: {
        attendantId,
        points: Math.max(0, points), // Garantir que XP não seja negativo
        basePoints: basePoints || points,
        multiplier,
        reason,
        type,
        relatedId: relatedId || '',
        date: new Date()
      }
    });

    return NextResponse.json(xpEvent, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar evento de XP:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/gamification/xp-events
// Atualizar evento de XP existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o evento existe
    const existingEvent = await prisma.xpEvent.findUnique({
      where: { id }
    });
    
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Evento de XP não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar evento
    const updatedEvent = await prisma.xpEvent.update({
      where: { id },
      data: {
        ...updateData,
        xpGained: updateData.xpGained ? Math.max(0, updateData.xpGained) : undefined
      },
      include: {
        attendant: {
          select: {
            id: true,
            name: true,
            email: true,
            setor: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Erro ao atualizar evento de XP:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/gamification/xp-events
// Deletar evento de XP
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o evento existe
    const existingEvent = await prisma.xpEvent.findUnique({
      where: { id }
    });
    
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Evento de XP não encontrado' },
        { status: 404 }
      );
    }

    // Deletar evento
    await prisma.xpEvent.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Evento de XP deletado com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao deletar evento de XP:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}