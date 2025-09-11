import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware, AuthConfigs } from "@/lib/auth-middleware";
import { z } from "zod";

// Schemas de validação
const CreateSetorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
});

const UpdateSetorSchema = z.object({
  oldName: z.string().min(1, "Nome atual é obrigatório"),
  newName: z
    .string()
    .min(1, "Novo nome é obrigatório")
    .max(100, "Nome muito longo"),
});

const DeleteSetorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

const BulkCreateSetorSchema = z.object({
  names: z
    .array(z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"))
    .min(1, "Pelo menos um setor é obrigatório")
    .max(50, "Máximo 50 setores por operação"),
});

const BulkDeleteSetorSchema = z.object({
  names: z
    .array(z.string().min(1, "Nome é obrigatório"))
    .min(1, "Pelo menos um setor é obrigatório")
    .max(50, "Máximo 50 setores por operação"),
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

    let setores;

    if (includeDetails) {
      // Para incluir detalhes, fazemos uma query separada para contar attendants
      const setoresWithCount = await prisma.setor.findMany({
        where,
        orderBy: {
          name: "asc",
        },
      });

      // Contar attendants para cada setor
      const setoresWithAttendantCount = await Promise.all(
        setoresWithCount.map(async (setor) => {
          const attendantCount = await prisma.attendant.count({
            where: { setor: setor.name },
          });
          return {
            name: setor.name,
            attendantCount,
          };
        }),
      );

      setores = setoresWithAttendantCount;
    } else {
      setores = await prisma.setor.findMany({
        where,
        orderBy: {
          name: "asc",
        },
      });
    }

    // Retornar dados baseado no parâmetro includeDetails
    const data = includeDetails ? setores : setores.map((s) => s.name);

    return NextResponse.json({
      success: true,
      data,
      total: setores.length,
    });
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar setores" },
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
      const validationResult = BulkCreateSetorSchema.safeParse(body);

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

      // Verificar se algum setor já existe
      const existingSetores = await prisma.setor.findMany({
        where: {
          name: { in: uniqueNames },
        },
      });

      if (existingSetores.length > 0) {
        return NextResponse.json(
          {
            error: "Alguns setores já existem",
            existingNames: existingSetores.map((s) => s.name),
          },
          { status: 409 },
        );
      }

      // Criar setores em lote
      const setores = await prisma.setor.createMany({
        data: uniqueNames.map((name) => ({ name })),
      });

      return NextResponse.json(
        {
          success: true,
          message: `${setores.count} setores criados com sucesso`,
          data: {
            created: setores.count,
            names: uniqueNames,
          },
        },
        { status: 201 },
      );
    } else {
      // Operação individual
      const validationResult = CreateSetorSchema.safeParse(body);

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

      // Verificar se setor já existe
      const existingSetor = await prisma.setor.findFirst({
        where: { name },
      });

      if (existingSetor) {
        return NextResponse.json({ error: "Setor já existe" }, { status: 409 });
      }

      const setor = await prisma.setor.create({
        data: { name },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Setor criado com sucesso",
          data: setor,
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Erro ao criar setor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao criar setor" },
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

    const { oldName, newName } = validationResult.data;

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

    // Encontrar setor existente
    const existingSetor = await prisma.setor.findFirst({
      where: { name: oldName },
    });

    if (!existingSetor) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Atualizar setor
    const updatedSetor = await prisma.setor.update({
      where: { name: existingSetor.name },
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
      const validationResult = BulkDeleteSetorSchema.safeParse(body);

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

      // Verificar se os setores existem
      const existingSetores = await prisma.setor.findMany({
        where: {
          name: { in: names },
        },
      });

      if (existingSetores.length === 0) {
        return NextResponse.json(
          { error: "Nenhum setor encontrado" },
          { status: 404 },
        );
      }

      // Verificar se algum setor está em uso
      const sectorsInUse = [];
      for (const setor of existingSetores) {
        const attendantCount = await prisma.attendant.count({
          where: { setor: setor.name },
        });
        if (attendantCount > 0) {
          sectorsInUse.push({
            name: setor.name,
            attendantCount,
          });
        }
      }

      if (sectorsInUse.length > 0) {
        return NextResponse.json(
          {
            error: "Alguns setores não podem ser deletados pois estão em uso",
            sectorsInUse,
          },
          { status: 409 },
        );
      }

      // Deletar setores
      const deleteResult = await prisma.setor.deleteMany({
        where: {
          name: { in: existingSetores.map((s) => s.name) },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${deleteResult.count} setores deletados com sucesso`,
        data: {
          deleted: deleteResult.count,
          names: existingSetores.map((s) => s.name),
        },
      });
    } else {
      // Operação individual
      const validationResult = DeleteSetorSchema.safeParse(body);

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

      // Encontrar setor existente
      const existingSetor = await prisma.setor.findFirst({
        where: { name },
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
        where: { name: existingSetor.name },
      });

      return NextResponse.json({
        success: true,
        message: "Setor deletado com sucesso",
        data: {
          name: existingSetor.name,
        },
      });
    }
  } catch (error) {
    console.error("Erro ao deletar setor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao deletar setor" },
      { status: 500 },
    );
  }
}
