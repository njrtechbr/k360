import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const importId = params.importId;

    // Buscar a importação para obter os IDs das avaliações
    const importToRevert = await prisma.evaluationImport.findUnique({
      where: { id: importId }
    });

    if (!importToRevert) {
      return NextResponse.json(
        { error: 'Importação não encontrada' },
        { status: 404 }
      );
    }

    // Deletar as avaliações relacionadas
    await prisma.evaluation.deleteMany({
      where: {
        id: { in: importToRevert.evaluationIds }
      }
    });

    // Deletar o registro de importação
    await prisma.evaluationImport.delete({
      where: { id: importId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Importação revertida com sucesso',
      deletedEvaluations: importToRevert.evaluationIds.length
    });
  } catch (error) {
    console.error('Erro ao reverter importação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}