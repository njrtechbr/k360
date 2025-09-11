import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { evaluations, fileName, agentMap } = body;

    if (!evaluations || !Array.isArray(evaluations)) {
      return NextResponse.json(
        { error: "Lista de avaliações é obrigatória" },
        { status: 400 },
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: "Nome do arquivo é obrigatório" },
        { status: 400 },
      );
    }

    if (!agentMap || typeof agentMap !== "object") {
      return NextResponse.json(
        { error: "Mapeamento de agentes é obrigatório" },
        { status: 400 },
      );
    }

    // Buscar configuração de gamificação
    const gamificationConfigRaw = await prisma.gamificationConfig.findFirst();
    if (!gamificationConfigRaw) {
      return NextResponse.json(
        { error: "Configuração de gamificação não encontrada" },
        { status: 500 },
      );
    }

    // Transformar campos individuais em objeto ratingScores
    const gamificationConfig = {
      ...gamificationConfigRaw,
      ratingScores: {
        "1": gamificationConfigRaw.ratingScore1,
        "2": gamificationConfigRaw.ratingScore2,
        "3": gamificationConfigRaw.ratingScore3,
        "4": gamificationConfigRaw.ratingScore4,
        "5": gamificationConfigRaw.ratingScore5,
      },
    };

    // Buscar temporada ativa (se houver)
    const activeSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    // Função para obter XP baseado na nota
    const getXpFromRating = (rating: number): number => {
      const ratingStr =
        rating.toString() as keyof typeof gamificationConfig.ratingScores;
      return gamificationConfig.ratingScores[ratingStr] || 0;
    };

    // Mapeamento de nomes de agentes para corrigir diferenças entre CSV e banco
    const nameMapping: { [key: string]: string } = {
      "Ana Flávia Felix de Souza": "Ana Flávia de Souza",
      "CLAUDIANA SP": "Claudiana da Silva Pereira",
      "Rangell Nunes": "Rangell Nunes de Miranda",
      "rangell nunes": "Rangell Nunes de Miranda", // variação em minúscula
      "Bruna Mendes": "Bruna Mendes da Silva",
    };

    // Processar em lotes para evitar timeout de transação
    const BATCH_SIZE = 50; // Processar 50 avaliações por vez
    const evaluationBatches = [];

    // Preparar dados das avaliações com validação prévia
    const validEvaluations = [];
    let skippedCount = 0;

    for (const evaluation of evaluations) {
      // Aplicar mapeamento de nomes se necessário
      const normalizedAgentName =
        nameMapping[evaluation.agente] || evaluation.agente;

      // Mapear agente para attendantId usando agentMap
      let attendantId =
        agentMap[normalizedAgentName] ||
        agentMap[evaluation.agente] ||
        evaluation.attendantId;

      // Ignorar avaliações onde não conseguimos identificar o atendente
      if (
        !attendantId ||
        attendantId === "null" ||
        attendantId === "undefined" ||
        attendantId.trim() === ""
      ) {
        console.log(
          `Ignorando avaliação do agente "${evaluation.agente}" - atendente não identificado`,
        );
        skippedCount++;
        continue;
      }

      // Verificar se o attendantId existe na tabela Attendant (fora da transação)
      const attendantExists = await prisma.attendant.findUnique({
        where: { id: attendantId },
        select: { id: true },
      });

      if (!attendantExists) {
        console.log(
          `Ignorando avaliação do agente "${evaluation.agente}" - atendente com ID "${attendantId}" não encontrado`,
        );
        skippedCount++;
        continue;
      }

      // Calcular XP
      const baseXp = getXpFromRating(evaluation.nota);
      const globalMultiplier = gamificationConfig.globalXpMultiplier || 1;
      const seasonMultiplier = activeSeason?.xpMultiplier || 1;
      const finalXp = Math.round(baseXp * globalMultiplier * seasonMultiplier);

      validEvaluations.push({
        attendantId,
        nota: evaluation.nota,
        comentario: evaluation.comentario,
        data: new Date(evaluation.data),
        xpGained: finalXp,
        xpEvent: {
          attendantId,
          points: finalXp,
          basePoints: baseXp,
          multiplier: globalMultiplier * seasonMultiplier,
          reason: `Avaliação ${evaluation.nota} estrelas`,
          date: new Date(evaluation.data),
          type: "EVALUATION",
          relatedId: "",
        },
      });
    }

    // Dividir em lotes
    for (let i = 0; i < validEvaluations.length; i += BATCH_SIZE) {
      evaluationBatches.push(validEvaluations.slice(i, i + BATCH_SIZE));
    }

    // Criar registro de importação primeiro
    const evaluationImport = await prisma.evaluationImport.create({
      data: {
        fileName,
        importedById: session.user.id,
        importedAt: new Date(),
        attendantMap: agentMap,
      },
    });

    let totalProcessedCount = 0;

    // Processar cada lote em uma transação separada com timeout aumentado
    for (const batch of evaluationBatches) {
      await prisma.$transaction(
        async (tx) => {
          const evaluationsData = batch.map((evaluation) => ({
            attendantId: evaluation.attendantId,
            nota: evaluation.nota,
            comentario: evaluation.comentario,
            data: evaluation.data,
            importId: evaluationImport.id,
            xpGained: evaluation.xpGained,
          }));

          // Criar avaliações em lote
          const createdEvaluations = [];
          for (const evalData of evaluationsData) {
            const createdEvaluation = await tx.evaluation.create({
              data: evalData,
            });
            createdEvaluations.push(createdEvaluation);
          }

          // Preparar eventos XP com IDs das avaliações criadas
          const xpEventsData = batch.map((evaluation, index) => ({
            ...evaluation.xpEvent,
            relatedId: createdEvaluations[index].id,
          }));

          // Criar eventos XP em lote
          await tx.xpEvent.createMany({
            data: xpEventsData,
          });

          totalProcessedCount += createdEvaluations.length;
        },
        {
          timeout: 15000, // 15 segundos por lote
        },
      );
    }

    const result = {
      evaluationsCount: totalProcessedCount,
      processedCount: totalProcessedCount,
      skippedCount,
      importId: evaluationImport.id,
    };

    return NextResponse.json({
      success: true,
      evaluationsCount: result.evaluationsCount,
      processedCount: result.processedCount,
      skippedCount: result.skippedCount,
      importId: result.importId,
      message: `${result.evaluationsCount} avaliações importadas com sucesso. ${result.skippedCount} avaliações ignoradas (atendente não identificado).`,
    });
  } catch (error) {
    console.error("Erro ao importar avaliações do WhatsApp:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
