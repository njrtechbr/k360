"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  History,
  Download,
  Eye,
  User,
  Star,
  Filter,
  Clock,
  Award,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";

// Tipos baseados no serviço
interface XpGrantWithRelations {
  id: string;
  attendantId: string;
  typeId: string;
  points: number;
  justification?: string;
  grantedBy: string;
  grantedAt: string;
  xpEventId: string;
  attendant: {
    id: string;
    name: string;
    email: string;
  };
  type: {
    id: string;
    name: string;
    description: string;
    points: number;
    category: string;
    icon: string;
    color: string;
  };
  granter: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface GrantHistoryResponse {
  success: boolean;
  data: {
    grants: XpGrantWithRelations[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface GrantStatistics {
  success: boolean;
  data: {
    period: {
      value: string;
      days: number;
      label: string;
    };
    overview: {
      totalGrants: number;
      totalPoints: number;
      averagePoints: number;
      dailyAverageGrants: number;
      dailyAveragePoints: number;
    };
    grantsByType: Array<{
      typeId: string;
      typeName: string;
      count: number;
      totalPoints: number;
      averagePoints: number;
      percentage: number;
    }>;
    grantsByGranter: Array<{
      granterId: string;
      granterName: string;
      count: number;
      totalPoints: number;
      averagePoints: number;
      percentage: number;
    }>;
    trends: {
      mostUsedType: string | null;
      mostActiveGranter: string | null;
      averageGrantsPerGranter: number;
    };
  };
}

interface XpGrantHistoryProps {
  attendantId?: string; // Se fornecido, mostra apenas concessões deste atendente
  showFilters?: boolean;
  showStatistics?: boolean;
}

export function XpGrantHistory({
  attendantId,
  showFilters = true,
  showStatistics = true,
}: XpGrantHistoryProps) {
  const [grants, setGrants] = useState<XpGrantWithRelations[]>([]);
  const [statistics, setStatistics] = useState<GrantStatistics["data"] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedGrant, setSelectedGrant] =
    useState<XpGrantWithRelations | null>(null);

  // Estados dos filtros
  const [filters, setFilters] = useState({
    attendantId: attendantId || "",
    typeId: "",
    granterId: "",
    startDate: "",
    endDate: "",
    minPoints: "",
    maxPoints: "",
    page: 1,
    limit: 20,
    sortBy: "grantedAt" as const,
    sortOrder: "desc" as const,
  });

  // Paginação
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0,
  });

  useEffect(() => {
    fetchGrants();
    if (showStatistics) {
      fetchStatistics();
    }
  }, [filters, attendantId]);

  const fetchGrants = async () => {
    try {
      setIsLoading(true);

      // Construir query params
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(
        `/api/gamification/xp-grants?${params.toString()}`,
      );

      if (response.ok) {
        const result: GrantHistoryResponse = await response.json();
        if (result.success) {
          setGrants(result.data.grants);
          setPagination({
            total: result.data.pagination.total,
            page: result.data.pagination.page,
            totalPages: result.data.pagination.totalPages,
          });
        } else {
          throw new Error("Resposta da API indica falha");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Erro",
          description:
            errorData.error || "Erro ao carregar histórico de concessões",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar concessões:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de concessões",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(
        "/api/gamification/xp-grants/statistics?period=30d",
      );

      if (response.ok) {
        const result: GrantStatistics = await response.json();
        if (result.success) {
          setStatistics(result.data);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // Buscar todos os dados para exportação (sem paginação)
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (
          value !== "" &&
          value !== null &&
          value !== undefined &&
          key !== "page" &&
          key !== "limit"
        ) {
          params.append(key, value.toString());
        }
      });
      params.append("limit", "10000"); // Limite alto para exportação

      const response = await fetch(
        `/api/gamification/xp-grants?${params.toString()}`,
      );

      if (response.ok) {
        const result: GrantHistoryResponse = await response.json();

        if (!result.success) {
          throw new Error("Falha ao obter dados para exportação");
        }

        // Converter para CSV
        const csvContent = convertToCSV(result.data.grants);

        // Gerar nome do arquivo baseado nos filtros
        let fileName = "historico-xp-avulso";

        if (attendantId) {
          fileName += "-atendente";
        }

        if (filters.startDate && filters.endDate) {
          fileName += `-${filters.startDate}-a-${filters.endDate}`;
        } else if (filters.startDate) {
          fileName += `-desde-${filters.startDate}`;
        } else if (filters.endDate) {
          fileName += `-ate-${filters.endDate}`;
        }

        fileName += `-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;

        // Download do arquivo
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Sucesso",
          description: "Relatório exportado com sucesso",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao exportar relatório",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCSV = (data: XpGrantWithRelations[]): string => {
    const headers = [
      "ID da Concessão",
      "Data",
      "Hora",
      "Atendente",
      "Email do Atendente",
      "ID do Atendente",
      "Tipo de XP",
      "Descrição do Tipo",
      "Pontos",
      "Categoria",
      "Justificativa",
      "Concedido por",
      "Email do Responsável",
      "Role do Responsável",
      "ID do Evento XP",
    ];

    const rows = data.map((grant) => [
      grant.id,
      format(new Date(grant.grantedAt), "dd/MM/yyyy", { locale: ptBR }),
      format(new Date(grant.grantedAt), "HH:mm", { locale: ptBR }),
      grant.attendant.name,
      grant.attendant.email,
      grant.attendant.id,
      grant.type.name,
      grant.type.description,
      grant.points.toString(),
      grant.type.category,
      grant.justification || "Sem justificativa",
      grant.granter.name,
      grant.granter.email,
      grant.granter.role,
      grant.xpEventId,
    ]);

    // Adicionar BOM para UTF-8 para melhor compatibilidade com Excel
    const BOM = "\uFEFF";
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((field) => `"${field.toString().replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    return BOM + csvContent;
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      star: Star,
      award: Award,
      target: TrendingUp,
      zap: Star,
      heart: Star,
      trophy: Award,
    };
    return iconMap[iconName] || Star;
  };

  // Definição das colunas da DataTable
  const columns: ColumnDef<XpGrantWithRelations>[] = [
    {
      accessorKey: "grantedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Data
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">
              {format(new Date(row.original.grantedAt), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(row.original.grantedAt), "HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.grantedAt);
        const dateB = new Date(rowB.original.grantedAt);
        return dateA.getTime() - dateB.getTime();
      },
    },
    {
      accessorKey: "attendant.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Atendente
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[180px]">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">
              {row.original.attendant.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {row.original.attendant.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Tipo de XP
        </Button>
      ),
      cell: ({ row }) => {
        const grant = row.original;
        const IconComponent = getIconComponent(grant.type.icon);
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{
                backgroundColor: `${grant.type.color}20`,
                color: grant.type.color,
              }}
            >
              <IconComponent size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{grant.type.name}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {grant.type.category}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "points",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Pontos
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary" className="font-mono">
            +{row.original.points} XP
          </Badge>
        </div>
      ),
      sortingFn: (rowA, rowB) => rowA.original.points - rowB.original.points,
    },
    {
      accessorKey: "granter.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Concedido por
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-sm truncate">
            {row.original.granter.name}
          </p>
          <Badge variant="outline" className="text-xs mt-1">
            {row.original.granter.role}
          </Badge>
        </div>
      ),
    },
    {
      id: "justification",
      header: "Justificativa",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          {row.original.justification ? (
            <p
              className="text-sm text-muted-foreground truncate"
              title={row.original.justification}
            >
              {row.original.justification}
            </p>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Sem justificativa
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedGrant(row.original)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Concessão de XP</DialogTitle>
              <DialogDescription>
                Informações completas sobre esta concessão de XP avulso
              </DialogDescription>
            </DialogHeader>
            {selectedGrant && <GrantDetailView grant={selectedGrant} />}
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {showStatistics && statistics && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Estatísticas - {statistics.period.label}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <History size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total de Concessões
                    </p>
                    <p className="text-2xl font-bold">
                      {statistics.overview.totalGrants}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statistics.overview.dailyAverageGrants.toFixed(1)}/dia
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 text-green-600">
                    <Star size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total de Pontos
                    </p>
                    <p className="text-2xl font-bold">
                      {statistics.overview.totalPoints.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statistics.overview.dailyAveragePoints}/dia
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Média de Pontos
                    </p>
                    <p className="text-2xl font-bold">
                      {statistics.overview.averagePoints}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      por concessão
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tipos Utilizados
                    </p>
                    <p className="text-2xl font-bold">
                      {statistics.grantsByType.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statistics.trends.mostUsedType &&
                        `Mais usado: ${statistics.trends.mostUsedType}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas detalhadas */}
          {statistics.grantsByType.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Tipos de XP</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics.grantsByType.slice(0, 5).map((type) => (
                      <div
                        key={type.typeId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{type.typeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {type.count} concessões • {type.percentage}%
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {type.totalPoints} XP
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Top Administradores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics.grantsByGranter.slice(0, 5).map((granter) => (
                      <div
                        key={granter.granterId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {granter.granterName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {granter.count} concessões • {granter.percentage}%
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {granter.totalPoints} XP
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="minPoints">Pontos Mínimos</Label>
                <Input
                  id="minPoints"
                  type="number"
                  placeholder="Ex: 10"
                  min="0"
                  value={filters.minPoints}
                  onChange={(e) =>
                    handleFilterChange("minPoints", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="maxPoints">Pontos Máximos</Label>
                <Input
                  id="maxPoints"
                  type="number"
                  placeholder="Ex: 100"
                  min="0"
                  value={filters.maxPoints}
                  onChange={(e) =>
                    handleFilterChange("maxPoints", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="sortBy">Ordenar por</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange("sortBy", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grantedAt">Data</SelectItem>
                    <SelectItem value="points">Pontos</SelectItem>
                    <SelectItem value="attendantName">Atendente</SelectItem>
                    <SelectItem value="typeName">Tipo</SelectItem>
                    <SelectItem value="granterName">Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sortOrder">Ordem</Label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value) =>
                    handleFilterChange("sortOrder", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Decrescente</SelectItem>
                    <SelectItem value="asc">Crescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="limit">Itens por página</Label>
                <Select
                  value={filters.limit.toString()}
                  onValueChange={(value) => handleFilterChange("limit", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      attendantId: attendantId || "",
                      typeId: "",
                      granterId: "",
                      startDate: "",
                      endDate: "",
                      minPoints: "",
                      maxPoints: "",
                      page: 1,
                      limit: 20,
                      sortBy: "grantedAt",
                      sortOrder: "desc",
                    });
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cabeçalho com botão de exportar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Histórico de XP Avulso</h2>
          <p className="text-muted-foreground">
            {attendantId
              ? "Concessões de XP avulso para este atendente"
              : "Todas as concessões de XP avulso realizadas no sistema"}
          </p>
          {pagination.total > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pagination.total} concessão{pagination.total !== 1 ? "ões" : ""}{" "}
              encontrada{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            disabled={isExporting || grants.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      {/* DataTable */}
      <Card>
        <CardContent className="p-6">
          {isLoading && grants.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">
                  Carregando histórico de concessões...
                </p>
              </div>
            </div>
          ) : grants.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <History className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">
                    Nenhuma concessão encontrada
                  </p>
                  <p className="text-muted-foreground">
                    {attendantId
                      ? "Este atendente ainda não recebeu XP avulso"
                      : "Nenhuma concessão de XP avulso foi realizada com os filtros aplicados"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={grants}
              searchKey="attendant.name"
              searchPlaceholder="Buscar por atendente..."
              isLoading={isLoading}
            />
          )}

          {/* Paginação customizada */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(pagination.page - 1) * filters.limit + 1} a{" "}
                {Math.min(pagination.page * filters.limit, pagination.total)} de{" "}
                {pagination.total} concessões
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoading}
                >
                  Anterior
                </Button>
                <span className="text-sm px-3 py-1 bg-muted rounded">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={
                    pagination.page >= pagination.totalPages || isLoading
                  }
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para exibir detalhes de uma concessão
function GrantDetailView({ grant }: { grant: XpGrantWithRelations }) {
  const IconComponent = getIconComponent(grant.type.icon);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div
          className="p-3 rounded-lg"
          style={{
            backgroundColor: `${grant.type.color}20`,
            color: grant.type.color,
          }}
        >
          <IconComponent size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{grant.type.name}</h3>
          <p className="text-muted-foreground">{grant.type.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {grant.type.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ID: {grant.id}
            </span>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="text-lg font-mono mb-2">
            +{grant.points} XP
          </Badge>
          <p className="text-xs text-muted-foreground">
            {format(new Date(grant.grantedAt), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Informações principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Atendente Beneficiado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{grant.attendant.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{grant.attendant.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID do Atendente</p>
              <p className="font-mono text-sm">{grant.attendant.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Responsável pela Concessão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{grant.granter.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{grant.granter.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Função</p>
              <Badge variant="outline">{grant.granter.role}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes da concessão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Detalhes da Concessão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data e Hora</p>
              <p className="font-medium">
                {format(new Date(grant.grantedAt), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID do Evento XP</p>
              <p className="font-mono text-sm">{grant.xpEventId}</p>
            </div>
          </div>

          {grant.justification && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Justificativa
              </p>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm leading-relaxed">{grant.justification}</p>
              </div>
            </div>
          )}

          {!grant.justification && (
            <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-muted">
              <p className="text-sm text-muted-foreground italic">
                Nenhuma justificativa foi fornecida para esta concessão.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getIconComponent(iconName: string) {
  const iconMap: Record<string, any> = {
    star: Star,
    award: Award,
    target: TrendingUp,
    zap: Star,
    heart: Star,
    trophy: Award,
  };
  return iconMap[iconName] || Star;
}
