import { NextRequest } from "next/server";
import crypto from "crypto";
import { BackupService, setProgressCallback } from "@/services/backupService";
import { withBackupSecurity } from "@/lib/middleware/backupSecurityMiddleware";

// Importar função de atualização de progresso
import { updateBackupProgress } from "../status/[id]/route";

interface CreateBackupRequest {
  options?: {
    filename?: string;
    directory?: string;
    includeData?: boolean;
    includeSchema?: boolean;
    compress?: boolean;
  };
}

export async function POST(request: NextRequest) {
  return withBackupSecurity(request, "canCreate", async (context) => {
    let body: CreateBackupRequest = {};

    try {
      // Parse do body da requisição
      try {
        body = await request.json();
      } catch (error) {
        // Body vazio é válido, usar opções padrão
        body = {};
      }

      // Validar opções de entrada
      const options = body.options || {};

      // Validações básicas
      if (options.filename) {
        if (
          typeof options.filename !== "string" ||
          options.filename.length === 0
        ) {
          throw new Error("Nome do arquivo deve ser uma string não vazia");
        }

        if (!/^[a-zA-Z0-9_-]+(\.(sql|gz))?$/.test(options.filename)) {
          throw new Error(
            "Nome do arquivo contém caracteres inválidos. Use apenas letras, números, _ e -",
          );
        }

        if (options.filename.length > 100) {
          throw new Error(
            "Nome do arquivo muito longo (máximo 100 caracteres)",
          );
        }
      }

      if (options.directory) {
        if (
          typeof options.directory !== "string" ||
          options.directory.length === 0
        ) {
          throw new Error("Diretório deve ser uma string não vazia");
        }

        if (!/^[a-zA-Z0-9_.\/-]+$/.test(options.directory)) {
          throw new Error("Diretório contém caracteres inválidos");
        }

        if (options.directory.includes("..")) {
          throw new Error(
            "Diretório não pode conter navegação de diretório (..)",
          );
        }
      }

      // Validar tipos booleanos
      if (
        options.includeData !== undefined &&
        typeof options.includeData !== "boolean"
      ) {
        throw new Error("includeData deve ser um valor booleano");
      }

      if (
        options.includeSchema !== undefined &&
        typeof options.includeSchema !== "boolean"
      ) {
        throw new Error("includeSchema deve ser um valor booleano");
      }

      if (
        options.compress !== undefined &&
        typeof options.compress !== "boolean"
      ) {
        throw new Error("compress deve ser um valor booleano");
      }

      // Validar que pelo menos um tipo de conteúdo seja incluído
      if (options.includeData === false && options.includeSchema === false) {
        throw new Error(
          "Pelo menos um de includeData ou includeSchema deve ser true",
        );
      }

      // Gerar ID do backup antes de iniciar
      const backupId = crypto.randomUUID();

      // Configurar callback de progresso
      setProgressCallback((id, progress, message, status) => {
        updateBackupProgress(backupId, progress, message, status);
      });

      // Retornar ID imediatamente para o cliente
      const response = {
        success: true,
        id: backupId,
        message: "Backup iniciado com sucesso",
        status: "in_progress",
      };

      // Iniciar backup em background
      BackupService.createBackup({
        ...options,
        createdBy: context.user.id,
        createdByEmail: context.user.email,
        backupId, // Passar o ID gerado
      })
        .then((result) => {
          if (result.success) {
            updateBackupProgress(
              backupId,
              100,
              "Backup concluído com sucesso!",
              "completed",
            );
          } else {
            updateBackupProgress(
              backupId,
              0,
              result.error || "Falha no backup",
              "failed",
            );
          }
        })
        .catch((error) => {
          updateBackupProgress(
            backupId,
            0,
            error.message || "Erro inesperado",
            "failed",
          );
        });

      return response;
    } catch (error) {
      console.error("[BACKUP_CREATE_ERROR]", {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
        userId: context.user.id,
        timestamp: new Date().toISOString(),
        requestBody: body,
      });

      throw error;
    }
  });
}
