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

    const attendants = await prisma.attendant.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(attendants);
  } catch (error) {
    console.error('Erro ao buscar atendentes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

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
    const {
      name,
      email,
      funcao,
      setor,
      status,
      avatarUrl,
      telefone,
      portaria,
      situacao,
      dataAdmissao,
      dataNascimento,
      rg,
      cpf
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    const attendant = await prisma.attendant.create({
      data: {
        name,
        email,
        funcao: funcao || 'Sem Função',
        setor: setor || 'Sem Setor',
        status: status || 'Ativo',
        avatarUrl,
        telefone,
        portaria,
        situacao,
        dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : new Date(),
        dataNascimento: dataNascimento ? new Date(dataNascimento) : new Date(),
        rg,
        cpf
      }
    });

    return NextResponse.json(attendant);
  } catch (error) {
    console.error('Erro ao criar atendente:', error);
    
    // Verificar se é erro de constraint única
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Atendente já existe (email ou CPF duplicado)' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}