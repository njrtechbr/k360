import { z } from "zod";
import { httpClient, ApiResponse } from "@/lib/httpClient";

// Definir tipos localmente ao invés de importar do Prisma
export interface Evaluation {
  id: string;
  attendantId: string;
  nota: number;
  comentario: string;
  data: Date;
  xpGained: number;
  importId?: string;
  createdAt: Date;
  updatedAt: Date;
  attendant?: {
    id: string;
    name: string;
    email: string;
    funcao: string;
    setor: string;
  };
}

// Schemas de validação (re-exportados do PrismaService para manter compatibilidade)
export const CreateEvaluationSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
  nota: z.number().min(1, "Nota mínima é 1").max(5, "Nota máxima é 5"),
  comentario: z.string().default(""),
  data: z.date(),
  xpGained: z.number().default(0),
  importId: z.string().optional(),
});

export const UpdateEvaluationSchema = z.object({
  nota: z
    .number()
    .min(1, "Nota mínima é 1")
    .max(5, "Nota máxima é 5")
    .optional(),
  comentario: z.string().optional(),
  data: z.date().optional(),
  xpGained: z.number().optional(),
});

export type CreateEvaluationData = z.infer<typeof CreateEvaluationSchema>;
export type UpdateEvaluationData = z.infer<typeof UpdateEvaluationSchema>;

/**
 * EvaluationApiClient - Cliente para comunicação com APIs de avaliação
 * Substitui o acesso direto ao Prisma por chamadas HTTP para endpoints REST
 */
export class EvaluationApiClient {
  // Buscar todas as avaliações
  static async findAll(): Promise<Evaluation[]> {
    const response = await httpClient.get<Evaluation[]>("/api/evaluations");
    return response.data;
  }

  // Buscar avaliação por ID
  static async findById(id: string): Promise<Evaluation | null> {
    try {
      const response = await httpClient.get<Evaluation>(
        `/api/evaluations/${id}`,
      );
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Buscar avaliações por atendente
  static async findByAttendantId(attendantId: string): Promise<Evaluation[]> {
    const response = await httpClient.get<Evaluation[]>(
      `/api/evaluations?attendantId=${attendantId}`,
    );
    return response.data;
  }

  // Criar avaliação
  static async create(
    evaluationData: CreateEvaluationData,
  ): Promise<Evaluation> {
    // Validar dados localmente antes de enviar
    const validatedData = CreateEvaluationSchema.parse(evaluationData);

    // Converter Date para string ISO para serialização JSON
    const dataToSend = {
      ...validatedData,
      data: validatedData.data.toISOString(),
    };

    const response = await httpClient.post<Evaluation>(
      "/api/evaluations",
      dataToSend,
    );
    return response.data;
  }

  // Atualizar avaliação
  static async update(
    id: string,
    evaluationData: UpdateEvaluationData,
  ): Promise<Evaluation> {
    // Validar dados localmente antes de enviar
    const validatedData = UpdateEvaluationSchema.parse(evaluationData);

    // Converter Date para string ISO se presente
    const dataToSend = {
      ...validatedData,
      ...(validatedData.data && { data: validatedData.data.toISOString() }),
    };

    const response = await httpClient.put<Evaluation>(
      `/api/evaluations/${id}`,
      dataToSend,
    );
    return response.data;
  }

  // Deletar avaliação
  static async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/evaluations/${id}`);
  }

  // Importação em lote
  static async createBatch(
    evaluationsData: CreateEvaluationData[],
    importId?: string,
  ): Promise<Evaluation[]> {
    // Validar todos os dados localmente
    const validatedData = evaluationsData.map((data) =>
      CreateEvaluationSchema.parse(data),
    );

    // Converter Dates para strings ISO para serialização JSON
    const dataToSend = validatedData.map((data) => ({
      ...data,
      data: data.data.toISOString(),
      ...(importId && { importId }),
    }));

    const response = await httpClient.post<Evaluation[]>(
      "/api/evaluations",
      dataToSend,
    );
    return response.data;
  }

  // Deletar por importação
  static async deleteByImportId(importId: string): Promise<number> {
    const response = await httpClient.delete<{ count: number }>(
      `/api/evaluations/imports/${importId}`,
    );
    return response.data.count;
  }

  // Buscar avaliações por período
  static async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Evaluation[]> {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const response = await httpClient.get<Evaluation[]>(
      `/api/evaluations?startDate=${startDateStr}&endDate=${endDateStr}`,
    );
    return response.data;
  }

  // Importar avaliações com processamento completo (XP e conquistas)
  static async importEvaluations(
    evaluations: any[],
    fileName: string,
  ): Promise<{
    success: boolean;
    importId: string;
    fileName: string;
    evaluationsCount: number;
    xpEventsCount: number;
    achievementsUnlocked: number;
    achievementXpAwarded: number;
    message: string;
  }> {
    // Converter datas para strings ISO
    const evaluationsToSend = evaluations.map((evaluation) => ({
      ...evaluation,
      data: new Date(evaluation.data).toISOString(),
    }));

    const response = await httpClient.post<{
      success: boolean;
      importId: string;
      fileName: string;
      evaluationsCount: number;
      xpEventsCount: number;
      achievementsUnlocked: number;
      achievementXpAwarded: number;
      message: string;
    }>("/api/evaluations/import", {
      evaluations: evaluationsToSend,
      fileName,
    });

    return response.data;
  }

  // Deletar múltiplas avaliações por IDs
  static async deleteMultiple(evaluationIds: string[]): Promise<{
    deletedEvaluations: number;
    deletedXpEvents: number;
    message: string;
  }> {
    const response = await httpClient.delete<{
      deletedEvaluations: number;
      deletedXpEvents: number;
      message: string;
    }>("/api/evaluations/delete", {
      body: JSON.stringify({ evaluationIds }),
    });

    return response.data;
  }
}
