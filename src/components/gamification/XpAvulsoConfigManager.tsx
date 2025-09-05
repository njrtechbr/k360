"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle, Info, Clock, Users, Zap, Shield, Bell, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { XpAvulsoConfig } from "@prisma/client";

// Schema de validação para o formulário
const ConfigFormSchema = z.object({
  dailyLimitPoints: z.number().min(100, 'Limite diário deve ser pelo menos 100 pontos').max(10000, 'Limite diário não pode exceder 10.000 pontos'),
  dailyLimitGrants: z.number().min(10, 'Limite diário deve ser pelo menos 10 concessões').max(500, 'Limite diário não pode exceder 500 concessões'),
  maxPointsPerGrant: z.number().min(1, 'Máximo por concessão deve ser pelo menos 1 ponto').max(1000, 'Máximo por concessão não pode exceder 1.000 pontos'),
  minPointsPerGrant: z.number().min(1, 'Mínimo por concessão deve ser pelo menos 1 ponto'),
  requireJustification: z.boolean(),
  autoApproveLimit: z.number().min(1, 'Limite de aprovação automática deve ser pelo menos 1 ponto').max(500, 'Limite de aprovação automática não pode exceder 500 pontos'),
  auditRetentionDays: z.number().min(30, 'Retenção de auditoria deve ser pelo menos 30 dias').max(2555, 'Retenção de auditoria não pode exceder 7 anos'),
  enableNotifications: z.boolean(),
  allowWeekendGrants: z.boolean(),
  allowHolidayGrants: z.boolean(),
  maxGrantsPerAttendant: z.number().min(1, 'Máximo por atendente deve ser pelo menos 1').max(100, 'Máximo por atendente não pode exceder 100'),
  cooldownMinutes: z.number().min(0, 'Cooldown não pode ser negativo').max(1440, 'Cooldown não pode exceder 24 horas')
});

type ConfigFormData = z.infer<typeof ConfigFormSchema>;

interface UsageStats {
  totalGrants: number;
  totalPoints: number;
  averagePointsPerGrant: number;
  topGranters: Array<{
    granterId: string;
    granterName: string;
    totalGrants: number;
    totalPoints: number;
  }>;
  dailyUsage: Array<{
    date: string;
    grants: number;
    points: number;
  }>;
}

interface XpAvulsoConfigManagerProps {
  userId?: string;
}

export function XpAvulsoConfigManager({ userId }: XpAvulsoConfigManagerProps) {
  const [config, setConfig] = useState<XpAvulsoConfig | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(ConfigFormSchema),
    defaultValues: {
      dailyLimitPoints: 1000,
      dailyLimitGrants: 50,
      maxPointsPerGrant: 200,
      minPointsPerGrant: 1,
      requireJustification: false,
      autoApproveLimit: 50,
      auditRetentionDays: 365,
      enableNotifications: true,
      allowWeekendGrants: true,
      allowHolidayGrants: true,
      maxGrantsPerAttendant: 10,
      cooldownMinutes: 5
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/xp-avulso-config?includeStats=true&statsDays=30');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
        setStats(data.stats);
        
        // Atualizar formulário com dados carregados
        form.reset({
          dailyLimitPoints: data.data.dailyLimitPoints,
          dailyLimitGrants: data.data.dailyLimitGrants,
          maxPointsPerGrant: data.data.maxPointsPerGrant,
          minPointsPerGrant: data.data.minPointsPerGrant,
          requireJustification: data.data.requireJustification,
          autoApproveLimit: data.data.autoApproveLimit,
          auditRetentionDays: data.data.auditRetentionDays,
          enableNotifications: data.data.enableNotifications,
          allowWeekendGrants: data.data.allowWeekendGrants,
          allowHolidayGrants: data.data.allowHolidayGrants,
          maxGrantsPerAttendant: data.data.maxGrantsPerAttendant,
          cooldownMinutes: data.data.cooldownMinutes
        });
        
        setHasUnsavedChanges(false);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: ConfigFormData) => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/gamification/xp-avulso-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          setConfig(result.data);
          setHasUnsavedChanges(false);
          
          toast({
            title: "Sucesso!",
            description: "Configurações salvas com sucesso",
            action: (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )
          });
          
          // Recarregar estatísticas
          fetchConfig();
        } else {
          throw new Error(result.error || 'Erro ao salvar');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/gamification/xp-avulso-config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          setConfig(result.data);
          
          // Resetar formulário
          form.reset({
            dailyLimitPoints: result.data.dailyLimitPoints,
            dailyLimitGrants: result.data.dailyLimitGrants,
            maxPointsPerGrant: result.data.maxPointsPerGrant,
            minPointsPerGrant: result.data.minPointsPerGrant,
            requireJustification: result.data.requireJustification,
            autoApproveLimit: result.data.autoApproveLimit,
            auditRetentionDays: result.data.auditRetentionDays,
            enableNotifications: result.data.enableNotifications,
            allowWeekendGrants: result.data.allowWeekendGrants,
            allowHolidayGrants: result.data.allowHolidayGrants,
            maxGrantsPerAttendant: result.data.maxGrantsPerAttendant,
            cooldownMinutes: result.data.cooldownMinutes
          });
          
          setHasUnsavedChanges(false);
          setShowResetDialog(false);
          
          toast({
            title: "Configurações Resetadas",
            description: "Todas as configurações foram restauradas para os valores padrão",
            action: (
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-blue-600" />
              </div>
            )
          });
        } else {
          throw new Error(result.error || 'Erro ao resetar');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao resetar configurações');
      }
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao resetar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas de Uso */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Concessões (30d)</p>
                  <p className="text-2xl font-bold">{stats.totalGrants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pontos (30d)</p>
                  <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <Settings size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média por Concessão</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averagePointsPerGrant)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Administradores Ativos</p>
                  <p className="text-2xl font-bold">{stats.topGranters.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerta de Mudanças Não Salvas */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Você tem alterações não salvas. Lembre-se de salvar suas configurações.
          </AlertDescription>
        </Alert>
      )}

      {/* Formulário de Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de XP Avulso
          </CardTitle>
          <CardDescription>
            Configure os limites e regras para concessão manual de XP. Essas configurações afetam todos os administradores do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
              
              {/* Seção: Limites Diários */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Limites Diários por Administrador</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dailyLimitPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Pontos por Dia</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo de pontos que um admin pode conceder por dia
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dailyLimitGrants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Concessões por Dia</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo de concessões que um admin pode fazer por dia
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Seção: Limites por Concessão */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Limites por Concessão Individual</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="minPointsPerGrant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mínimo de Pontos</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Mínimo de pontos por concessão
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxPointsPerGrant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Pontos</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo de pontos por concessão
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="autoApproveLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Aprovação Automática</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Concessões acima deste valor podem precisar de aprovação
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Seção: Controles por Atendente */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Controles por Atendente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxGrantsPerAttendant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Concessões por Atendente/Dia</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo de concessões que um atendente pode receber por dia
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cooldownMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cooldown entre Concessões (minutos)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Tempo mínimo entre concessões para o mesmo atendente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Seção: Configurações Gerais */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Configurações Gerais</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="requireJustification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Justificativa Obrigatória</FormLabel>
                            <FormDescription>
                              Exigir justificativa em todas as concessões
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
                    
                    <FormField
                      control={form.control}
                      name="enableNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Notificações Habilitadas</FormLabel>
                            <FormDescription>
                              Enviar notificações sobre concessões de XP
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
                  </div>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="allowWeekendGrants"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Permitir Fins de Semana</FormLabel>
                            <FormDescription>
                              Permitir concessões nos fins de semana
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
                    
                    <FormField
                      control={form.control}
                      name="allowHolidayGrants"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Permitir Feriados</FormLabel>
                            <FormDescription>
                              Permitir concessões em feriados
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
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="auditRetentionDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retenção de Logs de Auditoria (dias)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Número de dias para manter logs de auditoria das concessões
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-between pt-6">
                <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" type="button">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resetar para Padrão
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Confirmar Reset
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá restaurar todas as configurações para os valores padrão. 
                        Todas as personalizações serão perdidas. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Resetando...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Confirmar Reset
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="submit" disabled={isSaving || !hasUnsavedChanges}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Sobre o XP Avulso:</strong> Este sistema permite conceder pontos de experiência manualmente para equilibrar a gamificação entre atendentes que fazem atendimento ao público (que recebem XP por avaliações) e aqueles que trabalham em outras áreas. As configurações aqui definidas se aplicam a todos os administradores do sistema.
        </AlertDescription>
      </Alert>
    </div>
  );
}