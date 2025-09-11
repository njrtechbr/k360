"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/providers/ApiProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
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
import { FileUp, Check, Wand2, AlertTriangle, CheckCircle } from "lucide-react";
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
import { format } from "date-fns";
import ImportProgressModal from "@/components/ImportProgressModal";

type CsvRow = {
  id: string;
  attendantId: string;
  rating: string;
  comment: string;
  date: string;
};

type MappedReview = {
  id: string;
  attendantId: string;
  attendantName?: string;
  isValid: boolean;
  rating: number;
  comment: string;
  date: string;
};

export default function ImportarLegadoPage() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const { attendants, evaluations, importEvaluations } = useApi();
  const router = useRouter();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [mappedReviews, setMappedReviews] = useState<MappedReview[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const attendantMap = useMemo(
    () =>
      new Map(
        Array.isArray(attendants.data)
          ? attendants.data.map((a) => [a.id, a.name])
          : [],
      ),
    [attendants.data],
  );
  const evaluationMap = useMemo(
    () =>
      new Set(
        Array.isArray(evaluations.data)
          ? evaluations.data.map((e) => e.id)
          : [],
      ),
    [evaluations.data],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMappedReviews([]);
    }
  };

  const handleParseFile = () => {
    if (!file) return;
    setIsParsing(true);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data
          .map((row) => {
            const attendantExists = attendantMap.has(row.attendantId);
            const evaluationExists = evaluationMap.has(row.id);
            return {
              id: row.id,
              attendantId: row.attendantId,
              attendantName: attendantMap.get(row.attendantId),
              isValid: attendantExists && !evaluationExists,
              rating: parseInt(row.rating, 10),
              comment: row.comment || "(Sem comentário)",
              date: new Date(row.date).toISOString(),
            };
          })
          .filter((r) => r.id && r.attendantId && !isNaN(r.rating) && r.date);
        setMappedReviews(mapped);
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

  const handleImport = useCallback(async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: "Usuário não encontrado.",
      });
      return;
    }

    const validReviews = mappedReviews.filter((r) => r.isValid);
    if (validReviews.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhuma avaliação válida",
        description:
          "Nenhuma avaliação a ser importada. Verifique os IDs dos atendentes no arquivo.",
      });
      return;
    }

    const newEvaluationsData = validReviews.map((review) => ({
      id: review.id,
      attendantId: review.attendantId,
      nota: review.rating,
      comentario: review.comment,
      data: review.date,
    }));

    try {
      await importEvaluations.mutate({
        evaluations: newEvaluationsData,
        fileName: file?.name || "Arquivo Desconhecido",
      });
      setFile(null);
      setMappedReviews([]);
    } catch (error) {
      console.error("Erro durante a importação legada:", error);
      // Toast handled in provider
    }
  }, [user, toast, mappedReviews, file?.name, importEvaluations]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
    } catch {
      return "Data inválida";
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  const validCount = mappedReviews.filter((r) => r.isValid).length;
  const invalidCount = mappedReviews.length - validCount;

  return (
    <div className="space-y-8">
      <ImportProgressModal />
      <h1 className="text-3xl font-bold">
        Importar Avaliações (Sistema Antigo)
      </h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp /> 1. Upload do Arquivo CSV
          </CardTitle>
          <CardDescription>
            Selecione o arquivo CSV exportado do sistema antigo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
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
            className="self-end"
          >
            {isParsing ? "Processando..." : "Ler Arquivo"}
          </Button>
        </CardContent>
      </Card>

      {mappedReviews.length > 0 && (
        <Card className="shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check /> 2. Confirmar e Importar
            </CardTitle>
            <CardDescription>
              Revise os dados que serão importados. Avaliações com 'attendantId'
              inválido ou avaliações já existentes serão ignoradas.
            </CardDescription>
            <div className="flex gap-4 pt-2">
              <Badge variant="secondary" className="text-base">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                {validCount} Válidas
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-base">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {invalidCount} Inválidas
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedReviews.map((review) => (
                    <TableRow
                      key={review.id}
                      className={
                        !review.isValid ? "bg-red-50 dark:bg-red-950/50" : ""
                      }
                    >
                      <TableCell>
                        {review.isValid ? (
                          <Badge variant="outline">
                            {review.attendantName}
                          </Badge>
                        ) : (
                          <div className="flex flex-col">
                            <Badge variant="destructive">
                              Inválido/Duplicado
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {review.attendantId}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-sm truncate">
                        {review.comment}
                      </TableCell>
                      <TableCell>{formatDate(review.date)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {review.rating}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || importEvaluations.loading}
              size="lg"
              className="w-full"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {importEvaluations.loading
                ? `Importando...`
                : `Importar ${validCount} Avaliações Válidas`}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
