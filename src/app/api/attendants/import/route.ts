import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Debug logging
    console.log('🔍 Session debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name
    });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verify user exists in database before proceeding
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true }
    });

    console.log('👤 User verification:', {
      sessionUserId: session.user.id,
      userExists: !!userExists,
      dbUser: userExists
    });

    if (!userExists) {
      console.error('❌ User from session not found in database:', session.user.id);
      return NextResponse.json(
        { 
          error: 'Usuário da sessão não encontrado no banco de dados',
          details: 'Sua sessão pode estar desatualizada. Faça logout e login novamente.',
          sessionUserId: session.user.id
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attendants, fileName } = body;

    if (!attendants || !Array.isArray(attendants)) {
      return NextResponse.json(
        { error: 'Lista de atendentes é obrigatória' },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { error: 'Nome do arquivo é obrigatório' },
        { status: 400 }
      );
    }

    // Criar o registro de importação
    const attendantImport = await prisma.attendantImport.create({
      data: {
        fileName,
        importedById: userExists.id, // Use the verified user ID from database
        importedAt: new Date(),
      },
    });

    // Preparar dados dos atendentes com importId
    const attendantsData = attendants.map((attendant: any) => ({
      // Remove id field - let Prisma auto-generate it
      name: attendant.name,
      email: attendant.email,
      funcao: attendant.funcao,
      setor: attendant.setor,
      status: attendant.status,
      avatarUrl: attendant.avatarUrl || null,
      telefone: attendant.telefone,
      portaria: attendant.portaria || null,
      situacao: attendant.situacao || null,
      dataAdmissao: new Date(attendant.dataAdmissao),
      dataNascimento: new Date(attendant.dataNascimento),
      rg: attendant.rg,
      cpf: attendant.cpf,
      importId: attendantImport.id,
    }));

    // Criar atendentes em lote usando createMany
    const result = await prisma.attendant.createMany({
      data: attendantsData,
      skipDuplicates: true, // Ignora duplicatas baseadas em constraints únicos
    });

    return NextResponse.json({
      message: 'Atendentes importados com sucesso',
      importId: attendantImport.id,
      count: result.count,
    });
  } catch (error) {
    console.error('Erro ao importar atendentes:', error);
    
    // Verificar se é erro de constraint única ou duplicata
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('unique constraint') || 
          errorMessage.includes('duplicate key') || 
          errorMessage.includes('already exists') ||
          errorMessage.includes('violates unique constraint')) {
        return NextResponse.json(
          { error: 'Alguns atendentes já existem no sistema (email ou CPF duplicado)' },
          { status: 409 }
        );
      }
      
      // Log the actual error for debugging
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      return NextResponse.json(
        { error: `Erro ao processar dados: ${error.message}` },
        { status: 500 }
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