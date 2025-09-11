import {
  XpAvulsoApiClient,
  CreateXpTypeSchema,
  UpdateXpTypeSchema,
  GrantXpSchema,
  GrantHistoryFiltersSchema,
  XpGrantWithRelations,
  GrantStatistics,
  GrantHistoryResponse,
  XpTypeConfig,
  XpGrant,
  Attendant,
  User,
} from "./xpAvulsoApiClient";

// Re-exportar tipos e schemas para manter compatibilidade
export {
  CreateXpTypeSchema,
  UpdateXpTypeSchema,
  GrantXpSchema,
  GrantHistoryFiltersSchema,
  XpGrantWithRelations,
  GrantStatistics,
};

// Importar z para os tipos
import { z } from "zod";

export type CreateXpTypeData = z.infer<typeof CreateXpTypeSchema>;
export type UpdateXpTypeData = z.infer<typeof UpdateXpTypeSchema>;
export type GrantXpData = z.infer<typeof GrantXpSchema>;
export type GrantHistoryFilters = z.infer<typeof GrantHistoryFiltersSchema>;

/**
 * XpAvulsoService - Wrapper para manter compatibilidade com código existente
 * Agora usa XpAvulsoApiClient internamente ao invés de Prisma direto
 */
export class XpAvulsoService {
  // === GERENCIAMENTO DE TIPOS DE XP ===

  /**
   * Criar novo tipo de XP avulso
   */
  static async createXpType(data: CreateXpTypeData): Promise<XpTypeConfig> {
    return XpAvulsoApiClient.createXpType(data);
  }

  /**
   * Atualizar tipo de XP existente
   */
  static async updateXpType(
    id: string,
    data: UpdateXpTypeData,
  ): Promise<XpTypeConfig> {
    return XpAvulsoApiClient.updateXpType(id, data);
  }

  /**
   * Buscar todos os tipos de XP
   */
  static async findAllXpTypes(
    activeOnly: boolean = false,
  ): Promise<XpTypeConfig[]> {
    return XpAvulsoApiClient.findAllXpTypes(activeOnly) as Promise<
      XpTypeConfig[]
    >;
  }

  /**
   * Alternar status ativo/inativo de um tipo de XP
   */
  static async toggleXpTypeStatus(id: string): Promise<XpTypeConfig> {
    return XpAvulsoApiClient.toggleXpTypeStatus(id);
  }

  // === CONCESSÃO DE XP ===

  /**
   * Conceder XP avulso para um atendente
   */
  static async grantXp(data: GrantXpData): Promise<XpGrantWithRelations> {
    return XpAvulsoApiClient.grantXp(data);
  }

  /**
   * Buscar histórico de concessões com filtros
   */
  static async findGrantHistory(filters: GrantHistoryFilters): Promise<{
    grants: XpGrantWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return XpAvulsoApiClient.findGrantHistory(filters);
  }

  /**
   * Buscar concessões de um atendente específico
   */
  static async findGrantsByAttendant(
    attendantId: string,
  ): Promise<XpGrantWithRelations[]> {
    return XpAvulsoApiClient.findGrantsByAttendant(attendantId);
  }

  /**
   * Buscar concessões de um atendente específico com ordenação customizável
   */
  static async findGrantsByAttendantWithSort(
    attendantId: string,
    sortBy: "grantedAt" | "points" | "typeName" | "granterName" = "grantedAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<XpGrantWithRelations[]> {
    return XpAvulsoApiClient.findGrantsByAttendantWithSort(
      attendantId,
      sortBy,
      sortOrder,
    );
  }

  // === VALIDAÇÕES E LIMITES ===

  /**
   * Validar limites de concessão por usuário
   */
  static async validateGrantLimits(
    granterId: string,
    points: number,
  ): Promise<void> {
    return XpAvulsoApiClient.validateGrantLimits(granterId, points);
  }

  /**
   * Verificar conquistas desbloqueadas após concessão de XP
   */
  static async checkAchievementsUnlocked(
    attendantId: string,
    previousXp: number,
    newXp: number,
  ): Promise<Array<{ id: string; title: string; description: string }>> {
    return XpAvulsoApiClient.checkAchievementsUnlocked(
      attendantId,
      previousXp,
      newXp,
    );
  }

  /**
   * Deletar uma concessão de XP (apenas SUPERADMIN)
   */
  static async deleteGrant(grantId: string): Promise<XpGrant> {
    return XpAvulsoApiClient.deleteGrant(grantId);
  }

  /**
   * Obter estatísticas de concessões
   */
  static async getGrantStatistics(
    period: string = "30d",
    userId?: string,
  ): Promise<GrantStatistics> {
    return XpAvulsoApiClient.getGrantStatistics(period, userId);
  }
}
