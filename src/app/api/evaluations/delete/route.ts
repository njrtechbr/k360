import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

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

    if (!evaluationIds || !Array.isArray(evaluationIds) || evaluationIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs de avaliações é obrigatória' },
        { status: 400 }
      );
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Primeiro, deletar todos os eventos XP relacionados às avaliações
      const deletedXpEvents = await tx.xpEvent.deleteMany({
        where: {
          type: 'evaluation',
          relatedId: { in: evaluationIds }
        }
      });

      // Depois, deletar as avaliações
      const deletedEvaluations = await tx.evaluation.deleteMany({
        where: {
          id: { in: evaluationIds }
        }
      });

      return {
        deletedEvaluations: deletedEvaluations.count,
        deletedXpEvents: deletedXpEvents.count
      };
    });

    return NextResponse.json({
      success: true,
      deletedEvaluations: result.deletedEvaluations,
      deletedXpEvents: result.deletedXpEvents,
      message: `${result.deletedEvaluations} avaliações e ${result.deletedXpEvents} eventos XP removidos com sucesso`
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