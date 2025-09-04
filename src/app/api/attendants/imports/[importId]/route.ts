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
    const importRecord = await prisma.attendantImport.findUnique({
      where: { id: importId },
      include: {
        _count: {
          select: {
            attendants: true,
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

    // VERIFICAÇÃO DE SEGURANÇA: Não permitir deletar attendants que têm evaluations
    const attendantsWithEvaluations = await prisma.attendant.findMany({
      where: {
        importId: importId,
        evaluations: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            evaluations: true
          }
        }
      }
    });

    if (attendantsWithEvaluations.length > 0) {
      const totalEvaluations = attendantsWithEvaluations.reduce((sum, att) => sum + att._count.evaluations, 0);
      return NextResponse.json(
        { 
          error: `Não é possível reverter esta importação. ${attendantsWithEvaluations.length} atendentes têm ${totalEvaluations} avaliações associadas.`,
          suggestion: 'Para reverter, primeiro delete as avaliações ou use a opção de força (não recomendado)',
          attendantsWithEvaluations: attendantsWithEvaluations.map(att => ({
            name: att.name,
            evaluationsCount: att._count.evaluations
          }))
        },
        { status: 400 }
      );
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Primeiro, deletar todos os atendentes desta importação (apenas os que não têm evaluations)
      const deletedAttendants = await tx.attendant.deleteMany({
        where: {
          importId: importId,
        },
      });

      // Depois, deletar o registro de importação
      await tx.attendantImport.delete({
        where: {
          id: importId,
        },
      });

      return {
        deletedAttendants: deletedAttendants.count,
        importRecord,
      };
    });

    return NextResponse.json({
      message: 'Importação revertida com sucesso',
      deletedAttendants: result.deletedAttendants,
      fileName: result.importRecord.fileName,
    });
  } catch (error) {
    console.error('Erro ao reverter importação de atendentes:', error);
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

    const importRecord = await prisma.attendantImport.findUnique({
      where: { id: importId },
      include: {
        importedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendants: {
          select: {
            id: true,
            name: true,
            email: true,
            funcao: true,
            setor: true,
            status: true,
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
      attendants: importRecord.attendants,
      attendantCount: importRecord.attendants.length,
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