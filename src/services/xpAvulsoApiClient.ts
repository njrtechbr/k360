import { httpClient } from "@/lib/httpClient";
import { ApiResponse } from "@/lib/api-types";
import { z } from "zod";

// Definir tipos localmente ao invés de importar do Prisma
export interface XpTypeConfig {
  id: string;
  name: string;
  description: string;
  points: number;
  category: string;
  icon: string;
  color: string;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface XpGrant {
  id: string;
  attendantId: string;
  typeId: string;
  points: number;
  justification?: string;
  grantedBy: string;
  grantedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendant {
  id: string;
  name: string;
  email: string;
  funcao: string;
  setor: string;
  status: string;
  avatarUrl?: string;
  telefone: string;
  portaria?: string;
  situacao?: string;
  dataAdmissao: Date;
  dataNascimento: Date;
  rg: string;
  cpf: string;
  importId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  modules: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Schemas de validação (mantidos do serviço original)
export const CreateXpTypeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  points: z.number().min(1, "Pontos devem ser positivos"),
  category: z.string().default("general"),
  icon: z.string().default("star"),
  color: z.string().default("#3B82F6"),
  createdBy: z.string().min(1, "Criador é obrigatório"),
});

export const UpdateXpTypeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  description: z.string().min(1, "Descrição é obrigatória").optional(),
  points: z.number().min(1, "Pontos devem ser positivos").optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const GrantXpSchema = z.object({
  attendantId: z.string().min(1, "Atendente é obrigatório"),
  typeId: z.string().min(1, "Tipo de XP é obrigatório"),
  justification: z.string().optional(),
  grantedBy: z.string().min(1, "Responsável pela concessão é obrigatório"),
});

export const GrantHistoryFiltersSchema = z.object({
  attendantId: z.string().optional(),
  typeId: z.string().optional(),
  granterId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minPoints: z.number().optional(),
  maxPoints: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z
    .enum(["grantedAt", "points", "attendantName", "typeName", "granterName"])
    .default("grantedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateXpTypeData = z.infer<typeof CreateXpTypeSchema>;
export type UpdateXpTypeData = z.infer<typeof UpdateXpTypeSchema>;
export type GrantXpData = z.infer<typeof GrantXpSchema>;
export type GrantHistoryFilters = z.infer<typeof GrantHistoryFiltersSchema>;

// Tipos para retorno de dados
export interface XpGrantWithRelations extends XpGrant {
  attendant: Attendant;
  type: XpTypeConfig;
  granter: User;
}

export interface GrantStatistics {
  totalGrants: number;
  totalPoints: number;
  averagePoints: number;
  grantsByType: Array<{
    typeId: string;
    typeName: string;
    count: number;
    totalPoints: number;
  }>;
  grantsByGranter: Array<{
    granterId: string;
    granterName: string;
    count: number;
    totalPoints: number;
  }>;
}

// Tipos para resposta da API
export interface XpTypeWithStats extends XpTypeConfig {
  _count?: {
    xpGrants: number;
  };
}

export interface GrantHistoryResponse {
  grants: XpGrantWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export class XpAvulsoApiClient {
  // === GERENCIAMENTO DE TIPOS DE XP ===

  /**
   * Criar novo tipo de XP avulso
   */
  static async createXpType(data: CreateXpTypeData): Promise<XpTypeConfig> {
    try {
      // Validar dados
      const validatedData = CreateXpTypeSchema.parse(data);

      const response = await httpClient.post<XpTypeConfig>(
        "/api/gamification/xp-types",
        validatedData,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao criar tipo de XP:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Atualizar tipo de XP existente
   */
  static async updateXpType(
    id: string,
    data: UpdateXpTypeData,
  ): Promise<XpTypeConfig> {
    try {
      // Validar dados
      const validatedData = UpdateXpTypeSchema.parse(data);

      const response = await httpClient.put<XpTypeConfig>(
        `/api/gamification/xp-types/${id}`,
        validatedData,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao atualizar tipo de XP:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Buscar todos os tipos de XP
   */
  static async findAllXpTypes(
    activeOnly: boolean = false,
  ): Promise<XpTypeWithStats[]> {
    try {
      const params = new URLSearchParams();
      if (activeOnly) {
        params.append("activeOnly", "true");
      }

      const response = await httpClient.get<XpTypeWithStats[]>(
        `/api/gamification/xp-types?${params}`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar tipos de XP:", error);
      throw new Error("Falha ao buscar tipos de XP");
    }
  }

  /**
   * Alternar status ativo/inativo de um tipo de XP
   */
  static async toggleXpTypeStatus(id: string): Promise<XpTypeConfig> {
    try {
      const response = await httpClient.patch<XpTypeConfig>(
        `/api/gamification/xp-types/${id}/toggle`,
        {},
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao alternar status do tipo de XP:", error);
      throw error;
    }
  }

  // === CONCESSÃO DE XP ===

  /**
   * Conceder XP avulso para um atendente
   */
  static async grantXp(data: GrantXpData): Promise<XpGrantWithRelations> {
    try {
      // Validar dados
      const validatedData = GrantXpSchema.parse(data);

      const response = await httpClient.post<XpGrantWithRelations>(
        "/api/gamification/xp-grants",
        validatedData,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao conceder XP:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Buscar histórico de concessões com filtros
   */
  static async findGrantHistory(
    filters: GrantHistoryFilters,
  ): Promise<GrantHistoryResponse> {
    try {
      // Validar filtros
      const validatedFilters = GrantHistoryFiltersSchema.parse(filters);

      // Construir parâmetros de query
      const params = new URLSearchParams();

      Object.entries(validatedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await httpClient.get<GrantHistoryResponse>(
        `/api/gamification/xp-grants?${params}`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar histórico de concessões:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Filtros inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw new Error("Falha ao buscar histórico de concessões");
    }
  }

  /**
   * Buscar concessões de um atendente específico
   */
  static async findGrantsByAttendant(
    attendantId: string,
  ): Promise<XpGrantWithRelations[]> {
    try {
      const response = await httpClient.get<XpGrantWithRelations[]>(
        `/api/gamification/xp-grants/attendant/${attendantId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar concessões do atendente:", error);
      throw error;
    }
  }

  /**
   * Buscar concessões de um atendente específico com ordenação customizável
   */
  static async findGrantsByAttendantWithSort(
    attendantId: string,
    sortBy: "grantedAt" | "points" | "typeName" | "granterName" = "grantedAt",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<XpGrantWithRelations[]> {
    try {
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
      });

      const response = await httpClient.get<XpGrantWithRelations[]>(
        `/api/gamification/xp-grants/attendant/${attendantId}?${params}`,
      );
      return response.data;
    } catch (error) {
      console.error(
        "Erro ao buscar concessões do atendente com ordenação:",
        error,
      );
      throw error;
    }
  }

  // === VALIDAÇÕES E LIMITES ===

  /**
   * Validar limites de concessão por usuário
   */
  static async validateGrantLimits(
    granterId: string,
    points: number,
  ): Promise<void> {
    try {
      await httpClient.post("/api/gamification/xp-grants/validate-limits", {
        granterId,
        points,
      });
    } catch (error) {
      console.error("Erro ao validar limites de concessão:", error);
      throw error;
    }
  }

  /**
   * Verificar conquistas desbloqueadas após concessão de XP
   */
  static async checkAchievementsUnlocked(
    attendantId: string,
    previousXp: number,
    newXp: number,
  ): Promise<Array<{ id: string; title: string; description: string }>> {
    try {
      const response = await httpClient.post<
        Array<{ id: string; title: string; description: string }>
      >("/api/gamification/xp-grants/check-achievements", {
        attendantId,
        previousXp,
        newXp,
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao verificar conquistas desbloqueadas:", error);
      return []; // Retornar array vazio em caso de erro para não quebrar o fluxo
    }
  }

  /**
   * Deletar uma concessão de XP (apenas SUPERADMIN)
   */
  static async deleteGrant(grantId: string): Promise<XpGrant> {
    try {
      const response = await httpClient.delete<XpGrant>(
        "/api/gamification/xp-grants",
        {
          grantId,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao deletar concessão:", error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de concessões
   */
  static async getGrantStatistics(
    period: string = "30d",
    userId?: string,
  ): Promise<GrantStatistics> {
    try {
      const params = new URLSearchParams({ period });
      if (userId) {
        params.append("userId", userId);
      }

      const response = await httpClient.get<GrantStatistics>(
        `/api/gamification/xp-grants/statistics?${params}`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao obter estatísticas de concessões:", error);
      throw error;
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Buscar estatísticas diárias de concessões
   */
  static async getDailyStats(date?: Date): Promise<{
    totalGrants: number;
    totalPoints: number;
    grantsByUser: Array<{
      userId: string;
      userName: string;
      grants: number;
      points: number;
    }>;
  }> {
    try {
      const params = new URLSearchParams();
      if (date) {
        params.append("date", date.toISOString().split("T")[0]);
      }

      const response = await httpClient.get<{
        totalGrants: number;
        totalPoints: number;
        grantsByUser: Array<{
          userId: string;
          userName: string;
          grants: number;
          points: number;
        }>;
      }>(`/api/gamification/xp-grants/daily-stats?${params}`);

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar estatísticas diárias:", error);
      throw error;
    }
  }

  /**
   * Buscar configurações de XP Avulso
   */
  static async getXpAvulsoConfig(): Promise<{
    dailyLimitPoints: number;
    dailyLimitGrants: number;
    maxPointsPerGrant: number;
    allowedRoles: string[];
  }> {
    try {
      const response = await httpClient.get<{
        dailyLimitPoints: number;
        dailyLimitGrants: number;
        maxPointsPerGrant: number;
        allowedRoles: string[];
      }>("/api/gamification/xp-avulso-config");

      return response.data;
    } catch (error) {
      console.error("Erro ao buscar configurações de XP Avulso:", error);
      throw error;
    }
  }

  /**
   * Atualizar configurações de XP Avulso
   */
  static async updateXpAvulsoConfig(config: {
    dailyLimitPoints?: number;
    dailyLimitGrants?: number;
    maxPointsPerGrant?: number;
    allowedRoles?: string[];
  }): Promise<void> {
    try {
      await httpClient.put("/api/gamification/xp-avulso-config", config);
    } catch (error) {
      console.error("Erro ao atualizar configurações de XP Avulso:", error);
      throw error;
    }
  }

  /**
   * Validar concessão de XP contra configurações
   */
  static async validateGrant(
    points: number,
    granterId: string,
    attendantId: string,
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const response = await httpClient.post<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
      }>("/api/gamification/xp-avulso-config/validate", {
        points,
        granterId,
        attendantId,
      });

      return response.data;
    } catch (error) {
      console.error("Erro ao validar concessão:", error);
      throw error;
    }
  }
}
