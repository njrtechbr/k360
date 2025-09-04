import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { importId } = params;

    if (!importId) {
      return NextResponse.json(
        { error: 'ID da importação é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a importação existe
    const importRecord = await prisma.evaluationImport.findUnique({
      where: { id: importId },
      include: {
        _count: {
          select: {
            evaluations: true,
          },
        },
      },
    });

    if (!importRecord) {
      return NextResponse.json(
        { error: 'Importação não encontrada' },
        { status: 404 }
      );
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Primeiro, deletar todas as avaliações desta importação
      const deletedEvaluations = await tx.evaluation.deleteMany({
        where: {
          importId: importId,
        },
      });

      // Depois, deletar o registro de importação
      await tx.evaluationImport.delete({
        where: {
          id: importId,
        },
      });

      return {
        deletedEvaluations: deletedEvaluations.count,
        importRecord,
      };
    });

    return NextResponse.json({
      success: true,
      deletedEvaluations: result.deletedEvaluations,
      fileName: result.importRecord.fileName,
      message: `${result.deletedEvaluations} avaliações removidas da importação ${result.importRecord.fileName}`,
    });

  } catch (error) {
    console.error('Erro ao reverter importação de avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { importId } = params;

    if (!importId) {
      return NextResponse.json(
        { error: 'ID da importação é obrigatório' },
        { status: 400 }
      );
    }

    const importRecord = await prisma.evaluationImport.findUnique({
      where: { id: importId },
      include: {
        importedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        evaluations: {
          select: {
            id: true,
            attendantId: true,
            nota: true,
            comentario: true,
            data: true,
            xpGained: true,
            createdAt: true,
          },
        },
      },
    });

    if (!importRecord) {
      return NextResponse.json(
        { error: 'Importação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: importRecord.id,
      fileName: importRecord.fileName,
      importedAt: importRecord.importedAt.toISOString(),
      importedBy: importRecord.importedBy,
      evaluations: importRecord.evaluations,
      evaluationCount: importRecord.evaluations.length,
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da importação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}