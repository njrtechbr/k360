import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const importData = body;

    if (!importData) {
      return NextResponse.json(
        { error: 'Dados da importação são obrigatórios' },
        { status: 400 }
      );
    }

    const newImport = await prisma.evaluationImport.create({
        data: importData
    });

    return NextResponse.json(newImport, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar registro de importação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}