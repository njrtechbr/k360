import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { level, title, description, active } = body;

    if (!level || typeof level !== 'number') {
      return NextResponse.json(
        { error: 'Nível é obrigatório e deve ser um número' },
        { status: 400 }
      );
    }

    // Atualizar level reward específico
    await prisma.levelTrackConfig.update({
      where: { level },
      data: {
        title: title,
        description: description,
        active: active,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Recompensa do nível atualizada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar level reward:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}