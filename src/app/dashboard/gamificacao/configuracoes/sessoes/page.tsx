"use client";

import { useApi } from "@/providers/ApiProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLES, type GamificationSeason } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Trash2,
  CalendarIcon,
  Percent,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Pause,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  addDays,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const formSchema = z
  .object({
    name: z
      .string()
      .min(3, "O nome deve ter pelo menos 3 caracteres.")
      .max(50, "O nome deve ter no máximo 50 caracteres."),
    dateRange: z
      .object({
        from: z.date({ required_error: "A data de início é obrigatória." }),
        to: z.date({ required_error: "A data de término é obrigatória." }),
      })
      .refine(
        (data) => {
          return isAfter(data.to, data.from);
        },
        {
          message: "A data de término deve ser posterior à data de início.",
          path: ["to"],
        },
      ),
    active: z.boolean(),
    xpMultiplier: z.coerce
      .number()
      .min(0.1, "O multiplicador deve ser pelo menos 0.1")
      .max(10, "O multiplicador não pode ser maior que 10")
      .default(1),
  })
  .refine(
    (data) => {
      // Validar que o período tem pelo menos 1 dia
      const diffTime =
        data.dateRange.to.getTime() - data.dateRange.from.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 1;
    },
    {
      message: "A temporada deve ter pelo menos 1 dia de duração.",
      path: ["dateRange"],
    },
  );

export default function ConfigurarSessoesPage() {
  const { data: session, status } = useSession();
  const {
    seasons,
    addGamificationSeason,
    updateGamificationSeason,
    deleteGamificationSeason,
    isAnyLoading,
  } = useApi();
  const router = useRouter();
  const { toast } = useToast();

  const user = session?.user;
  const isAuthenticated = !!session;
  const loading = status === "loading" || isAnyLoading;

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] =
    useState<GamificationSeason | null>(null);
  const [conflictingSeason, setConflictingSeason] =
    useState<GamificationSeason | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  // Calcular estatísticas das temporadas
  const seasonStats = useMemo(() => {
    if (!seasons.data || !Array.isArray(seasons.data)) {
      return {
        total: 0,
        active: 0,
        upcoming: 0,
        past: 0,
        draft: 0,
        activeSeason: null,
      };
    }

    const now = new Date();
    const active = seasons.data.find((s) => s.active);
    const upcoming = seasons.data.filter(
      (s) => !s.active && new Date(s.startDate) > now,
    );
    const past = seasons.data.filter(
      (s) => !s.active && new Date(s.endDate) < now,
    );
    const draft = seasons.data.filter(
      (s) =>
        !s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now,
    );

    return {
      total: seasons.data.length,
      active: active ? 1 : 0,
      upcoming: upcoming.length,
      past: past.length,
      draft: draft.length,
      activeSeason: active,
    };
  }, [seasons.data]);

  // Verificar conflitos de período
  const checkPeriodConflict = (
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) => {
    if (!seasons.data || !Array.isArray(seasons.data)) {
      return null;
    }

    return seasons.data.find((season) => {
      if (excludeId && season.id === excludeId) return false;

      const seasonStart = new Date(season.startDate);
      const seasonEnd = new Date(season.endDate);

      // Verificar sobreposição de períodos
      return (
        (startDate >= seasonStart && startDate <= seasonEnd) ||
        (endDate >= seasonStart && endDate <= seasonEnd) ||
        (startDate <= seasonStart && endDate >= seasonEnd)
      );
    });
  };

  // Verificar se pode ativar temporada
  const canActivateSeason = (season: GamificationSeason) => {
    if (season.active) return false;
    if (seasonStats.activeSeason && seasonStats.activeSeason.id !== season.id)
      return false;

    const now = new Date();
    const startDate = new Date(season.startDate);
    const endDate = new Date(season.endDate);

    // Só pode ativar se estiver no período ou for futura
    return endDate >= now;
  };

  useEffect(() => {
    if (
      !loading &&
      (!isAuthenticated ||
        (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))
    ) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, user]);

  useEffect(() => {
    if (selectedSeason) {
      form.reset({
        name: selectedSeason.name,
        active: selectedSeason.active,
        xpMultiplier: selectedSeason.xpMultiplier || 1,
        dateRange: {
          from: new Date(selectedSeason.startDate),
          to: new Date(selectedSeason.endDate),
        },
      });
    } else {
      form.reset({
        name: "",
        active: true,
        xpMultiplier: 1,
        dateRange: { from: new Date(), to: addDays(new Date(), 30) },
      });
    }
  }, [selectedSeason, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Verificar conflitos de período
      const conflictSeason = checkPeriodConflict(
        values.dateRange.from,
        values.dateRange.to,
        selectedSeason?.id,
      );

      if (conflictSeason) {
        toast({
          variant: "destructive",
          title: "Conflito de período",
          description: `O período selecionado conflita com a temporada "${conflictSeason.name}".`,
        });
        return;
      }

      // Se está tentando ativar uma temporada, verificar regras
      if (values.active) {
        if (
          seasonStats.activeSeason &&
          seasonStats.activeSeason.id !== selectedSeason?.id
        ) {
          toast({
            variant: "destructive",
            title: "Temporada ativa existente",
            description: `Já existe uma temporada ativa: "${seasonStats.activeSeason.name}". Desative-a primeiro.`,
          });
          return;
        }
      }

      const seasonData = {
        name: values.name.trim(),
        active: values.active,
        xpMultiplier: values.xpMultiplier,
        startDate: values.dateRange.from.toISOString(),
        endDate: values.dateRange.to.toISOString(),
      };

      if (selectedSeason) {
        await updateGamificationSeason.mutate({
          seasonId: selectedSeason.id,
          data: seasonData,
        });
        toast({
          title: "Temporada atualizada!",
          description: `A temporada "${seasonData.name}" foi atualizada com sucesso.`,
        });
      } else {
        await addGamificationSeason.mutate(seasonData);
        toast({
          title: "Temporada criada!",
          description: `A temporada "${seasonData.name}" foi criada com sucesso.`,
        });
      }

      setIsFormDialogOpen(false);
      setSelectedSeason(null);
      form.reset();
    } catch (error) {
      console.error("Erro ao salvar temporada:", error);
    }
  }

  const handleEditClick = (season: GamificationSeason) => {
    setSelectedSeason(season);
    setIsFormDialogOpen(true);
  };

  const handleAddClick = () => {
    setSelectedSeason(null);
    form.reset({
      name: "",
      active: false,
      xpMultiplier: 1,
      dateRange: {
        from: new Date(),
        to: addDays(new Date(), 30),
      },
    });
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = (season: GamificationSeason) => {
    setSelectedSeason(season);
    setIsDeleteDialogOpen(true);
  };

  const handleActivateClick = (season: GamificationSeason) => {
    if (season.active) {
      // Desativar temporada
      handleToggleActive(season, false);
    } else {
      // Verificar se pode ativar
      if (seasonStats.activeSeason) {
        setSelectedSeason(season);
        setConflictingSeason(seasonStats.activeSeason);
        setIsActivateDialogOpen(true);
      } else {
        handleToggleActive(season, true);
      }
    }
  };

  const handleToggleActive = async (
    season: GamificationSeason,
    active: boolean,
  ) => {
    try {
      await updateGamificationSeason.mutate({
        seasonId: season.id,
        data: { active },
      });
      toast({
        title: active ? "Temporada ativada!" : "Temporada desativada!",
        description: `A temporada "${season.name}" foi ${active ? "ativada" : "desativada"} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao alterar status da temporada:", error);
    }
  };

  const handleForceActivate = async () => {
    if (!selectedSeason || !conflictingSeason) return;

    try {
      // Desativar temporada atual
      await updateGamificationSeason.mutate({
        seasonId: conflictingSeason.id,
        data: { active: false },
      });
      // Ativar nova temporada
      await updateGamificationSeason.mutate({
        seasonId: selectedSeason.id,
        data: { active: true },
      });

      toast({
        title: "Temporada alterada!",
        description: `"${selectedSeason.name}" está agora ativa. "${conflictingSeason.name}" foi desativada.`,
      });

      setIsActivateDialogOpen(false);
      setSelectedSeason(null);
      setConflictingSeason(null);
    } catch (error) {
      console.error("Erro ao trocar temporada ativa:", error);
    }
  };

  async function onDeleteConfirm() {
    if (!selectedSeason) return;
    try {
      await deleteGamificationSeason.mutate(selectedSeason.id);
      toast({
        title: "Temporada removida!",
        description: `A temporada "${selectedSeason.name}" foi removida com sucesso.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedSeason(null);
    } catch (error) {
      console.error("Erro ao deletar temporada:", error);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  const sortedSeasons = seasons.data
    ? [...seasons.data].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      )
    : [];

  const getSeasonStatus = (season: GamificationSeason) => {
    const now = new Date();
    const startDate = new Date(season.startDate);
    const endDate = new Date(season.endDate);

    if (season.active) {
      if (startDate <= now && endDate >= now) {
        return {
          text: "Ativa",
          variant: "default" as const,
          icon: Play,
          color: "text-green-600",
        };
      } else if (startDate > now) {
        return {
          text: "Ativa (Agendada)",
          variant: "secondary" as const,
          icon: Clock,
          color: "text-blue-600",
        };
      } else {
        return {
          text: "Ativa (Expirada)",
          variant: "destructive" as const,
          icon: AlertTriangle,
          color: "text-red-600",
        };
      }
    } else {
      if (endDate < now) {
        return {
          text: "Finalizada",
          variant: "outline" as const,
          icon: CheckCircle,
          color: "text-gray-500",
        };
      } else {
        return {
          text: "Inativa",
          variant: "secondary" as const,
          icon: Pause,
          color: "text-gray-600",
        };
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurar Temporadas</h1>
          <p className="text-muted-foreground">
            Gerencie os períodos de competição. Apenas uma temporada pode estar
            ativa por vez.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Temporada
        </Button>
      </div>

      {/* Estatísticas das temporadas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Ativa</p>
                <p className="text-2xl font-bold">{seasonStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Agendadas</p>
                <p className="text-2xl font-bold">{seasonStats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Finalizadas</p>
                <p className="text-2xl font-bold">{seasonStats.past}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{seasonStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta sobre temporada ativa */}
      {seasonStats.activeSeason && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Temporada Ativa:</strong> "{seasonStats.activeSeason.name}"
            (
            {format(new Date(seasonStats.activeSeason.startDate), "dd/MM/yyyy")}{" "}
            - {format(new Date(seasonStats.activeSeason.endDate), "dd/MM/yyyy")}
            )
            {seasonStats.activeSeason.xpMultiplier !== 1 && (
              <span className="ml-2">
                <Badge variant="outline">
                  {seasonStats.activeSeason.xpMultiplier}x XP
                </Badge>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Temporadas Criadas</CardTitle>
          <CardDescription>
            Gerencie suas temporadas. Lembre-se: apenas uma pode estar ativa por
            vez e os períodos não podem se sobrepor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSeasons.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
                Nenhuma temporada
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece criando sua primeira temporada de gamificação.
              </p>
              <div className="mt-6">
                <Button onClick={handleAddClick}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Temporada
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSeasons.map((season) => {
                  const status = getSeasonStatus(season);
                  const StatusIcon = status.icon;
                  const canActivate = canActivateSeason(season);

                  return (
                    <TableRow
                      key={season.id}
                      className={season.active ? "bg-green-50" : ""}
                    >
                      <TableCell>
                        <div className="font-medium">{season.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.ceil(
                            (new Date(season.endDate).getTime() -
                              new Date(season.startDate).getTime()) /
                              (1000 * 60 * 60 * 24),
                          )}{" "}
                          dias
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {format(new Date(season.startDate), "dd/MM/yyyy")}
                          </div>
                          <div className="text-muted-foreground">
                            até {format(new Date(season.endDate), "dd/MM/yyyy")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {season.xpMultiplier !== 1 ? (
                          <Badge variant="outline" className="font-mono">
                            {season.xpMultiplier}x
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Padrão</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-4 w-4", status.color)} />
                          <Badge variant={status.variant}>{status.text}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botão de ativar/desativar */}
                          {(canActivate || season.active) && (
                            <Button
                              variant={
                                season.active ? "destructive" : "default"
                              }
                              size="sm"
                              onClick={() => handleActivateClick(season)}
                            >
                              {season.active ? (
                                <>
                                  <Pause className="mr-1 h-3 w-3" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <Play className="mr-1 h-3 w-3" />
                                  Ativar
                                </>
                              )}
                            </Button>
                          )}

                          {/* Menu de ações */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditClick(season)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {!season.active && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteClick(season)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedSeason ? "Editar Temporada" : "Nova Temporada"}
            </DialogTitle>
            <DialogDescription>
              {selectedSeason
                ? "Modifique os dados da temporada. Cuidado com conflitos de período."
                : "Crie uma nova temporada de gamificação. Certifique-se de que não há conflitos de período."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Temporada</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Temporada Verão 2024, Q1 2025"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Escolha um nome descritivo e único para a temporada.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Período da Temporada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !field.value?.from && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, "dd 'de' LLL, y", {
                                  locale: ptBR,
                                })}{" "}
                                -{" "}
                                {format(field.value.to, "dd 'de' LLL, y", {
                                  locale: ptBR,
                                })}
                              </>
                            ) : (
                              format(field.value.from, "dd 'de' LLL, y", {
                                locale: ptBR,
                              })
                            )
                          ) : (
                            <span>Selecione o período</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={field.value}
                          onSelect={field.onChange}
                          numberOfMonths={2}
                          locale={ptBR}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Selecione as datas de início e fim. Os períodos não podem
                      se sobrepor.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="xpMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Multiplicador de XP</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          className="w-32"
                          {...field}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                    <FormDescription>
                      Multiplicador aplicado ao XP durante esta temporada (0.1 -
                      10.0).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Ativar Temporada
                      </FormLabel>
                      <FormDescription>
                        {field.value
                          ? "Esta temporada será ativada imediatamente."
                          : "Esta temporada ficará inativa até ser ativada manualmente."}
                        {seasonStats.activeSeason &&
                          !selectedSeason &&
                          field.value && (
                            <div className="mt-2 text-amber-600">
                              ⚠️ Já existe uma temporada ativa. Ela será
                              desativada automaticamente.
                            </div>
                          )}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFormDialogOpen(false);
                    setSelectedSeason(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>Salvando...</>
                  ) : selectedSeason ? (
                    "Atualizar"
                  ) : (
                    "Criar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Excluir Temporada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a temporada{" "}
              <strong>"{selectedSeason?.name}"</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita. A temporada será removida
              permanentemente, mas os dados de XP dos atendentes não serão
              afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Temporada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de ativação */}
      <AlertDialog
        open={isActivateDialogOpen}
        onOpenChange={setIsActivateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Trocar Temporada Ativa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma temporada ativa:{" "}
              <strong>"{conflictingSeason?.name}"</strong>.
              <br />
              <br />
              Para ativar <strong>"{selectedSeason?.name}"</strong>, a temporada
              atual será automaticamente desativada. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsActivateDialogOpen(false);
                setSelectedSeason(null);
                setConflictingSeason(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleForceActivate}>
              <Play className="mr-2 h-4 w-4" />
              Trocar Temporada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
