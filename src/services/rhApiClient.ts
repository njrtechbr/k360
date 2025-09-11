import { httpClient } from "@/lib/httpClient";
import { ApiResponse } from "@/lib/api-types";
import { z } from "zod";

// Definir tipos localmente ao invés de importar do Prisma
export interface Funcao {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Setor {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas de validação (mantidos do serviço original)
export const CreateFuncaoSchema = z.object({
  name: z.string().min(1, "Nome da função é obrigatório"),
});

export const CreateSetorSchema = z.object({
  name: z.string().min(1, "Nome do setor é obrigatório"),
});

export const UpdateFuncaoSchema = z.object({
  oldName: z.string().min(1, "Nome atual é obrigatório"),
  newName: z.string().min(1, "Novo nome é obrigatório"),
});

export const UpdateSetorSchema = z.object({
  oldName: z.string().min(1, "Nome atual é obrigatório"),
  newName: z.string().min(1, "Novo nome é obrigatório"),
});

export const BulkCreateFuncaoSchema = z.object({
  names: z
    .array(z.string().min(1, "Nome é obrigatório"))
    .min(1, "Pelo menos uma função é obrigatória")
    .max(50, "Máximo 50 funções por operação"),
});

export const BulkCreateSetorSchema = z.object({
  names: z
    .array(z.string().min(1, "Nome é obrigatório"))
    .min(1, "Pelo menos um setor é obrigatório")
    .max(50, "Máximo 50 setores por operação"),
});

export type CreateFuncaoData = z.infer<typeof CreateFuncaoSchema>;
export type CreateSetorData = z.infer<typeof CreateSetorSchema>;
export type UpdateFuncaoData = z.infer<typeof UpdateFuncaoSchema>;
export type UpdateSetorData = z.infer<typeof UpdateSetorSchema>;
export type BulkCreateFuncaoData = z.infer<typeof BulkCreateFuncaoSchema>;
export type BulkCreateSetorData = z.infer<typeof BulkCreateSetorSchema>;

// Tipos para resposta da API
export interface FuncaoWithDetails {
  name: string;
  attendantCount: number;
}

export interface SetorWithDetails {
  name: string;
  attendantCount: number;
}

export interface BulkOperationResult {
  created?: number;
  deleted?: number;
  names: string[];
}

export class RhApiClient {
  // === FUNÇÕES ===

  /**
   * Buscar todas as funções
   */
  static async findAllFuncoes(
    includeDetails: boolean = false,
  ): Promise<Funcao[] | FuncaoWithDetails[]> {
    try {
      const params = new URLSearchParams();
      if (includeDetails) {
        params.append("includeDetails", "true");
      }

      const response = await httpClient.get<{
        data: Funcao[] | FuncaoWithDetails[];
      }>(`/api/funcoes?${params}`);
      return response.data.data;
    } catch (error) {
      console.error("Erro ao buscar funções:", error);
      throw new Error("Falha ao buscar funções");
    }
  }

  /**
   * Buscar funções com filtro de pesquisa
   */
  static async searchFuncoes(
    search: string,
    includeDetails: boolean = false,
  ): Promise<Funcao[] | FuncaoWithDetails[]> {
    try {
      const params = new URLSearchParams({ search });
      if (includeDetails) {
        params.append("includeDetails", "true");
      }

      const response = await httpClient.get<{
        data: Funcao[] | FuncaoWithDetails[];
      }>(`/api/funcoes?${params}`);
      return response.data.data;
    } catch (error) {
      console.error("Erro ao pesquisar funções:", error);
      throw new Error("Falha ao pesquisar funções");
    }
  }

  /**
   * Criar função
   */
  static async createFuncao(funcaoData: CreateFuncaoData): Promise<Funcao> {
    try {
      // Validar dados
      const validatedData = CreateFuncaoSchema.parse(funcaoData);

      const response = await httpClient.post<{ data: Funcao }>(
        "/api/funcoes",
        validatedData,
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao criar função:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Criar múltiplas funções em lote
   */
  static async createFuncoesBulk(
    data: BulkCreateFuncaoData,
  ): Promise<BulkOperationResult> {
    try {
      // Validar dados
      const validatedData = BulkCreateFuncaoSchema.parse(data);

      const response = await httpClient.post<{ data: BulkOperationResult }>(
        "/api/funcoes",
        validatedData,
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao criar funções em lote:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Atualizar função
   */
  static async updateFuncao(data: UpdateFuncaoData): Promise<Funcao> {
    try {
      // Validar dados
      const validatedData = UpdateFuncaoSchema.parse(data);

      const response = await httpClient.put<{ data: Funcao }>(
        "/api/funcoes",
        validatedData,
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao atualizar função:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Deletar função
   */
  static async deleteFuncao(name: string): Promise<void> {
    try {
      await httpClient.delete("/api/funcoes", { name });
    } catch (error) {
      console.error("Erro ao deletar função:", error);
      throw error;
    }
  }

  /**
   * Deletar múltiplas funções em lote
   */
  static async deleteFuncoesBulk(
    names: string[],
  ): Promise<BulkOperationResult> {
    try {
      const response = await httpClient.delete<{ data: BulkOperationResult }>(
        "/api/funcoes",
        { names },
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao deletar funções em lote:", error);
      throw error;
    }
  }

  /**
   * Verificar se função existe
   */
  static async funcaoExists(name: string): Promise<boolean> {
    try {
      const funcoes = await this.findAllFuncoes();
      return funcoes.some((funcao) =>
        typeof funcao === "string" ? funcao === name : funcao.name === name,
      );
    } catch (error) {
      console.error("Erro ao verificar existência da função:", error);
      return false;
    }
  }

  // === SETORES ===

  /**
   * Buscar todos os setores
   */
  static async findAllSetores(
    includeDetails: boolean = false,
  ): Promise<Setor[] | SetorWithDetails[]> {
    try {
      const params = new URLSearchParams();
      if (includeDetails) {
        params.append("includeDetails", "true");
      }

      const response = await httpClient.get<{
        data: Setor[] | SetorWithDetails[];
      }>(`/api/setores?${params}`);
      return response.data.data;
    } catch (error) {
      console.error("Erro ao buscar setores:", error);
      throw new Error("Falha ao buscar setores");
    }
  }

  /**
   * Buscar setores com filtro de pesquisa
   */
  static async searchSetores(
    search: string,
    includeDetails: boolean = false,
  ): Promise<Setor[] | SetorWithDetails[]> {
    try {
      const params = new URLSearchParams({ search });
      if (includeDetails) {
        params.append("includeDetails", "true");
      }

      const response = await httpClient.get<{
        data: Setor[] | SetorWithDetails[];
      }>(`/api/setores?${params}`);
      return response.data.data;
    } catch (error) {
      console.error("Erro ao pesquisar setores:", error);
      throw new Error("Falha ao pesquisar setores");
    }
  }

  /**
   * Criar setor
   */
  static async createSetor(setorData: CreateSetorData): Promise<Setor> {
    try {
      // Validar dados
      const validatedData = CreateSetorSchema.parse(setorData);

      const response = await httpClient.post<{ data: Setor }>(
        "/api/setores",
        validatedData,
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao criar setor:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Criar múltiplos setores em lote
   */
  static async createSetoresBulk(
    data: BulkCreateSetorData,
  ): Promise<BulkOperationResult> {
    try {
      // Validar dados
      const validatedData = BulkCreateSetorSchema.parse(data);

      const response = await httpClient.post<{ data: BulkOperationResult }>(
        "/api/setores",
        validatedData,
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao criar setores em lote:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Atualizar setor
   */
  static async updateSetor(data: UpdateSetorData): Promise<Setor> {
    try {
      // Validar dados
      const validatedData = UpdateSetorSchema.parse(data);

      const response = await httpClient.put<{ data: Setor }>(
        "/api/setores",
        validatedData,
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao atualizar setor:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  /**
   * Deletar setor
   */
  static async deleteSetor(name: string): Promise<void> {
    try {
      await httpClient.delete("/api/setores", { name });
    } catch (error) {
      console.error("Erro ao deletar setor:", error);
      throw error;
    }
  }

  /**
   * Deletar múltiplos setores em lote
   */
  static async deleteSetoresBulk(
    names: string[],
  ): Promise<BulkOperationResult> {
    try {
      const response = await httpClient.delete<{ data: BulkOperationResult }>(
        "/api/setores",
        { names },
      );
      return response.data.data;
    } catch (error) {
      console.error("Erro ao deletar setores em lote:", error);
      throw error;
    }
  }

  /**
   * Verificar se setor existe
   */
  static async setorExists(name: string): Promise<boolean> {
    try {
      const setores = await this.findAllSetores();
      return setores.some((setor) =>
        typeof setor === "string" ? setor === name : setor.name === name,
      );
    } catch (error) {
      console.error("Erro ao verificar existência do setor:", error);
      return false;
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Obter estatísticas de RH
   */
  static async getRhStatistics(): Promise<{
    totalFuncoes: number;
    totalSetores: number;
    funcoesComAtendentes: number;
    setoresComAtendentes: number;
  }> {
    try {
      const [funcoes, setores] = await Promise.all([
        this.findAllFuncoes(true) as Promise<FuncaoWithDetails[]>,
        this.findAllSetores(true) as Promise<SetorWithDetails[]>,
      ]);

      const funcoesComAtendentes = funcoes.filter(
        (f) => f.attendantCount > 0,
      ).length;
      const setoresComAtendentes = setores.filter(
        (s) => s.attendantCount > 0,
      ).length;

      return {
        totalFuncoes: funcoes.length,
        totalSetores: setores.length,
        funcoesComAtendentes,
        setoresComAtendentes,
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas de RH:", error);
      throw new Error("Falha ao obter estatísticas de RH");
    }
  }

  /**
   * Validar dados de RH antes de operações
   */
  static async validateRhData(
    type: "funcao" | "setor",
    name: string,
    operation: "create" | "update" | "delete",
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validações básicas
      if (!name || name.trim().length === 0) {
        errors.push("Nome é obrigatório");
      }

      if (name.length > 100) {
        errors.push("Nome muito longo (máximo 100 caracteres)");
      }

      // Validações específicas por operação
      if (operation === "create") {
        const exists =
          type === "funcao"
            ? await this.funcaoExists(name)
            : await this.setorExists(name);

        if (exists) {
          errors.push(`${type === "funcao" ? "Função" : "Setor"} já existe`);
        }
      }

      if (operation === "delete") {
        // Verificar se está em uso (seria feito pela API, mas podemos avisar)
        warnings.push(
          "Verifique se não há atendentes vinculados antes de deletar",
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error("Erro ao validar dados de RH:", error);
      return {
        isValid: false,
        errors: ["Erro interno na validação"],
        warnings: [],
      };
    }
  }

  /**
   * Sincronizar dados de RH (útil para cache)
   */
  static async syncRhData(): Promise<{
    funcoes: Funcao[];
    setores: Setor[];
    lastSync: Date;
  }> {
    try {
      const [funcoes, setores] = await Promise.all([
        this.findAllFuncoes() as Promise<Funcao[]>,
        this.findAllSetores() as Promise<Setor[]>,
      ]);

      return {
        funcoes,
        setores,
        lastSync: new Date(),
      };
    } catch (error) {
      console.error("Erro ao sincronizar dados de RH:", error);
      throw new Error("Falha ao sincronizar dados de RH");
    }
  }
}
