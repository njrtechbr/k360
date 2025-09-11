import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { EvaluationAnalysis } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Por enquanto, retornamos um array vazio já que as análises de IA
    // estão sendo armazenadas no localStorage no frontend
    // TODO: Implementar armazenamento das análises no banco de dados
    const analysisResults: EvaluationAnalysis[] = [];

    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error("Erro ao buscar análises de IA:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { evaluationId, sentiment, summary } = body;

    if (!evaluationId || !sentiment || !summary) {
      return NextResponse.json(
        { error: "Dados da análise são obrigatórios" },
        { status: 400 },
      );
    }

    // TODO: Implementar armazenamento da análise no banco de dados
    // Por enquanto, apenas retornamos sucesso
    const analysis: EvaluationAnalysis = {
      evaluationId,
      sentiment,
      summary,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      analysis,
      message: "Análise salva com sucesso",
    });
  } catch (error) {
    console.error("Erro ao salvar análise de IA:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
