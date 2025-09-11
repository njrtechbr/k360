import { z } from "zod";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Definir tipos localmente ao invés de importar do Prisma
export interface Module {
  id: string;
  name: string;
  description: string;
  path: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas de validação (mantidos do serviço original)
export const CreateModuleSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  path: z.string().min(1, "Caminho é obrigatório"),
  active: z.boolean().default(true),
});

export const UpdateModuleSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  description: z.string().min(1, "Descrição é obrigatória").optional(),
  path: z.string().min(1, "Caminho é obrigatório").optional(),
  active: z.boolean().optional(),
});

export type CreateModuleData = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleData = z.infer<typeof UpdateModuleSchema>;

/**
 * ModuleApiClient - Cliente para operações de módulo via API REST
 * Substitui o ModuleService que usava Prisma diretamente
 */
export class ModuleApiClient {
  // Buscar todos os módulos
  static async findAll(): Promise<Module[]> {
    try {
      const response = await httpClient.get<Module[]>("/api/modules");
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar módulos");
    }
  }

  // Buscar módulos ativos
  static async findActive(): Promise<Module[]> {
    try {
      const response = await httpClient.get<Module[]>(
        "/api/modules?active=true",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar módulos ativos");
    }
  }

  // Buscar módulo por ID
  static async findById(id: string): Promise<Module | null> {
    try {
      const response = await httpClient.get<Module>(`/api/modules/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        if (error.status === 404) {
          return null;
        }
        throw new Error(error.message);
      }
      // Para testes, verificar se o erro tem propriedade status
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as any).status === 404
      ) {
        return null;
      }
      throw new Error("Erro ao buscar módulo");
    }
  }

  // Criar módulo
  static async create(data: CreateModuleData): Promise<Module> {
    try {
      // Validar dados localmente antes de enviar
      const validatedData = CreateModuleSchema.parse(data);

      const response = await httpClient.post<Module>(
        "/api/modules",
        validatedData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }

      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }

      throw new Error("Erro ao criar módulo");
    }
  }

  // Atualizar módulo
  static async update(id: string, data: UpdateModuleData): Promise<Module> {
    try {
      // Validar dados localmente antes de enviar
      const validatedData = UpdateModuleSchema.parse(data);

      const response = await httpClient.put<Module>(
        `/api/modules/${id}`,
        validatedData,
      );
      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }

      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }

      throw new Error("Erro ao atualizar módulo");
    }
  }

  // Deletar módulo
  static async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/modules/${id}`);
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao deletar módulo");
    }
  }

  // Ativar/Desativar módulo
  static async toggleActive(id: string): Promise<Module> {
    try {
      const response = await httpClient.get<Module>(
        `/api/modules/${id}?action=toggle`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao alterar status do módulo");
    }
  }

  // Associar usuário ao módulo
  static async addUserToModule(
    moduleId: string,
    userId: string,
  ): Promise<Module> {
    try {
      const response = await httpClient.post<Module>(
        `/api/modules/${moduleId}/users`,
        { userId },
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao associar usuário ao módulo");
    }
  }

  // Remover usuário do módulo
  static async removeUserFromModule(
    moduleId: string,
    userId: string,
  ): Promise<Module> {
    try {
      const response = await httpClient.delete<Module>(
        `/api/modules/${moduleId}/users/${userId}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao remover usuário do módulo");
    }
  }

  // Alias para compatibilidade
  static async getAllModules(): Promise<Module[]> {
    return this.findAll();
  }
}

// Manter compatibilidade com o serviço original
export const ModuleService = ModuleApiClient;
