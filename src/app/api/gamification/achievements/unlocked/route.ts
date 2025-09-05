import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/gamification/achievements/unlocked
// Buscar conquistas desbloqueadas de um atendente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get('attendantId');

    if (!attendantId) {
      return NextResponse.json(
        { error: 'attendantId é obrigatório' },
        { status: 400 }
      );
    }

    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      where: { attendantId },
      orderBy: { unlockedAt: 'desc' }
    });

    return NextResponse.json(unlockedAchievements);
  } catch (error) {
    console.error('Erro ao buscar conquistas desbloqueadas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}