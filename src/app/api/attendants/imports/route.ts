import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const attendantImports = await prisma.attendantImport.findMany({
      include: {
        importedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            attendants: true,
          },
        },
      },
      orderBy: {
        importedAt: 'desc',
      },
    });

    // Transformar os dados para o formato esperado
    const formattedImports = attendantImports.map(importRecord => ({
      id: importRecord.id,
      fileName: importRecord.fileName,
      importedAt: importRecord.importedAt.toISOString(),
      importedBy: importRecord.importedBy,
      attendantCount: importRecord._count.attendants,
    }));

    return NextResponse.json(formattedImports);
  } catch (error) {
    console.error('Erro ao buscar importações de atendentes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}