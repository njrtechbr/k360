"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Filter,
  Calendar,
  Star,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Evaluation, Attendant } from "@/lib/types";

export interface EvaluationsListProps {
  evaluations: Evaluation[];
  attendants: Attendant[];
  loading?: boolean;
  onEdit?: (evaluation: Evaluation) => void;
  onDelete?: (evaluation: Evaluation) => void;
  onView?: (evaluation: Evaluation) => void;
  showActions?: boolean;
  showFilters?: boolean;
  pageSize?: number;
  className?: string;
}

export default function EvaluationsList({
  evaluations,
  attendants,
  loading = false,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  showFilters = true,
  pageSize = 10,
  className,
}: EvaluationsListProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [ratingFilter, setRatingFilter] = React.useState<string>("all");
  const [attendantFilter, setAttendantFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Criar mapa de atendentes para lookup rápido
  const attendantMap = React.useMemo(() => {
    if (!attendants || !Array.isArray(attendants)) {
      return {} as Record<string, Attendant>;
    }
    return attendants.reduce(
      (acc, attendant) => {
        acc[attendant.id] = attendant;
        return acc;
      },
      {} as Record<string, Attendant>,
    );
  }, [attendants]);

  // Filtrar avaliações
  const filteredEvaluations = React.useMemo(() => {
    return evaluations.filter((evaluation) => {
      const attendant = attendantMap[evaluation.attendantId];
      const attendantName = attendant?.name || "Atendente não encontrado";

      // Filtro de busca
      const matchesSearch =
        searchTerm === "" ||
        attendantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.comentario?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de nota
      const matchesRating =
        ratingFilter === "all" ||
        (evaluation.nota || evaluation.rating).toString() === ratingFilter;

      // Filtro de atendente
      const matchesAttendant =
        attendantFilter === "all" || evaluation.attendantId === attendantFilter;

      return matchesSearch && matchesRating && matchesAttendant;
    });
  }, [evaluations, attendantMap, searchTerm, ratingFilter, attendantFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredEvaluations.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvaluations = filteredEvaluations.slice(
    startIndex,
    startIndex + pageSize,
  );

  // Reset página quando filtros mudam
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ratingFilter, attendantFilter]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Carregando avaliações...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Avaliações ({filteredEvaluations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por atendente ou comentário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por nota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as notas</SelectItem>
                <SelectItem value="5">5 estrelas</SelectItem>
                <SelectItem value="4">4 estrelas</SelectItem>
                <SelectItem value="3">3 estrelas</SelectItem>
                <SelectItem value="2">2 estrelas</SelectItem>
                <SelectItem value="1">1 estrela</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attendantFilter} onValueChange={setAttendantFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por atendente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os atendentes</SelectItem>
                {attendants &&
                  attendants.map((attendant) => (
                    <SelectItem key={attendant.id} value={attendant.id}>
                      {attendant.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atendente</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Data</TableHead>
                {showActions && (
                  <TableHead className="w-[100px]">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvaluations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={showActions ? 5 : 4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhuma avaliação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvaluations.map((evaluation) => {
                  const attendant = attendantMap[evaluation.attendantId];
                  return (
                    <TableRow key={evaluation.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={attendant?.avatarUrl} />
                            <AvatarFallback>
                              {attendant?.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {attendant?.name || "Atendente não encontrado"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {attendant?.funcao}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-4 w-4",
                                  i <
                                    (evaluation.nota || evaluation.rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300",
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {evaluation.nota || evaluation.rating || 0}/5
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          {evaluation.comentario ? (
                            <div className="space-y-1">
                              <p className="text-sm line-clamp-2">
                                {evaluation.comentario}
                              </p>
                              {evaluation.sentimentAnalysis && (
                                <Badge
                                  variant={
                                    evaluation.sentimentAnalysis.sentiment ===
                                    "Positivo"
                                      ? "default"
                                      : evaluation.sentimentAnalysis
                                            .sentiment === "Negativo"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {evaluation.sentimentAnalysis.sentiment}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Sem comentário
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(
                            new Date(evaluation.createdAt || evaluation.data),
                            "dd/MM/yyyy",
                            { locale: ptBR },
                          )}
                          <div className="text-xs text-muted-foreground">
                            {format(
                              new Date(evaluation.createdAt || evaluation.data),
                              "HH:mm",
                              { locale: ptBR },
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {showActions && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {onView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(evaluation)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(evaluation)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(evaluation)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a{" "}
              {Math.min(startIndex + pageSize, filteredEvaluations.length)} de{" "}
              {filteredEvaluations.length} avaliações
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
