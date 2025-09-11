import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    const attendantImports = await prisma.attendantImport.findMany({
      include: {
        importedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            attendants: true,
          },
        },
      },
      orderBy: {
        importedAt: "desc",
      },
    });

    // Transformar os dados para o formato esperado
    const formattedImports = attendantImports.map((importRecord) => ({
      id: importRecord.id,
      fileName: importRecord.fileName,
      importedAt: importRecord.importedAt.toISOString(),
      importedBy: importRecord.importedBy,
      attendantCount: importRecord._count.attendants,
    }));

    return NextResponse.json({
      success: true,
      data: formattedImports,
    });
  } catch (error) {
    console.error("Erro ao buscar importações de atendentes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
