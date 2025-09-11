import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const { fileName, attendants, importedById } = await request.json();

    if (!attendants || !Array.isArray(attendants)) {
      return NextResponse.json(
        {
          success: false,
          error: "Lista de atendentes é obrigatória",
        },
        { status: 400 },
      );
    }

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Nome do arquivo é obrigatório",
        },
        { status: 400 },
      );
    }

    // Criar o registro de importação
    const attendantImport = await prisma.attendantImport.create({
      data: {
        fileName,
        importedById,
        importedAt: new Date(),
      },
    });

    // Preparar dados dos atendentes com importId
    const attendantsData = attendants.map((attendant: any) => ({
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

    // Criar atendentes em lote
    const result = await prisma.attendant.createMany({
      data: attendantsData,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        importId: attendantImport.id,
        count: result.count,
      },
    });
  } catch (error) {
    console.error("Erro ao importar atendentes:", error);

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("violates unique constraint")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Alguns atendentes já existem no sistema (email ou CPF duplicado)",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Erro ao processar dados: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
