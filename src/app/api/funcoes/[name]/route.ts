import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { z } from "zod";

// Schema de validação para atualização
const UpdateFuncaoSchema = z.object({
  newName: z
    .string()
    .min(1, "Novo nome é obrigatório")
    .max(100, "Nome muito longo"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    // Verificar autenticação
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.authenticated,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    const { name } = await params;
    const funcaoName = decodeURIComponent(name);

    // Buscar função
    const funcao = await prisma.funcao.findFirst({
      where: { name: funcaoName },
    });

    if (!funcao) {
      return NextResponse.json(
        { error: "Função não encontrada" },
        { status: 404 },
      );
    }

    // Contar attendants usando esta função
    const attendantCount = await prisma.attendant.count({
      where: { funcao: funcao.name },
    });

    return NextResponse.json({
      success: true,
      data: {
        name: funcao.name,
        attendantCount,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar função:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar função" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    // Verificar autenticação e autorização (ADMIN e SUPERADMIN)
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.adminOnly,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    const body = await request.json();
    const { name } = await params;
    const oldName = decodeURIComponent(name);

    // Validar dados
    const validationResult = UpdateFuncaoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const { newName } = validationResult.data;

    // Verificar se a função existe
    const existingFuncao = await prisma.funcao.findFirst({
      where: { name: oldName },
    });

    if (!existingFuncao) {
      return NextResponse.json(
        { error: "Função não encontrada" },
        { status: 404 },
      );
    }

    // Verificar se o novo nome já existe (exceto se for o mesmo)
    if (oldName !== newName) {
      const existingWithNewName = await prisma.funcao.findFirst({
        where: { name: newName },
      });

      if (existingWithNewName) {
        return NextResponse.json(
          { error: "Já existe uma função com este nome" },
          { status: 409 },
        );
      }
    }

    // Atualizar função
    const updatedFuncao = await prisma.funcao.update({
      where: { name: oldName },
      data: { name: newName },
    });

    return NextResponse.json({
      success: true,
      message: "Função atualizada com sucesso",
      data: updatedFuncao,
    });
  } catch (error) {
    console.error("Erro ao atualizar função:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao atualizar função" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    // Verificar autenticação e autorização (ADMIN e SUPERADMIN)
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.adminOnly,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    const { name } = await params;
    const funcaoName = decodeURIComponent(name);

    // Verificar se a função existe
    const existingFuncao = await prisma.funcao.findFirst({
      where: { name: funcaoName },
    });

    if (!existingFuncao) {
      return NextResponse.json(
        { error: "Função não encontrada" },
        { status: 404 },
      );
    }

    // Verificar se função está em uso
    const attendantCount = await prisma.attendant.count({
      where: { funcao: existingFuncao.name },
    });

    if (attendantCount > 0) {
      return NextResponse.json(
        {
          error: "Função não pode ser deletada pois está em uso",
          attendantCount,
        },
        { status: 409 },
      );
    }

    // Deletar função
    await prisma.funcao.delete({
      where: { name: funcaoName },
    });

    return NextResponse.json({
      success: true,
      message: "Função deletada com sucesso",
      data: {
        name: existingFuncao.name,
      },
    });
  } catch (error) {
    console.error("Erro ao deletar função:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao deletar função" },
      { status: 500 },
    );
  }
}
