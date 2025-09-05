import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/gamification/achievements
// Buscar todas as conquistas ativas
export async function GET(request: NextRequest) {
  try {
    const achievements = await prisma.achievementConfig.findMany({
      where: { active: true },
      orderBy: [
        { xp: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Erro ao buscar conquistas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/achievements
// Criar nova conquista
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const achievement = await prisma.achievementConfig.create({
      data: {
        id: body.id,
        title: body.title,
        description: body.description,
        xp: body.xp,
        icon: body.icon,
        color: body.color,
        active: body.active ?? true
      }
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar conquista:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}