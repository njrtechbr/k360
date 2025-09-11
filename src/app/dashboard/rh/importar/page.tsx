"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/providers/ApiProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import { FileUp, Check, Wand2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANT_STATUS, type Attendant } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import ImportProgressModal from "@/components/ImportProgressModal";
import {
  DataValidator,
  LoadingCard,
  ErrorTable,
} from "@/components/ui/data-validator";
import {
  validateAttendantArray,
  safeMapArray,
  isValidAttendant,
  EMPTY_ATTENDANT_ARRAY,
} from "@/lib/data-validation";
import { useSafeState, validators } from "@/hooks/useSafeState";

type CsvRow = {
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string;
  telefone: string;
  portaria: string;
  situacao: string;
  dataAdmissao: string;
  dataNascimento: string;
  rg: string;
  cpf: string;
};

type ImportConfig = {
  csvRow: CsvRow;
  isSelected: boolean;
  setor: string | null;
  funcao: string | null;
  isDuplicate: boolean;
};

export default function ImportarAtendentesPage() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const { attendants, funcoes, setores, importAttendants, isAnyLoading } =
    useApi();
  const router = useRouter();
  const { toast } = useToast();

  // Estados seguros para dados da página
  const attendantsState = useSafeState({
    initialValue: EMPTY_ATTENDANT_ARRAY,
    validator: validators.isArray,
    fallback: EMPTY_ATTENDANT_ARRAY,
    enableWarnings: true,
  });

  const funcoesState = useSafeState({
    initialValue: [] as string[],
    validator: validators.isArray,
    fallback: [] as string[],
    enableWarnings: true,
  });

  const setoresState = useSafeState({
    initialValue: [] as string[],
    validator: validators.isArray,
    fallback: [] as string[],
    enableWarnings: true,
  });

  const [file, setFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Atualizar estados seguros quando dados do useApi mudarem
  useEffect(() => {
    attendantsState.setData(attendants.data);
  }, [attendants.data]);

  useEffect(() => {
    funcoesState.setData(funcoes.data);
  }, [funcoes.data]);

  useEffect(() => {
    setoresState.setData(setores.data);
  }, [setores.data]);

  // Memoização segura dos dados existentes
  const existingEmails = useMemo(() => {
    return safeMapArray(
      attendantsState.data,
      (attendant: Attendant) => attendant.email?.toLowerCase() || "",
      isValidAttendant,
    ).reduce((set, email) => {
      if (email) set.add(email);
      return set;
    }, new Set<string>());
  }, [attendantsState.data]);

  const existingCpfs = useMemo(() => {
    return safeMapArray(
      attendantsState.data,
      (attendant: Attendant) => attendant.cpf || "",
      isValidAttendant,
    ).reduce((set, cpf) => {
      if (cpf) set.add(cpf);
      return set;
    }, new Set<string>());
  }, [attendantsState.data]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportConfig([]);
    }
  };

  const handleParseFile = () => {
    if (!file) return;
    setIsParsing(true);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validData = results.data.filter(
          (row) => row.name && row.email && row.cpf,
        );
        const config: ImportConfig[] = validData.map((row) => {
          const isDuplicate =
            existingEmails.has(row.email?.toLowerCase() || "") ||
            existingCpfs.has(row.cpf || "");

          // Busca segura por função pré-selecionada
          const preSelectedFuncao = safeMapArray(
            funcoesState.data,
            (f: string) => f,
            (item): item is string => typeof item === "string",
          ).find((f) => f.toLowerCase() === row.role?.toLowerCase());

          return {
            csvRow: row,
            isSelected: !isDuplicate, // Pre-select if not a duplicate
            setor: null,
            funcao: preSelectedFuncao || null,
            isDuplicate,
          };
        });
        setImportConfig(config);
        setIsParsing(false);
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        toast({
          variant: "destructive",
          title: "Erro ao ler o arquivo",
          description: "Verifique o formato do CSV.",
        });
        setIsParsing(false);
      },
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setImportConfig((prev) =>
      prev.map((config) =>
        config.isDuplicate ? config : { ...config, isSelected: checked },
      ),
    );
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    setImportConfig((prev) => {
      const newConfig = [...prev];
      if (!newConfig[index].isDuplicate) {
        newConfig[index].isSelected = checked;
      }
      return newConfig;
    });
  };

  const handleConfigChange = (
    index: number,
    type: "setor" | "funcao",
    value: string,
  ) => {
    setImportConfig((prev) => {
      const newConfig = [...prev];
      if (type === "setor") newConfig[index].setor = value;
      if (type === "funcao") newConfig[index].funcao = value;
      return newConfig;
    });
  };

  const attendantsToImport = useMemo(() => {
    return importConfig.filter(
      (config) => config.isSelected && !config.isDuplicate,
    );
  }, [importConfig]);

  const handleImport = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado.",
      });
      return;
    }

    let importedCount = 0;

    const newAttendantsData = attendantsToImport.map((config) => {
      const { csvRow, setor, funcao } = config;
      importedCount++;
      return {
        // Remove the id field - let Prisma auto-generate it
        name: csvRow.name || "Nome não informado",
        email: csvRow.email || `sem-email-${importedCount}@invalido.com`,
        funcao: funcao || "Sem Função",
        setor: setor || "Sem Setor",
        status:
          csvRow.status?.toLowerCase() === "ativo"
            ? ATTENDANT_STATUS.ACTIVE
            : ATTENDANT_STATUS.INACTIVE,
        avatarUrl: csvRow.avatarUrl || "",
        telefone: csvRow.telefone || "00000000000",
        portaria: csvRow.portaria || "N/A",
        situacao: csvRow.situacao || "N/A",
        dataAdmissao: csvRow.dataAdmissao
          ? new Date(csvRow.dataAdmissao).toISOString()
          : new Date().toISOString(),
        dataNascimento: csvRow.dataNascimento
          ? new Date(csvRow.dataNascimento).toISOString()
          : new Date().toISOString(),
        rg: csvRow.rg || "000000000",
        cpf: csvRow.cpf || `00000000000${importedCount}`,
      } as Omit<Attendant, "id" | "importId">;
    });

    try {
      await importAttendants.mutate({
        attendants: newAttendantsData,
        fileName: file?.name || "Arquivo Desconhecido",
        userId: user.id,
      });
      setFile(null);
      setImportConfig([]);
    } catch (error) {
      console.error("Erro durante a importação de atendentes:", error);

      // Verificar se é erro de sessão
      if (
        error instanceof Error &&
        error.message.includes("Usuário da sessão não encontrado")
      ) {
        toast({
          variant: "destructive",
          title: "Erro de Sessão",
          description:
            "Sua sessão expirou ou está inválida. Faça logout e login novamente para continuar.",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/api/auth/signout")}
            >
              Fazer Logout
            </Button>
          ),
        });
      }
      // Toast handled in provider for other errors
    }
  };

  // Estados de loading e erro
  if (
    authLoading ||
    isAnyLoading ||
    attendantsState.loading ||
    funcoesState.loading ||
    setoresState.loading
  ) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Importar Atendentes de CSV</h1>
        <LoadingCard />
      </div>
    );
  }

  // Verificar se há erros críticos nos dados
  const hasDataErrors =
    attendantsState.error || funcoesState.error || setoresState.error;
  if (hasDataErrors) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Importar Atendentes de CSV</h1>
        <ErrorTable
          error={`Erro ao carregar dados necessários: ${attendantsState.error || funcoesState.error || setoresState.error}`}
          onRetry={() => {
            attendantsState.clearError();
            funcoesState.clearError();
            setoresState.clearError();
            window.location.reload();
          }}
        />
      </div>
    );
  }

  const hasDataToConfigure = importConfig.length > 0;
  const isReadyToImport = attendantsToImport.length > 0;
  const selectedCount = importConfig.filter(
    (c) => c.isSelected && !c.isDuplicate,
  ).length;

  return (
    <div className="space-y-8">
      <ImportProgressModal />
      <h1 className="text-3xl font-bold">Importar Atendentes de CSV</h1>

      <DataValidator
        data={attendantsState.data}
        fallback={EMPTY_ATTENDANT_ARRAY}
        loading={attendantsState.loading}
        error={attendantsState.error}
        validator={validators.isArray}
        emptyMessage="Nenhum atendente encontrado. Você pode importar novos atendentes usando o formulário abaixo."
        treatEmptyArrayAsEmpty={false} // Não mostrar estado vazio para permitir importação
      >
        {(validAttendants) => (
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp /> 1. Upload do Arquivo CSV
                </CardTitle>
                <CardDescription>
                  Selecione o arquivo CSV com os dados dos atendentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="csv-file">Arquivo CSV</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </div>
                <Button
                  onClick={handleParseFile}
                  disabled={!file || isParsing}
                  className="w-full"
                >
                  {isParsing ? "Processando..." : "Ler Arquivo"}
                </Button>
              </CardContent>
            </Card>

            {hasDataToConfigure && (
              <Card className="lg:col-span-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check /> 2. Configurar e Importar
                  </CardTitle>
                  <CardDescription>
                    Selecione os atendentes para importar e atribua a função e o
                    setor corretos para cada um. Atendentes duplicados são
                    ignorados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[60vh] overflow-y-auto mt-4 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                selectedCount > 0 &&
                                selectedCount ===
                                  importConfig.filter((c) => !c.isDuplicate)
                                    .length
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Nome (CSV)</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Setor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importConfig.map((config, index) => (
                          <TableRow
                            key={index}
                            data-state={config.isSelected && "selected"}
                            className={config.isDuplicate ? "bg-muted/50" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={config.isSelected}
                                onCheckedChange={(checked) =>
                                  handleSelectRow(index, !!checked)
                                }
                                disabled={config.isDuplicate}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">
                                {config.csvRow.name}
                              </p>
                              {config.isDuplicate && (
                                <Badge variant="destructive">Duplicado</Badge>
                              )}
                            </TableCell>
                            <TableCell>{config.csvRow.email}</TableCell>
                            <TableCell>
                              <Select
                                value={config.funcao ?? undefined}
                                onValueChange={(value) =>
                                  handleConfigChange(index, "funcao", value)
                                }
                                disabled={
                                  !config.isSelected || config.isDuplicate
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sem Função">
                                    Sem Função
                                  </SelectItem>
                                  {safeMapArray(
                                    funcoesState.data,
                                    (f: string) => (
                                      <SelectItem key={f} value={f}>
                                        {f}
                                      </SelectItem>
                                    ),
                                    (item): item is string =>
                                      typeof item === "string",
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={config.setor ?? undefined}
                                onValueChange={(value) =>
                                  handleConfigChange(index, "setor", value)
                                }
                                disabled={
                                  !config.isSelected || config.isDuplicate
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sem Setor">
                                    Sem Setor
                                  </SelectItem>
                                  {safeMapArray(
                                    setoresState.data,
                                    (s: string) => (
                                      <SelectItem
                                        key={s}
                                        value={s}
                                        className="capitalize"
                                      >
                                        {s}
                                      </SelectItem>
                                    ),
                                    (item): item is string =>
                                      typeof item === "string",
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 pt-6">
                  <Button
                    onClick={handleImport}
                    disabled={!isReadyToImport || importAttendants.loading}
                    size="lg"
                    className="w-full"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {importAttendants.loading
                      ? `Importando...`
                      : `Importar ${attendantsToImport.length} Atendentes`}
                  </Button>
                  {!isReadyToImport && selectedCount > 0 && (
                    <p className="text-sm text-center text-muted-foreground">
                      Selecione pelo menos um atendente para importar.
                    </p>
                  )}
                </CardFooter>
              </Card>
            )}
          </div>
        )}
      </DataValidator>
    </div>
  );
}
