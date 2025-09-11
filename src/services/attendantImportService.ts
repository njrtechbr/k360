import { httpClient, HttpClientError } from "@/lib/httpClient";

export interface AttendantImport {
  id: string;
  fileName: string;
  importedAt: string;
  importedBy: {
    id: string;
    name: string;
    email: string;
  };
  attendantCount: number;
}

export interface ImportAttendantsData {
  fileName: string;
  attendants: any[];
  importedById: string;
}

export interface ImportResult {
  importId: string;
  count: number;
}

/**
 * AttendantImportService - Serviço para gerenciar importações de atendentes via API
 */
export class AttendantImportService {
  // Buscar todas as importações
  static async findAll(): Promise<AttendantImport[]> {
    try {
      const response = await httpClient.get<AttendantImport[]>(
        "/api/attendants/imports-list",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar importações de atendentes");
    }
  }

  // Verificar se usuário existe
  static async verifyUser(
    userId: string,
  ): Promise<{ id: string; name: string; email: string } | null> {
    try {
      const response = await httpClient.get<{
        id: string;
        name: string;
        email: string;
      }>(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError && error.status === 404) {
        return null;
      }
      throw new Error("Erro ao verificar usuário");
    }
  }

  // Importar atendentes
  static async importAttendants(
    data: ImportAttendantsData,
  ): Promise<ImportResult> {
    try {
      const response = await httpClient.post<ImportResult>(
        "/api/attendants/import-batch",
        data,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao importar atendentes");
    }
  }
}
