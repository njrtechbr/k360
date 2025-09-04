"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Star, TrendingUp, TrendingDown, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SurveyStatsProps } from './types';
import RatingStars from './RatingStars';

const SurveyStats: React.FC<SurveyStatsProps> = ({
  analytics,
  loading = false,
  timeRange,
  showCharts = true, // TODO: Implementar funcionalidade de gráficos
  className
}) => {
  const stats = useMemo(() => {
    if (!analytics) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        evaluatedAttendants: 0,
        commentsCount: 0,
        satisfactionRate: 0,
        topRatedAttendant: null,
        lowestRatedAttendant: null
      };
    }

    return {
      totalEvaluations: analytics.totalEvaluations,
      averageRating: analytics.averageRating,
      ratingDistribution: analytics.ratingDistribution,
      evaluatedAttendants: analytics.evaluatedAttendants,
      commentsCount: analytics.commentsCount,
      satisfactionRate: analytics.satisfactionRate,
      topRatedAttendant: analytics.topRatedAttendants?.[0] ? {
        name: analytics.topRatedAttendants[0].attendantName,
        averageRating: analytics.topRatedAttendants[0].averageRating
      } : null,
      lowestRatedAttendant: analytics.lowestRatedAttendants?.[0] ? {
        name: analytics.lowestRatedAttendants[0].attendantName,
        averageRating: analytics.lowestRatedAttendants[0].averageRating
      } : null
    };
  }, [analytics]);

  const getTimeRangeLabel = () => {
    if (timeRange) {
      return `${timeRange.start.toLocaleDateString()} - ${timeRange.end.toLocaleDateString()}`;
    }
    return 'Todo o período';
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Estatísticas da Pesquisa</h2>
          <Badge variant="outline">Carregando...</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Estatísticas da Pesquisa</h2>
        <Badge variant="outline">{getTimeRangeLabel()}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.commentsCount} com comentários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nota Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(2)}</div>
            <RatingStars value={stats.averageRating} readOnly size="sm" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Satisfação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.satisfactionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Notas 4 e 5 estrelas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendentes Avaliados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.evaluatedAttendants}
            </div>
            <p className="text-xs text-muted-foreground">
              Atendentes com avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.ratingDistribution).reverse().map(([rating, count]) => {
              const percentage = stats.totalEvaluations > 0
                ? (count / stats.totalEvaluations) * 100
                : 0;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Destaques da Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              if (!analytics?.topRatedAttendants?.length) return null;

              const usedAttendants = new Set<string>();
              const highlights = [];

              // 1. Melhor Avaliado (maior nota média)
              const topRated = analytics.topRatedAttendants
                .filter(att => !usedAttendants.has(att.attendantId))
                .sort((a, b) => b.averageRating - a.averageRating)[0];

              if (topRated) {
                usedAttendants.add(topRated.attendantId);
                highlights.push(
                  <div key="top-rated" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-900">
                        🏆 {topRated.attendantName}
                      </p>
                      <p className="text-sm text-green-700">
                        Melhor avaliado: {topRated.averageRating.toFixed(2)} ⭐
                      </p>
                    </div>
                  </div>
                );
              }

              // 2. Mais Avaliações (maior volume, excluindo já usados)
              const mostEvaluated = analytics.topRatedAttendants
                .filter(att => !usedAttendants.has(att.attendantId))
                .sort((a, b) => b.totalEvaluations - a.totalEvaluations)[0];

              if (mostEvaluated) {
                usedAttendants.add(mostEvaluated.attendantId);
                highlights.push(
                  <div key="most-evaluated" className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">
                        📊 {mostEvaluated.attendantName}
                      </p>
                      <p className="text-sm text-blue-700">
                        Mais avaliado: {mostEvaluated.totalEvaluations} avaliações
                      </p>
                    </div>
                  </div>
                );
              }

              // 3. Alta Satisfação (≥90% satisfação, excluindo já usados)
              const highSatisfaction = analytics.topRatedAttendants
                .filter(att => !usedAttendants.has(att.attendantId) && att.satisfactionRate >= 90)
                .sort((a, b) => b.satisfactionRate - a.satisfactionRate)[0];

              if (highSatisfaction) {
                usedAttendants.add(highSatisfaction.attendantId);
                highlights.push(
                  <div key="high-satisfaction" className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                      <Star className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-purple-900">
                        💜 {highSatisfaction.attendantName}
                      </p>
                      <p className="text-sm text-purple-700">
                        Alta satisfação: {highSatisfaction.satisfactionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              }

              // 4. Consistente (≥5 avaliações e ≥4.0, excluindo já usados)
              const consistent = analytics.topRatedAttendants
                .filter(att =>
                  !usedAttendants.has(att.attendantId) &&
                  att.totalEvaluations >= 5 &&
                  att.averageRating >= 4.0
                )
                .sort((a, b) => {
                  // Prioriza equilíbrio entre volume e qualidade
                  const scoreA = a.totalEvaluations * a.averageRating;
                  const scoreB = b.totalEvaluations * b.averageRating;
                  return scoreB - scoreA;
                })[0];

              if (consistent) {
                usedAttendants.add(consistent.attendantId);
                highlights.push(
                  <div key="consistent" className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-emerald-900">
                        🎯 {consistent.attendantName}
                      </p>
                      <p className="text-sm text-emerald-700">
                        Consistente: {consistent.averageRating.toFixed(2)} em {consistent.totalEvaluations} avaliações
                      </p>
                    </div>
                  </div>
                );
              }

              // 5. Em Crescimento (melhor entre os que têm poucas avaliações, excluindo já usados)
              const growing = analytics.topRatedAttendants
                .filter(att =>
                  !usedAttendants.has(att.attendantId) &&
                  att.totalEvaluations >= 3 &&
                  att.totalEvaluations <= 10 &&
                  att.averageRating >= 4.0
                )
                .sort((a, b) => b.averageRating - a.averageRating)[0];

              if (growing) {
                usedAttendants.add(growing.attendantId);
                highlights.push(
                  <div key="growing" className="flex items-center gap-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-cyan-100 rounded-full">
                      <TrendingUp className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cyan-900">
                        🌟 {growing.attendantName}
                      </p>
                      <p className="text-sm text-cyan-700">
                        Em crescimento: {growing.averageRating.toFixed(2)} ⭐ ({growing.totalEvaluations} avaliações)
                      </p>
                    </div>
                  </div>
                );
              }

              // Se não temos destaques suficientes, adicionar "Precisa de Atenção"
              if (highlights.length < 4 && analytics?.lowestRatedAttendants?.[0] &&
                analytics.lowestRatedAttendants[0].averageRating < 4 &&
                !usedAttendants.has(analytics.lowestRatedAttendants[0].attendantId)) {
                highlights.push(
                  <div key="needs-attention" className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-orange-900">
                        ⚠️ {analytics.lowestRatedAttendants[0].attendantName}
                      </p>
                      <p className="text-sm text-orange-700">
                        Precisa de atenção: {analytics.lowestRatedAttendants[0].averageRating.toFixed(2)} ⭐
                      </p>
                    </div>
                  </div>
                );
              }

              return highlights.length > 0 ? highlights : (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-700">
                      Aguardando mais dados
                    </p>
                    <p className="text-sm text-gray-600">
                      Os destaques aparecerão quando houver mais avaliações
                    </p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SurveyStats;