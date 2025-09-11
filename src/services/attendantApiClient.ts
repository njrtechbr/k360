import { z } from "zod";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Definir tipos localmente ao invés de importar do Prisma
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

// Schemas de validação (mantidos do serviço original)
export const CreateAttendantSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  funcao: z.string().min(1, "Função é obrigatória"),
  setor: z.string().min(1, "Setor é obrigatório"),
  status: z.string().min(1, "Status é obrigatório"),
  avatarUrl: z.string().optional(),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  portaria: z.string().optional(),
  situacao: z.string().optional(),
  dataAdmissao: z.date(),
  dataNascimento: z.date(),
  rg: z.string().min(1, "RG é obrigatório"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  importId: z.string().optional(),
});

export const UpdateAttendantSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("Email inválido").optional(),
  funcao: z.string().min(1, "Função é obrigatória").optional(),
  setor: z.string().min(1, "Setor é obrigatório").optional(),
  status: z.string().min(1, "Status é obrigatório").optional(),
  avatarUrl: z.string().optional(),
  telefone: z.string().min(1, "Telefone é obrigatório").optional(),
  portaria: z.string().optional(),
  situacao: z.string().optional(),
  dataAdmissao: z.date().optional(),
  dataNascimento: z.date().optional(),
  rg: z.string().min(1, "RG é obrigatório").optional(),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").optional(),
});

export type CreateAttendantData = z.infer<typeof CreateAttendantSchema>;
export type UpdateAttendantData = z.infer<typeof UpdateAttendantSchema>;

/**
 * AttendantApiClient - Cliente para operações de atendente via API REST
 * Substitui o AttendantService que usava Prisma diretamente
 */
export class AttendantApiClient {
  // Buscar todos os atendentes
  static async findAll(): Promise<Attendant[]> {
    try {
      const response = await httpClient.get<Attendant[]>("/api/attendants");
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar atendentes");
    }
  }

  // Buscar atendente por ID
  static async findById(id: string): Promise<Attendant | null> {
    try {
      const response = await httpClient.get<Attendant>(`/api/attendants/${id}`);
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
      throw new Error("Erro ao buscar atendente");
    }
  }

  // Buscar atendente por email
  static async findByEmail(email: string): Promise<Attendant | null> {
    try {
      const response = await httpClient.get<Attendant>(
        `/api/attendants?email=${encodeURIComponent(email)}`,
      );
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
      throw new Error("Erro ao buscar atendente por email");
    }
  }

  // Buscar atendente por CPF
  static async findByCpf(cpf: string): Promise<Attendant | null> {
    try {
      const response = await httpClient.get<Attendant>(
        `/api/attendants?cpf=${encodeURIComponent(cpf)}`,
      );
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
      throw new Error("Erro ao buscar atendente por CPF");
    }
  }

  // Criar atendente
  static async create(data: CreateAttendantData): Promise<Attendant> {
    try {
      // Validar dados localmente antes de enviar
      const validatedData = CreateAttendantSchema.parse(data);

      const response = await httpClient.post<Attendant>(
        "/api/attendants",
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

      throw new Error("Erro ao criar atendente");
    }
  }

  // Atualizar atendente
  static async update(
    id: string,
    data: UpdateAttendantData,
  ): Promise<Attendant> {
    try {
      // Validar dados localmente antes de enviar
      const validatedData = UpdateAttendantSchema.parse(data);

      const response = await httpClient.put<Attendant>(
        `/api/attendants/${id}`,
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

      throw new Error("Erro ao atualizar atendente");
    }
  }

  // Deletar atendente
  static async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/attendants/${id}`);
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao deletar atendente");
    }
  }

  // Importação em lote
  static async createBatch(
    attendantsData: CreateAttendantData[],
    importId?: string,
  ): Promise<Attendant[]> {
    try {
      // Adicionar importId a todos os itens se fornecido
      const dataWithImportId = importId
        ? attendantsData.map((data) => ({ ...data, importId }))
        : attendantsData;

      // Validar todos os dados localmente antes de enviar
      const validatedData = dataWithImportId.map((data) =>
        CreateAttendantSchema.parse(data),
      );

      const response = await httpClient.post<Attendant[]>(
        "/api/attendants",
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

      throw new Error("Erro na importação em lote");
    }
  }

  // Deletar por importação
  static async deleteByImportId(importId: string): Promise<number> {
    try {
      const response = await httpClient.delete<{ count: number }>(
        `/api/attendants/imports/${importId}`,
      );
      return response.data.count;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao deletar atendentes por importação");
    }
  }

  // Buscar por setor
  static async findBySetor(setor: string): Promise<Attendant[]> {
    try {
      const response = await httpClient.get<Attendant[]>(
        `/api/attendants?setor=${encodeURIComponent(setor)}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar atendentes por setor");
    }
  }

  // Buscar por função
  static async findByFuncao(funcao: string): Promise<Attendant[]> {
    try {
      const response = await httpClient.get<Attendant[]>(
        `/api/attendants?funcao=${encodeURIComponent(funcao)}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar atendentes por função");
    }
  }

  // Alias para compatibilidade
  static async getAllAttendants(): Promise<Attendant[]> {
    return this.findAll();
  }
}

// Manter compatibilidade com o serviço original
export const AttendantService = AttendantApiClient;
