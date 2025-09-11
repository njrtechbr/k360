import {
  AttendantApiClient,
  CreateAttendantSchema,
  UpdateAttendantSchema,
  Attendant,
} from "./attendantApiClient";

// Re-exportar tipos e schemas para manter compatibilidade
export { CreateAttendantSchema, UpdateAttendantSchema };
export type CreateAttendantData = z.infer<typeof CreateAttendantSchema>;
export type UpdateAttendantData = z.infer<typeof UpdateAttendantSchema>;

// Importar z para os tipos
import { z } from "zod";

/**
 * AttendantService - Wrapper para manter compatibilidade com código existente
 * Agora usa AttendantApiClient internamente ao invés de Prisma direto
 */
export class AttendantService {
  // Buscar todos os atendentes
  static async findAll(): Promise<Attendant[]> {
    return AttendantApiClient.findAll();
  }

  // Buscar atendente por ID
  static async findById(id: string): Promise<Attendant | null> {
    return AttendantApiClient.findById(id);
  }

  // Buscar atendente por email
  static async findByEmail(email: string): Promise<Attendant | null> {
    return AttendantApiClient.findByEmail(email);
  }

  // Buscar atendente por CPF
  static async findByCpf(cpf: string): Promise<Attendant | null> {
    return AttendantApiClient.findByCpf(cpf);
  }

  // Criar atendente
  static async create(attendantData: CreateAttendantData): Promise<Attendant> {
    return AttendantApiClient.create(attendantData);
  }

  // Atualizar atendente
  static async update(
    id: string,
    attendantData: UpdateAttendantData,
  ): Promise<Attendant> {
    return AttendantApiClient.update(id, attendantData);
  }

  // Deletar atendente
  static async delete(id: string): Promise<void> {
    return AttendantApiClient.delete(id);
  }

  // Importação em lote
  static async createBatch(
    attendantsData: CreateAttendantData[],
    importId?: string,
  ): Promise<Attendant[]> {
    return AttendantApiClient.createBatch(attendantsData, importId);
  }

  // Deletar por importação
  static async deleteByImportId(importId: string): Promise<number> {
    return AttendantApiClient.deleteByImportId(importId);
  }

  // Buscar por setor
  static async findBySetor(setor: string): Promise<Attendant[]> {
    return AttendantApiClient.findBySetor(setor);
  }

  // Buscar por função
  static async findByFuncao(funcao: string): Promise<Attendant[]> {
    return AttendantApiClient.findByFuncao(funcao);
  }

  // Alias para compatibilidade
  static async getAllAttendants(): Promise<Attendant[]> {
    return AttendantApiClient.getAllAttendants();
  }
}
