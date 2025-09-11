"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Calendar,
  Award,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Attendant, Evaluation } from "@/lib/types";
import RatingStars from "./RatingStars";
import SentimentBadge from "./SentimentBadge";

export interface AttendantProfileProps {
  attendant: Attendant;
  evaluations: Evaluation[];
  showActions?: boolean;
  onEditAttendant?: (attendant: Attendant) => void;
  onViewEvaluations?: (attendantId: string) => void;
  className?: string;
}

export default function AttendantProfile({
  attendant,
  evaluations,
  showActions = true,
  onEditAttendant,
  onViewEvaluations,
  className,
}: AttendantProfileProps) {
  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const attendantEvaluations = evaluations.filter(
      (e) => e.attendantId === attendant.id,
    );
    const totalEvaluations = attendantEvaluations.length;

    if (totalEvaluations === 0) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        satisfactionRate: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        commentsCount: 0,
        lastEvaluation: null,
        trend: "neutral" as const,
      };
    }

    const totalRating = attendantEvaluations.reduce(
      (sum, e) => sum + e.nota,
      0,
    );
    const averageRating = totalRating / totalEvaluations;
    const satisfiedEvaluations = attendantEvaluations.filter(
      (e) => e.nota >= 4,
    ).length;
    const satisfactionRate = (satisfiedEvaluations / totalEvaluations) * 100;
    const commentsCount = attendantEvaluations.filter(
      (e) => e.comentario && e.comentario.trim(),
    ).length;

    // Distribuição de notas
    const ratingDistribution = attendantEvaluations.reduce(
      (acc, e) => {
        acc[e.nota as keyof typeof acc]++;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    );

    // Última avaliação
    const sortedEvaluations = attendantEvaluations.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const lastEvaluation = sortedEvaluations[0];

    // Tendência (comparar últimas 5 com 5 anteriores)
    let trend: "up" | "down" | "neutral" = "neutral";
    if (totalEvaluations >= 10) {
      const recent5 = sortedEvaluations.slice(0, 5);
      const previous5 = sortedEvaluations.slice(5, 10);

      const recentAvg = recent5.reduce((sum, e) => sum + e.nota, 0) / 5;
      const previousAvg = previous5.reduce((sum, e) => sum + e.nota, 0) / 5;

      if (recentAvg > previousAvg + 0.2) trend = "up";
      else if (recentAvg < previousAvg - 0.2) trend = "down";
    }

    return {
      totalEvaluations,
      averageRating,
      satisfactionRate,
      ratingDistribution,
      commentsCount,
      lastEvaluation,
      trend,
    };
  }, [attendant.id, evaluations]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={attendant.avatarUrl} />
              <AvatarFallback className="text-lg">
                {attendant.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">{attendant.name}</h3>
              <p className="text-muted-foreground">{attendant.funcao}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  ID: {attendant.id}
                </Badge>
                {attendant.isActive ? (
                  <Badge variant="default" className="text-xs">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Inativo
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2">
              {onEditAttendant && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditAttendant(attendant)}
                >
                  Editar
                </Button>
              )}
              {onViewEvaluations && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onViewEvaluations(attendant.id)}
                >
                  Ver Avaliações
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informações de Contato */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Contato
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {attendant.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3 w-3" />
                {attendant.email}
              </div>
            )}
            {attendant.telefone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {attendant.telefone}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Estatísticas de Avaliação */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas de Avaliação
          </h4>

          {stats.totalEvaluations === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma avaliação ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Métricas Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {stats.totalEvaluations}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avaliações
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold">
                      {stats.averageRating.toFixed(1)}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="text-xs text-muted-foreground">Média</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {stats.satisfactionRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Satisfação
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold">
                      {stats.commentsCount}
                    </span>
                    {stats.trend === "up" && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    {stats.trend === "down" && (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Comentários
                  </div>
                </div>
              </div>

              {/* Distribuição de Notas */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Distribuição de Notas</h5>
                <div className="space-y-2">
                  {Object.entries(stats.ratingDistribution)
                    .reverse()
                    .map(([rating, count]) => {
                      const percentage = (count / stats.totalEvaluations) * 100;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16">
                            <span className="text-sm">{rating}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <div className="text-sm text-muted-foreground w-12 text-right">
                            {count}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Última Avaliação */}
              {stats.lastEvaluation && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Última Avaliação
                  </h5>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <RatingStars
                        value={stats.lastEvaluation.nota}
                        readOnly
                        size="sm"
                      />
                      <span className="text-sm text-muted-foreground">
                        {format(
                          new Date(stats.lastEvaluation.createdAt),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR },
                        )}
                      </span>
                    </div>
                    {stats.lastEvaluation.comentario && (
                      <div className="space-y-1">
                        <p className="text-sm">
                          {stats.lastEvaluation.comentario}
                        </p>
                        {stats.lastEvaluation.sentimentAnalysis && (
                          <SentimentBadge
                            sentiment={
                              stats.lastEvaluation.sentimentAnalysis.sentiment
                            }
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
