import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Temporariamente removendo autenticação para teste
    // const session = await getServerSession(authOptions);
    
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: 'Não autorizado' },
    //     { status: 401 }
    //   );
    // }

    const evaluations = await prisma.evaluation.findMany({
      orderBy: {
        data: 'desc'
      }
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { evaluationIds } = body;

    if (!evaluationIds || !Array.isArray(evaluationIds)) {
      return NextResponse.json(
        { error: 'IDs das avaliações são obrigatórios' },
        { status: 400 }
      );
    }

    await prisma.evaluation.deleteMany({
      where: {
        id: { in: evaluationIds }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Avaliações deletadas com sucesso',
      deletedCount: evaluationIds.length
    });
  } catch (error) {
    console.error('Erro ao deletar avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}