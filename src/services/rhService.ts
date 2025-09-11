import {
  RhApiClient,
  CreateFuncaoSchema,
  CreateSetorSchema,
  Funcao,
  Setor,
} from "./rhApiClient";

// Re-exportar tipos e schemas para manter compatibilidade
export { CreateFuncaoSchema, CreateSetorSchema };
export type CreateFuncaoData = z.infer<typeof CreateFuncaoSchema>;
export type CreateSetorData = z.infer<typeof CreateSetorSchema>;

// Importar z para os tipos
import { z } from "zod";

/**
 * RHService - Wrapper para manter compatibilidade com código existente
 * Agora usa RhApiClient internamente ao invés de Prisma direto
 */
export class RHService {
  // === FUNÇÕES ===

  // Buscar todas as funções
  static async findAllFuncoes(): Promise<Funcao[]> {
    return RhApiClient.findAllFuncoes() as Promise<Funcao[]>;
  }

  // Criar função
  static async createFuncao(funcaoData: CreateFuncaoData): Promise<Funcao> {
    return RhApiClient.createFuncao(funcaoData);
  }

  // === SETORES ===

  // Buscar todos os setores
  static async findAllSetores(): Promise<Setor[]> {
    return RhApiClient.findAllSetores() as Promise<Setor[]>;
  }

  // Criar setor
  static async createSetor(setorData: CreateSetorData): Promise<Setor> {
    return RhApiClient.createSetor(setorData);
  }
}
