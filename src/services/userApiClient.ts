import { z } from "zod";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Definir tipos localmente ao invés de importar do Prisma
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  modules: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum Role {
  SUPERADMIN = "SUPERADMIN",
  ADMIN = "ADMIN",
  SUPERVISOR = "SUPERVISOR",
  USUARIO = "USUARIO",
}

// Schemas de validação (mantidos do serviço original)
export const CreateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.nativeEnum(Role).default(Role.USUARIO),
  modules: z.array(z.string()).optional().default([]),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("Email inválido").optional(),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .optional(),
  role: z.nativeEnum(Role).optional(),
  modules: z.array(z.string()).optional(),
});

export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;

/**
 * UserApiClient - Cliente para operações de usuário via API REST
 * Substitui o UserService que usava Prisma diretamente
 */
export class UserApiClient {
  // Buscar todos os usuários
  static async findAll(): Promise<User[]> {
    try {
      const response = await httpClient.get<User[]>("/api/users");
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar usuários");
    }
  }

  // Buscar usuário por ID
  static async findById(id: string): Promise<User | null> {
    try {
      const response = await httpClient.get<User>(`/api/users/${id}`);
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
      throw new Error("Erro ao buscar usuário");
    }
  }

  // Buscar usuário por email
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const response = await httpClient.get<User>(
        `/api/users?email=${encodeURIComponent(email)}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        if (error.status === 404) {
          return null;
        }
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar usuário por email");
    }
  }

  // Criar novo usuário
  static async create(data: CreateUserData): Promise<User> {
    try {
      // Validar dados localmente antes de enviar
      const validatedData = CreateUserSchema.parse(data);

      const response = await httpClient.post<User>("/api/users", validatedData);
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

      throw new Error("Erro ao criar usuário");
    }
  }

  // Atualizar usuário
  static async update(id: string, data: UpdateUserData): Promise<User> {
    try {
      // Validar dados localmente antes de enviar
      const validatedData = UpdateUserSchema.parse(data);

      const response = await httpClient.put<User>(
        `/api/users/${id}`,
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

      throw new Error("Erro ao atualizar usuário");
    }
  }

  // Deletar usuário
  static async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/users/${id}`);
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao deletar usuário");
    }
  }

  // Verificar se existe super admin
  static async hasSuperAdmin(): Promise<boolean> {
    try {
      const response = await httpClient.get<{ hasSuperAdmin: boolean }>(
        "/api/users?checkSuperAdmin=true",
      );
      return response.data.hasSuperAdmin;
    } catch (error) {
      if (error instanceof HttpClientError) {
        console.error("Erro ao verificar super admin:", error.message);
        return false;
      }
      return false;
    }
  }

  // Verificar credenciais para login
  static async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    try {
      const response = await httpClient.post<User>("/api/users/login", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        if (error.status === 401) {
          return null; // Credenciais inválidas
        }
        console.error("Erro ao verificar credenciais:", error.message);
        return null;
      }
      return null;
    }
  }

  // Verificar se é super admin
  static async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const response = await httpClient.get<{ isSuperAdmin: boolean }>(
        `/api/users/${userId}?checkSuperAdmin=true`,
      );
      return response.data.isSuperAdmin;
    } catch (error) {
      if (error instanceof HttpClientError) {
        console.error("Erro ao verificar se é super admin:", error.message);
        return false;
      }
      return false;
    }
  }
}

// Manter compatibilidade com o serviço original
export const UserService = UserApiClient;
