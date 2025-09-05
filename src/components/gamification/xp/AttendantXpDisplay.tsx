"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, 
  Star, 
  Trophy, 
  Calendar,
  User,
  MessageSquare,
  Gift,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelFromXp } from "@/lib/xp";
import { GamificationService } from "@/services/gamificationService";
import { XpAvulsoService, XpGrantWithRelations } from "@/services/xpAvulsoService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import XpNotificationBadge from "@/components/gamification/notifications/XpNotificationBadge";
import XpAvulsoNotification from "@/components/gamification/notifications/XpAvulsoNotification";

interface AttendantXpDisplayProps {
  attendantId: string;
  className?: string;
  showHistory?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

interface XpBreakdown {
  totalXp: number;
  evaluationXp: number;
  avulsoXp: number;
  level: number;
  progress: number;
  xpForNextLevel: number;
}

export default function AttendantXpDisplay({
  attendantId,
  className,
  showHistory = true,
  variant = 'default'
}: AttendantXpDisplayProps) {
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [avulsoHistory, setAvulsoHistory] = useState<XpGrantWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadXpData();
  }, [attendantId]);

  const loadXpData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados de XP separados por tipo
      const [totalXpResponse, avulsoGrantsResponse, evaluationXpResponse] = await Promise.all([
        // XP total
        fetch(`/api/gamification/attendants/${attendantId}/xp-total`).catch(() => null),
        // Histórico de XP avulso
        fetch(`/api/gamification/xp-grants/attendant/${attendantId}`).catch(() => null),
        // XP de avaliações
        fetch(`/api/gamification/xp-events/attendant/${attendantId}?type=evaluation`).catch(() => null)
      ]);

      let totalXp = 0;
      let avulsoXp = 0;
      let evaluationXp = 0;
      let avulsoGrants: XpGrantWithRelations[] = [];

      // Processar XP total
      if (totalXpResponse?.ok) {
        const totalXpData = await totalXpResponse.json();
        totalXp = totalXpData.totalXp || 0;
      } else {
        // Fallback usando GamificationService
        totalXp = await GamificationService.calculateTotalXp(attendantId);
      }

      // Processar XP avulso
      if (avulsoGrantsResponse?.ok) {
        avulsoGrants = await avulsoGrantsResponse.json();
        avulsoXp = avulsoGrants.reduce((sum, grant) => sum + grant.points, 0);
      } else {
        // Fallback usando XpAvulsoService
        avulsoGrants = await XpAvulsoService.findGrantsByAttendant(attendantId);
        avulsoXp = avulsoGrants.reduce((sum, grant) => sum + grant.points, 0);
      }

      // Processar XP de avaliações
      if (evaluationXpResponse?.ok) {
        const evaluationEvents = await evaluationXpResponse.json();
        evaluationXp = evaluationEvents.reduce((sum: number, event: any) => sum + event.points, 0);
      } else {
        // Fallback: calcular como total - avulso
        evaluationXp = Math.max(0, totalXp - avulsoXp);
      }
      
      // Calcular nível e progresso
      const { level, progress, xpForNextLevel: nextLevelXp } = getLevelFromXp(totalXp);
      const xpForNextLevel = nextLevelXp - totalXp;

      setXpBreakdown({
        totalXp,
        evaluationXp,
        avulsoXp,
        level,
        progress,
        xpForNextLevel
      });

      setAvulsoHistory(avulsoGrants);
    } catch (err) {
      console.error('Erro ao carregar dados de XP:', err);
      setError('Erro ao carregar dados de XP');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !xpBreakdown) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {error || 'Erro ao carregar dados'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-4 p-4 border rounded-lg bg-muted/50", className)}>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="text-xl font-bold">{xpBreakdown.totalXp.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">XP</span>
        </div>
        
        <Separator orientation="vertical" className="h-8" />
        
        <Badge variant="secondary" className="flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          Nível {xpBreakdown.level}
        </Badge>
        
        {xpBreakdown.avulsoXp > 0 && (
          <>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-1 text-sm">
              <Gift className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{xpBreakdown.avulsoXp}</span>
              <span className="text-muted-foreground">XP Avulso</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Experiência (XP)
            </CardTitle>
            <CardDescription>
              Progresso e histórico de pontos de experiência
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <XpNotificationBadge attendantId={attendantId} />
            <XpAvulsoNotification 
              attendantId={attendantId}
              onNotificationReceived={(data) => {
                // Recarregar dados quando receber nova notificação
                loadXpData();
              }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Resumo Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* XP Total */}
          <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              <span className="text-sm font-medium text-muted-foreground">XP Total</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {xpBreakdown.totalXp.toLocaleString()}
            </div>
            <Badge variant="secondary" className="mt-2">
              <Trophy className="h-3 w-3 mr-1" />
              Nível {xpBreakdown.level}
            </Badge>
          </div>

          {/* XP de Avaliações */}
          <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-6 w-6 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Avaliações</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {xpBreakdown.evaluationXp.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {((xpBreakdown.evaluationXp / xpBreakdown.totalXp) * 100).toFixed(1)}% do total
            </div>
          </div>

          {/* XP Avulso */}
          <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">XP Avulso</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {xpBreakdown.avulsoXp.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {xpBreakdown.totalXp > 0 
                ? `${((xpBreakdown.avulsoXp / xpBreakdown.totalXp) * 100).toFixed(1)}% do total`
                : '0% do total'
              }
            </div>
          </div>
        </div>

        {/* Progresso para Próximo Nível */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso para Nível {xpBreakdown.level + 1}</span>
            <span className="text-sm text-muted-foreground">
              {xpBreakdown.progress.toFixed(1)}%
            </span>
          </div>
          <Progress value={xpBreakdown.progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Nível {xpBreakdown.level}</span>
            <span>{xpBreakdown.xpForNextLevel.toLocaleString()} XP restantes</span>
          </div>
        </div>

        {/* Histórico de XP Avulso */}
        {showHistory && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Histórico de XP Avulso</h3>
                <Badge variant="outline">{avulsoHistory.length} concessões</Badge>
              </div>
              
              {avulsoHistory.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium text-blue-600">{xpBreakdown?.avulsoXp.toLocaleString()} XP</span>
                </div>
              )}
            </div>

            {avulsoHistory.length > 0 ? (
              <ScrollArea className="h-64 w-full border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Concedido por</TableHead>
                      <TableHead>Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avulsoHistory.map((grant) => (
                      <TableRow key={grant.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(grant.grantedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: grant.type.color }}
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{grant.type.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {grant.type.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            +{grant.points} XP
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{grant.granter.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {grant.justification ? (
                            <div className="flex items-center gap-2 max-w-xs">
                              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate" title={grant.justification}>
                                {grant.justification}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">Nenhum XP avulso recebido</p>
                <p className="text-sm">Este atendente ainda não recebeu pontos de XP avulso.</p>
              </div>
            )}
          </div>
        )}

        {/* Indicadores Visuais e Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Legenda de Tipos de XP */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Tipos de XP
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>XP de Avaliações</span>
                </div>
                <span className="text-sm font-medium">
                  {xpBreakdown?.evaluationXp.toLocaleString()} XP
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>XP Avulso</span>
                </div>
                <span className="text-sm font-medium">
                  {xpBreakdown?.avulsoXp.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Estatísticas
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concessões XP Avulso:</span>
                <span className="font-medium">{avulsoHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Média por concessão:</span>
                <span className="font-medium">
                  {avulsoHistory.length > 0 
                    ? Math.round((xpBreakdown?.avulsoXp || 0) / avulsoHistory.length)
                    : 0
                  } XP
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">% XP Avulso:</span>
                <span className="font-medium">
                  {xpBreakdown?.totalXp && xpBreakdown.totalXp > 0
                    ? ((xpBreakdown.avulsoXp / xpBreakdown.totalXp) * 100).toFixed(1)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}