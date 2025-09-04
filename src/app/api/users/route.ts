import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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

    // Verificar se o usuário existe no banco
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário da sessão não encontrado no banco de dados' },
        { status: 401 }
      );
    }

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem listar usuários
    if (!['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente para listar usuários' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        modules: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
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

    // Verificar se o usuário existe no banco
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário da sessão não encontrado no banco de dados' },
        { status: 401 }
      );
    }

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem criar usuários
    if (!['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente para criar usuários' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, modules } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    // Validar se o usuário atual pode criar usuários com esse role
    if (currentUser.role === 'ADMIN' && role === 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Apenas SUPERADMIN pode criar outros SUPERADMIN' },
        { status: 403 }
      );
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 400 }
      );
    }

    // Validar senha
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        modules: {
          connect: (modules || []).map((moduleId: string) => ({ id: moduleId }))
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        modules: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário existe no banco
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário da sessão não encontrado no banco de dados' },
        { status: 401 }
      );
    }

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem atualizar usuários
    if (!['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente para atualizar usuários' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, name, role, modules } = body;

    if (!userId || !name || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userId, name, role' },
        { status: 400 }
      );
    }

    // Verificar se o usuário a ser atualizado existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Validar se o usuário atual pode atualizar usuários com esse role
    if (currentUser.role === 'ADMIN') {
      if (targetUser.role === 'SUPERADMIN' || role === 'SUPERADMIN') {
        return NextResponse.json(
          { error: 'Apenas SUPERADMIN pode gerenciar outros SUPERADMIN' },
          { status: 403 }
        );
      }
    }

    // Não permitir que o usuário altere seu próprio role
    if (currentUser.id === userId && currentUser.role !== role) {
      return NextResponse.json(
        { error: 'Você não pode alterar seu próprio nível de acesso' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        role,
        modules: {
          set: (modules || []).map((moduleId: string) => ({ id: moduleId }))
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        modules: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
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

    // Verificar se o usuário existe no banco
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário da sessão não encontrado no banco de dados' },
        { status: 401 }
      );
    }

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem deletar usuários
    if (!['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Permissão insuficiente para deletar usuários' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se não está tentando deletar a própria conta
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      );
    }

    // Verificar se o usuário a ser deletado existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Validar se o usuário atual pode deletar usuários com esse role
    if (currentUser.role === 'ADMIN' && targetUser.role === 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Apenas SUPERADMIN pode deletar outros SUPERADMIN' },
        { status: 403 }
      );
    }

    // Verificar se não é o último SUPERADMIN
    if (targetUser.role === 'SUPERADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPERADMIN' }
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Não é possível deletar o último SUPERADMIN do sistema' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário deletado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}