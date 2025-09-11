import { z } from "zod";
import {
  EvaluationApiClient,
  CreateEvaluationSchema,
  UpdateEvaluationSchema,
  CreateEvaluationData,
  UpdateEvaluationData,
  Evaluation,
} from "./evaluationApiClient";

// Re-exportar tipos e schemas para manter compatibilidade
export { CreateEvaluationSchema, UpdateEvaluationSchema };
export type { CreateEvaluationData, UpdateEvaluationData };

/**
 * EvaluationService - Wrapper para manter compatibilidade com código existente
 * Agora usa EvaluationApiClient internamente ao invés de Prisma direto
 */
export class EvaluationService {
  // Buscar todas as avaliações
  static async findAll(): Promise<Evaluation[]> {
    return EvaluationApiClient.findAll();
  }

  // Buscar avaliação por ID
  static async findById(id: string): Promise<Evaluation | null> {
    return EvaluationApiClient.findById(id);
  }

  // Buscar avaliações por atendente
  static async findByAttendantId(attendantId: string): Promise<Evaluation[]> {
    return EvaluationApiClient.findByAttendantId(attendantId);
  }

  // Criar avaliação
  static async create(
    evaluationData: CreateEvaluationData,
  ): Promise<Evaluation> {
    return EvaluationApiClient.create(evaluationData);
  }

  // Atualizar avaliação
  static async update(
    id: string,
    evaluationData: UpdateEvaluationData,
  ): Promise<Evaluation> {
    return EvaluationApiClient.update(id, evaluationData);
  }

  // Deletar avaliação
  static async delete(id: string): Promise<void> {
    return EvaluationApiClient.delete(id);
  }

  // Importação em lote
  static async createBatch(
    evaluationsData: CreateEvaluationData[],
    importId?: string,
  ): Promise<Evaluation[]> {
    return EvaluationApiClient.createBatch(evaluationsData, importId);
  }

  // Deletar por importação
  static async deleteByImportId(importId: string): Promise<number> {
    return EvaluationApiClient.deleteByImportId(importId);
  }

  // Buscar avaliações por período
  static async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Evaluation[]> {
    return EvaluationApiClient.findByDateRange(startDate, endDate);
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
    return EvaluationApiClient.importEvaluations(evaluations, fileName);
  }

  // Deletar múltiplas avaliações por IDs
  static async deleteMultiple(evaluationIds: string[]): Promise<{
    deletedEvaluations: number;
    deletedXpEvents: number;
    message: string;
  }> {
    return EvaluationApiClient.deleteMultiple(evaluationIds);
  }
}
