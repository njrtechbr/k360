import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { z } from "zod";

// Schema de validação para atualização
const UpdateSetorSchema = z.object({
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
    const setorName = decodeURIComponent(name);

    // Buscar setor
    const setor = await prisma.setor.findFirst({
      where: { name: setorName },
    });

    if (!setor) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Contar attendants usando este setor
    const attendantCount = await prisma.attendant.count({
      where: { setor: setor.name },
    });

    return NextResponse.json({
      success: true,
      data: {
        name: setor.name,
        attendantCount,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar setor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar setor" },
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
    const validationResult = UpdateSetorSchema.safeParse(body);

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

    // Verificar se o setor existe
    const existingSetor = await prisma.setor.findFirst({
      where: { name: oldName },
    });

    if (!existingSetor) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Verificar se o novo nome já existe (exceto se for o mesmo)
    if (oldName !== newName) {
      const existingWithNewName = await prisma.setor.findFirst({
        where: { name: newName },
      });

      if (existingWithNewName) {
        return NextResponse.json(
          { error: "Já existe um setor com este nome" },
          { status: 409 },
        );
      }
    }

    // Atualizar setor
    const updatedSetor = await prisma.setor.update({
      where: { name: oldName },
      data: { name: newName },
    });

    return NextResponse.json({
      success: true,
      message: "Setor atualizado com sucesso",
      data: updatedSetor,
    });
  } catch (error) {
    console.error("Erro ao atualizar setor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao atualizar setor" },
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
    const setorName = decodeURIComponent(name);

    // Verificar se o setor existe
    const existingSetor = await prisma.setor.findFirst({
      where: { name: setorName },
    });

    if (!existingSetor) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Verificar se setor está em uso
    const attendantCount = await prisma.attendant.count({
      where: { setor: existingSetor.name },
    });

    if (attendantCount > 0) {
      return NextResponse.json(
        {
          error: "Setor não pode ser deletado pois está em uso",
          attendantCount,
        },
        { status: 409 },
      );
    }

    // Deletar setor
    await prisma.setor.delete({
      where: { name: setorName },
    });

    return NextResponse.json({
      success: true,
      message: "Setor deletado com sucesso",
      data: {
        name: existingSetor.name,
      },
    });
  } catch (error) {
    console.error("Erro ao deletar setor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao deletar setor" },
      { status: 500 },
    );
  }
}
