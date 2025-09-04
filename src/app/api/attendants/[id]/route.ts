import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, funcao, setor, status, avatarUrl, telefone, portaria, situacao, dataAdmissao } = body;
    const attendantId = params.id;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (funcao !== undefined) updateData.funcao = funcao;
    if (setor !== undefined) updateData.setor = setor;
    if (status !== undefined) updateData.status = status;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (telefone !== undefined) updateData.telefone = telefone;
    if (portaria !== undefined) updateData.portaria = portaria;
    if (situacao !== undefined) updateData.situacao = situacao;
    if (dataAdmissao !== undefined) updateData.dataAdmissao = new Date(dataAdmissao);

    const attendant = await prisma.attendant.update({
      where: { id: attendantId },
      data: updateData
    });

    return NextResponse.json(attendant);
  } catch (error) {
    console.error('Erro ao atualizar atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const attendantId = params.id;

    await prisma.attendant.delete({
      where: { id: attendantId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}