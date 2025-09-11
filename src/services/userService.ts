import { z } from "zod";
import {
  UserApiClient,
  CreateUserSchema,
  UpdateUserSchema,
  User,
} from "./userApiClient";

// Re-exportar tipos e schemas para manter compatibilidade
export { CreateUserSchema, UpdateUserSchema };
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;

/**
 * UserService - Wrapper para manter compatibilidade com código existente
 * Agora usa UserApiClient internamente ao invés de Prisma direto
 */
export class UserService {
  // Buscar todos os usuários
  static async findAll(): Promise<User[]> {
    return UserApiClient.findAll();
  }

  // Buscar usuário por ID
  static async findById(id: string): Promise<User | null> {
    return UserApiClient.findById(id);
  }

  // Buscar usuário por email
  static async findByEmail(email: string): Promise<User | null> {
    return UserApiClient.findByEmail(email);
  }

  // Criar novo usuário
  static async create(data: CreateUserData): Promise<User> {
    return UserApiClient.create(data);
  }

  // Atualizar usuário
  static async update(id: string, data: UpdateUserData): Promise<User> {
    return UserApiClient.update(id, data);
  }

  // Deletar usuário
  static async delete(id: string): Promise<void> {
    return UserApiClient.delete(id);
  }

  // Verificar se existe super admin
  static async hasSuperAdmin(): Promise<boolean> {
    return UserApiClient.hasSuperAdmin();
  }

  // Verificar credenciais para login
  static async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    return UserApiClient.verifyCredentials(email, password);
  }

  // Verificar se é super admin
  static async isSuperAdmin(userId: string): Promise<boolean> {
    return UserApiClient.isSuperAdmin(userId);
  }
}
