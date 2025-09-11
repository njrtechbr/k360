"use client";

import { useApi } from "@/providers/ApiProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Check, Hourglass, Loader, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import {
  validateImportStatus,
  DEFAULT_IMPORT_STATUS,
} from "@/lib/data-validation";
import React from "react";

export default function ImportProgressModal() {
  const { importStatus, setImportStatus } = useApi();

  // Validação segura do importStatus
  const validationResult = validateImportStatus(importStatus);
  const safeImportStatus = validationResult.data;

  // Log de erros de validação para debugging
  React.useEffect(() => {
    if (!validationResult.isValid && validationResult.errors.length > 0) {
      console.warn(
        "ImportProgressModal: ImportStatus inválido detectado:",
        validationResult.errors,
      );
    }
  }, [validationResult.isValid, validationResult.errors]);

  const Icon = React.useMemo(() => {
    // Verificação adicional de segurança para status
    const status = safeImportStatus?.status || "idle";

    switch (status) {
      case "processing":
        return <Loader className="h-6 w-6 animate-spin text-blue-500" />;
      case "done":
        return <Check className="h-6 w-6 text-green-500" />;
      case "error":
        return <X className="h-6 w-6 text-destructive" />;
      default:
        return <Hourglass className="h-6 w-6 text-muted-foreground" />;
    }
  }, [safeImportStatus?.status]);

  // Fallback para quando importStatus é inválido
  if (!safeImportStatus) {
    console.error("ImportProgressModal: ImportStatus é null após validação");
    return null;
  }

  // Verificações de segurança para propriedades
  const isOpen = safeImportStatus.isOpen ?? false;
  const status = safeImportStatus.status ?? "idle";
  const title = safeImportStatus.title ?? "Processando...";
  const progress = safeImportStatus.progress ?? 0;
  const logs = Array.isArray(safeImportStatus.logs)
    ? safeImportStatus.logs
    : [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        // Prevent closing the modal while processing
        if (status !== "processing") {
          // Verificação adicional antes de chamar setImportStatus
          if (setImportStatus && typeof setImportStatus === "function") {
            setImportStatus((prev: any) => {
              // Validar prev antes de usar
              const validPrev = validateImportStatus(prev);
              return {
                ...(validPrev.data || DEFAULT_IMPORT_STATUS),
                isOpen,
              };
            });
          }
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (status === "processing") {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {Icon}
            {title}
          </DialogTitle>
          <DialogDescription>
            {status === "processing" &&
              "Por favor, aguarde a conclusão do processo. Não feche esta aba."}
            {status === "done" && "O processo foi concluído com sucesso."}
            {status === "error" && "Ocorreu um erro durante o processo."}
            {status === "idle" && "Aguardando início do processo."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Progress
            value={Math.max(0, Math.min(100, progress))}
            className="w-full"
          />
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <div className="flex flex-col gap-2">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <p
                    key={index}
                    className="text-sm text-muted-foreground animate-in fade-in-0"
                  >
                    &raquo; {typeof log === "string" ? log : "Log inválido"}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum log disponível
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
