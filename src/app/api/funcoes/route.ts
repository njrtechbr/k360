import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { z } from "zod";

// Schemas de validação
const CreateFuncaoSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
});

const UpdateFuncaoSchema = z.object({
  oldName: z.string().min(1, "Nome atual é obrigatório"),
  newName: z
    .string()
    .min(1, "Novo nome é obrigatório")
    .max(100, "Nome muito longo"),
});

const DeleteFuncaoSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

const BulkCreateFuncaoSchema = z.object({
  names: z
    .array(z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"))
    .min(1, "Pelo menos uma função é obrigatória")
    .max(50, "Máximo 50 funções por operação"),
});

const BulkDeleteFuncaoSchema = z.object({
  names: z
    .array(z.string().min(1, "Nome é obrigatório"))
    .min(1, "Pelo menos uma função é obrigatória")
    .max(50, "Máximo 50 funções por operação"),
});

export async function GET(request: NextRequest) {
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

    // Obter parâmetros de query
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("includeDetails") === "true";
    const search = searchParams.get("search");

    // Construir where clause
    const where: any = {};
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    let funcoes;

    if (includeDetails) {
      // Para incluir detalhes, fazemos uma query separada para contar attendants
      const funcoesWithCount = await prisma.funcao.findMany({
        where,
        orderBy: {
          name: "asc",
        },
      });

      // Contar attendants para cada função
      const funcoesWithAttendantCount = await Promise.all(
        funcoesWithCount.map(async (funcao) => {
          const attendantCount = await prisma.attendant.count({
            where: { funcao: funcao.name },
          });
          return {
            name: funcao.name,
            attendantCount,
          };
        }),
      );

      funcoes = funcoesWithAttendantCount;
    } else {
      funcoes = await prisma.funcao.findMany({
        where,
        orderBy: {
          name: "asc",
        },
      });
    }

    // Retornar dados baseado no parâmetro includeDetails
    const data = includeDetails ? funcoes : funcoes.map((f) => f.name);

    return NextResponse.json({
      success: true,
      data,
      total: funcoes.length,
    });
  } catch (error) {
    console.error("Erro ao buscar funções:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar funções" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Verificar se é operação em lote
    if (body.names && Array.isArray(body.names)) {
      // Validar dados para operação em lote
      const validationResult = BulkCreateFuncaoSchema.safeParse(body);

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

      const { names } = validationResult.data;

      // Verificar nomes duplicados na requisição
      const uniqueNames = [...new Set(names)];
      if (uniqueNames.length !== names.length) {
        return NextResponse.json(
          { error: "Nomes duplicados na lista" },
          { status: 400 },
        );
      }

      // Verificar se alguma função já existe
      const existingFuncoes = await prisma.funcao.findMany({
        where: {
          name: { in: uniqueNames },
        },
      });

      if (existingFuncoes.length > 0) {
        return NextResponse.json(
          {
            error: "Algumas funções já existem",
            existingNames: existingFuncoes.map((f) => f.name),
          },
          { status: 409 },
        );
      }

      // Criar funções em lote
      const funcoes = await prisma.funcao.createMany({
        data: uniqueNames.map((name) => ({ name })),
      });

      return NextResponse.json(
        {
          success: true,
          message: `${funcoes.count} funções criadas com sucesso`,
          data: {
            created: funcoes.count,
            names: uniqueNames,
          },
        },
        { status: 201 },
      );
    } else {
      // Operação individual
      const validationResult = CreateFuncaoSchema.safeParse(body);

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

      const { name } = validationResult.data;

      // Verificar se função já existe
      const existingFuncao = await prisma.funcao.findFirst({
        where: { name },
      });

      if (existingFuncao) {
        return NextResponse.json(
          { error: "Função já existe" },
          { status: 409 },
        );
      }

      const funcao = await prisma.funcao.create({
        data: { name },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Função criada com sucesso",
          data: funcao,
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Erro ao criar função:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao criar função" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const { oldName, newName } = validationResult.data;

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

    // Encontrar função existente
    const existingFuncao = await prisma.funcao.findFirst({
      where: { name: oldName },
    });

    if (!existingFuncao) {
      return NextResponse.json(
        { error: "Função não encontrada" },
        { status: 404 },
      );
    }

    // Atualizar função
    const updatedFuncao = await prisma.funcao.update({
      where: { name: existingFuncao.name },
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

export async function DELETE(request: NextRequest) {
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

    // Verificar se é operação em lote
    if (body.names && Array.isArray(body.names)) {
      // Validar dados para operação em lote
      const validationResult = BulkDeleteFuncaoSchema.safeParse(body);

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

      const { names } = validationResult.data;

      // Verificar se as funções existem
      const existingFuncoes = await prisma.funcao.findMany({
        where: {
          name: { in: names },
        },
      });

      if (existingFuncoes.length === 0) {
        return NextResponse.json(
          { error: "Nenhuma função encontrada" },
          { status: 404 },
        );
      }

      // Verificar se alguma função está em uso
      const functionsInUse = [];
      for (const funcao of existingFuncoes) {
        const attendantCount = await prisma.attendant.count({
          where: { funcao: funcao.name },
        });
        if (attendantCount > 0) {
          functionsInUse.push({
            name: funcao.name,
            attendantCount,
          });
        }
      }

      if (functionsInUse.length > 0) {
        return NextResponse.json(
          {
            error: "Algumas funções não podem ser deletadas pois estão em uso",
            functionsInUse,
          },
          { status: 409 },
        );
      }

      // Deletar funções
      const deleteResult = await prisma.funcao.deleteMany({
        where: {
          name: { in: existingFuncoes.map((f) => f.name) },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${deleteResult.count} funções deletadas com sucesso`,
        data: {
          deleted: deleteResult.count,
          names: existingFuncoes.map((f) => f.name),
        },
      });
    } else {
      // Operação individual
      const validationResult = DeleteFuncaoSchema.safeParse(body);

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

      const { name } = validationResult.data;

      // Encontrar função existente
      const existingFuncao = await prisma.funcao.findFirst({
        where: { name },
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
        where: { name: existingFuncao.name },
      });

      return NextResponse.json({
        success: true,
        message: "Função deletada com sucesso",
        data: {
          name: existingFuncao.name,
        },
      });
    }
  } catch (error) {
    console.error("Erro ao deletar função:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao deletar função" },
      { status: 500 },
    );
  }
}
