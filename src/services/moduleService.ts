import {
  ModuleApiClient,
  CreateModuleSchema,
  UpdateModuleSchema,
  Module,
} from "./moduleApiClient";

// Re-exportar tipos e schemas para manter compatibilidade
export { CreateModuleSchema, UpdateModuleSchema };
export type CreateModuleData = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleData = z.infer<typeof UpdateModuleSchema>;

// Importar z para os tipos
import { z } from "zod";

/**
 * ModuleService - Wrapper para manter compatibilidade com código existente
 * Agora usa ModuleApiClient internamente ao invés de Prisma direto
 */
export class ModuleService {
  // Buscar todos os módulos
  static async findAll(): Promise<Module[]> {
    return ModuleApiClient.findAll();
  }

  // Buscar módulos ativos
  static async findActive(): Promise<Module[]> {
    return ModuleApiClient.findActive();
  }

  // Buscar módulo por ID
  static async findById(id: string): Promise<Module | null> {
    return ModuleApiClient.findById(id);
  }

  // Criar módulo
  static async create(moduleData: CreateModuleData): Promise<Module> {
    return ModuleApiClient.create(moduleData);
  }

  // Atualizar módulo
  static async update(
    id: string,
    moduleData: UpdateModuleData,
  ): Promise<Module> {
    return ModuleApiClient.update(id, moduleData);
  }

  // Deletar módulo
  static async delete(id: string): Promise<void> {
    return ModuleApiClient.delete(id);
  }

  // Ativar/Desativar módulo
  static async toggleActive(id: string): Promise<Module> {
    return ModuleApiClient.toggleActive(id);
  }

  // Associar usuário ao módulo
  static async addUserToModule(
    moduleId: string,
    userId: string,
  ): Promise<Module> {
    return ModuleApiClient.addUserToModule(moduleId, userId);
  }

  // Remover usuário do módulo
  static async removeUserFromModule(
    moduleId: string,
    userId: string,
  ): Promise<Module> {
    return ModuleApiClient.removeUserFromModule(moduleId, userId);
  }

  // Alias para compatibilidade
  static async getAllModules(): Promise<Module[]> {
    return ModuleApiClient.getAllModules();
  }
}
