"use client";

import { useState, useEffect } from "react";
import { XpGrantInterface } from "@/components/gamification/xp/XpGrantInterface";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw, Users, Gift, Zap, Clock, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { XpAvulsoAdminToast } from "@/components/gamification/notifications/XpAvulsoToast";

interface XpGrantPageClientProps {
  userId: string;
}

interface Statistics {
  activeAttendants: number;
  availableTypes: number;
  todayGrants: number;
  remainingPoints: number;
}

export function XpGrantPageClient({ userId }: XpGrantPageClientProps) {
  const { activeSeason, isLoading: seasonLoading, error: seasonError, refetch: refetchSeason, hasActiveSeason } = useActiveSeason();
  const [statistics, setStatistics] = useState<Statistics>({
    activeAttendants: 0,
    availableTypes: 0,
    todayGrants: 0,
    remainingPoints: 1000
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchStatistics();
  }, [userId, refreshKey]);

  const fetchStatistics = async () => {
    try {
      setIsLoadingStats(true);
      
      // Buscar estatísticas em paralelo
      const [attendantsResponse, xpTypesResponse, grantsResponse] = await Promise.all([
        fetch('/api/attendants'),
        fetch('/api/gamification/xp-types'),
        fetch(`/api/gamification/xp-grants/daily-stats?userId=${userId}`)
      ]);

      let activeAttendants = 0;
      let availableTypes = 0;
      let todayGrants = 0;
      let remainingPoints = 1000;

      if (attendantsResponse.ok) {
        const attendantsData = await attendantsResponse.json();
        activeAttendants = attendantsData.filter((a: any) => a.status === 'Ativo').length;
      }

      if (xpTypesResponse.ok) {
        const xpTypesData = await xpTypesResponse.json();
        availableTypes = xpTypesData.filter((type: any) => type.active).length;
      }

      if (grantsResponse.ok) {
        const grantsData = await grantsResponse.json();
        todayGrants = grantsData.data?.todayGrants || 0;
        remainingPoints = grantsData.data?.remainingPoints || 1000;
      }

      setStatistics({
        activeAttendants,
        availableTypes,
        todayGrants,
        remainingPoints
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleGrantSuccess = () => {
    // Atualizar estatísticas após concessão bem-sucedida
    setRefreshKey(prev => prev + 1);
    
    toast({
      title: "XP Concedido!",
      description: "O XP foi concedido com sucesso e as estatísticas foram atualizadas.",
      action: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
        </div>
      )
    });
  };

  const handleRefreshSeason = () => {
    refetchSeason();
    setRefreshKey(prev => prev + 1);
  };

  // Loading state
  if (seasonLoading || isLoadingStats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Carregando informações...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state para temporada
  if (seasonError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Erro ao carregar informações da temporada: {seasonError}</span>
            <Button variant="outline" size="sm" onClick={handleRefreshSeason}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No active season state
  if (!hasActiveSeason) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Temporada Inativa:</strong> Não é possível conceder XP avulso sem uma temporada ativa. 
              Entre em contato com um administrador para ativar uma temporada.
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshSeason}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Novamente
            </Button>
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Gift className="h-5 w-5" />
              Interface de Concessão Indisponível
            </CardTitle>
            <CardDescription>
              A interface de concessão de XP estará disponível quando uma temporada estiver ativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aguardando ativação de temporada...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Componente de Toast Administrativo */}
      <XpAvulsoAdminToast />
      
      {/* Informações da Temporada Ativa */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Temporada Ativa:</strong> {activeSeason?.name} 
              {activeSeason?.xpMultiplier && activeSeason.xpMultiplier > 1 && (
                <Badge variant="secondary" className="ml-2">
                  Multiplicador {activeSeason.xpMultiplier}x
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefreshSeason}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Estatísticas Atualizadas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atendentes Ativos</p>
                <p className="text-2xl font-bold">{statistics.activeAttendants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Gift size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipos Disponíveis</p>
                <p className="text-2xl font-bold">{statistics.availableTypes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suas Concessões Hoje</p>
                <p className="text-2xl font-bold">{statistics.todayGrants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                statistics.remainingPoints > 200 
                  ? 'bg-purple-100 text-purple-600' 
                  : statistics.remainingPoints > 0 
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-red-100 text-red-600'
              }`}>
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos Restantes</p>
                <p className={`text-2xl font-bold ${
                  statistics.remainingPoints === 0 ? 'text-red-600' : ''
                }`}>
                  {statistics.remainingPoints}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Limite Atingido */}
      {statistics.remainingPoints === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Limite Diário Atingido:</strong> Você já concedeu o limite máximo de 1.000 pontos hoje. 
            Tente novamente amanhã ou entre em contato com um superadministrador.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Limite Próximo */}
      {statistics.remainingPoints > 0 && statistics.remainingPoints <= 200 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Você tem apenas {statistics.remainingPoints} pontos restantes para conceder hoje. 
            Use com moderação.
          </AlertDescription>
        </Alert>
      )}

      {/* Interface de Concessão */}
      <XpGrantInterface 
        userId={userId}
        onGrantSuccess={handleGrantSuccess}
        disabled={statistics.remainingPoints === 0}
        remainingPoints={statistics.remainingPoints}
      />
    </div>
  );
}