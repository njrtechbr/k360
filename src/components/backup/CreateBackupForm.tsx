"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Database, Download, Settings, Info, Loader2 } from "lucide-react";
import type { BackupOptions } from "@/hooks/useBackupManager";

const backupFormSchema = z.object({
  filename: z.string().optional(),
  includeData: z.boolean().default(true),
  includeSchema: z.boolean().default(true),
  compress: z.boolean().default(true),
});

type BackupFormData = z.infer<typeof backupFormSchema>;

interface CreateBackupFormProps {
  onBackupCreated: () => void;
  isCreating: boolean;
  onCreateBackup: (options?: BackupOptions) => Promise<any>;
}

export function CreateBackupForm({
  onBackupCreated,
  isCreating,
  onCreateBackup,
}: CreateBackupFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<BackupFormData>({
    resolver: zodResolver(backupFormSchema),
    defaultValues: {
      filename: "",
      includeData: true,
      includeSchema: true,
      compress: true,
    },
  });

  const onSubmit = async (data: BackupFormData) => {
    try {
      const options: BackupOptions = {
        filename: data.filename || undefined,
        includeData: data.includeData,
        includeSchema: data.includeSchema,
        compress: data.compress,
      };

      await onCreateBackup(options);
      onBackupCreated();

      // Reset form after successful backup
      form.reset();
    } catch (error) {
      // Error handling is done in the hook
      console.error("Erro no formulário de backup:", error);
    }
  };

  const watchedValues = form.watch();
  const estimatedSize = calculateEstimatedSize(watchedValues);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Criar Novo Backup
          </CardTitle>
          <CardDescription>
            Configure as opções do backup do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Nome do arquivo (opcional) */}
              <FormField
                control={form.control}
                name="filename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Arquivo (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="backup_personalizado"
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormDescription>
                      Se não especificado, será gerado automaticamente com
                      timestamp
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Opções básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Conteúdo do Backup</h3>

                <FormField
                  control={form.control}
                  name="includeSchema"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Incluir Estrutura (Schema)</FormLabel>
                        <FormDescription>
                          Inclui definições de tabelas, índices e constraints
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="includeData"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Incluir Dados</FormLabel>
                        <FormDescription>
                          Inclui todos os dados das tabelas (INSERT statements)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compress"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Comprimir Arquivo</FormLabel>
                        <FormDescription>
                          Reduz o tamanho do arquivo usando compressão gzip
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Configurações avançadas */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2"
                  disabled={isCreating}
                >
                  <Settings className="h-4 w-4" />
                  {showAdvanced ? "Ocultar" : "Mostrar"} Configurações Avançadas
                </Button>

                {showAdvanced && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Configurações Avançadas:</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• Diretório de destino: /app/backups</li>
                        <li>• Timeout: 3600 segundos</li>
                        <li>• Formato: PostgreSQL SQL dump</li>
                        <li>• Validação: Checksum SHA-256</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Informações do backup */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Tamanho Estimado:</strong>
                      <p className="text-muted-foreground">{estimatedSize}</p>
                    </div>
                    <div>
                      <strong>Tempo Estimado:</strong>
                      <p className="text-muted-foreground">2-5 minutos</p>
                    </div>
                    <div>
                      <strong>Formato:</strong>
                      <p className="text-muted-foreground">
                        {watchedValues.compress ? "SQL.gz" : "SQL"}
                      </p>
                    </div>
                    <div>
                      <strong>Validação:</strong>
                      <p className="text-muted-foreground">
                        Checksum automático
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validação */}
              {!watchedValues.includeData && !watchedValues.includeSchema && (
                <Alert>
                  <AlertDescription>
                    Atenção: Você deve incluir pelo menos a estrutura ou os
                    dados no backup.
                  </AlertDescription>
                </Alert>
              )}

              {/* Botão de submit */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isCreating}
                >
                  Limpar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isCreating ||
                    (!watchedValues.includeData && !watchedValues.includeSchema)
                  }
                  className="flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando Backup...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Criar Backup
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Função auxiliar para calcular tamanho estimado
function calculateEstimatedSize(options: BackupFormData): string {
  let baseSize = 0;

  if (options.includeSchema) {
    baseSize += 2; // ~2MB para estrutura
  }

  if (options.includeData) {
    baseSize += 50; // ~50MB para dados (estimativa)
  }

  if (options.compress && baseSize > 0) {
    baseSize = baseSize * 0.3; // Compressão reduz ~70%
  }

  if (baseSize === 0) {
    return "0 MB";
  }

  if (baseSize < 1) {
    return `${Math.round(baseSize * 1024)} KB`;
  }

  return `${Math.round(baseSize)} MB`;
}
