'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import SentimentBadge from './SentimentBadge';
import SentimentFilters from './SentimentFilters';

export interface SentimentAnalysisData {
  id: string;
  comment: string;
  sentiment: 'Positivo' | 'Negativo' | 'Neutro';
  confidence: number;
  keywords: string[];
  analyzedAt: string;
  evaluation: {
    id: string;
    nota: number;
    data: string;
    attendantId: string;
    attendantName: string;
  };
}

export interface SentimentAnalysisPanelProps {
  analyses: SentimentAnalysisData[];
  isLoading?: boolean;
  onStartAnalysis?: () => void;
  onExportData?: () => void;
  onViewDetails?: (analysis: SentimentAnalysisData) => void;
  className?: string;
}

const SentimentAnalysisPanel: React.FC<SentimentAnalysisPanelProps> = ({
  analyses,
  isLoading = false,
  onStartAnalysis,
  onExportData,
  onViewDetails,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = analyses.length;
    const positive = analyses.filter(a => a.sentiment === 'Positivo').length;
    const negative = analyses.filter(a => a.sentiment === 'Negativo').length;
    const neutral = analyses.filter(a => a.sentiment === 'Neutro').length;
    
    const avgConfidence = total > 0 
      ? analyses.reduce((sum, a) => sum + a.confidence, 0) / total 
      : 0;
    
    const lowConfidence = analyses.filter(a => a.confidence < 0.6).length;
    const conflicting = analyses.filter(a => 
      (a.sentiment === 'Positivo' && a.confidence < 0.7) ||
      (a.sentiment === 'Negativo' && a.confidence < 0.7)
    ).length;

    return {
      total,
      positive,
      negative,
      neutral,
      positivePercentage: total > 0 ? (positive / total) * 100 : 0,
      negativePercentage: total > 0 ? (negative / total) * 100 : 0,
      neutralPercentage: total > 0 ? (neutral / total) * 100 : 0,
      avgConfidence,
      lowConfidence,
      conflicting
    };
  }, [analyses]);

  // Análises filtradas
  const filteredAnalyses = useMemo(() => {
    let filtered = analyses;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(analysis => 
        analysis.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        analysis.evaluation.attendantName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por sentimento
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(analysis => {
        switch (sentimentFilter) {
          case 'positive':
            return analysis.sentiment === 'Positivo';
          case 'negative':
            return analysis.sentiment === 'Negativo';
          case 'neutral':
            return analysis.sentiment === 'Neutro';
          default:
            return true;
        }
      });
    }

    // Filtro por confiança
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(analysis => {
        switch (confidenceFilter) {
          case 'high':
            return analysis.confidence >= 0.8;
          case 'medium':
            return analysis.confidence >= 0.6 && analysis.confidence < 0.8;
          case 'low':
            return analysis.confidence < 0.6;
          default:
            return true;
        }
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'sentiment':
          return a.sentiment.localeCompare(b.sentiment);
        case 'rating':
          return b.evaluation.nota - a.evaluation.nota;
        case 'date':
        default:
          return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
      }
    });

    return filtered;
  }, [analyses, searchTerm, sentimentFilter, confidenceFilter, sortBy]);

  // Insights automáticos
  const insights = useMemo(() => {
    const insights: string[] = [];
    
    if (stats.total === 0) {
      insights.push('📊 Nenhuma análise disponível ainda');
      return insights;
    }

    if (stats.positivePercentage > 70) {
      insights.push('😊 Excelente! Mais de 70% dos comentários são positivos');
    } else if (stats.negativePercentage > 30) {
      insights.push('😟 Atenção: Mais de 30% dos comentários são negativos');
    }

    if (stats.avgConfidence > 0.8) {
      insights.push('🎯 Alta confiança nas análises (>80%)');
    } else if (stats.avgConfidence < 0.6) {
      insights.push('⚠️ Confiança baixa - revisar análises manualmente');
    }

    if (stats.conflicting > 0) {
      insights.push(`🔍 ${stats.conflicting} análises conflitantes encontradas`);
    }

    if (stats.lowConfidence > stats.total * 0.2) {
      insights.push('📝 Muitas análises com baixa confiança');
    }

    return insights;
  }, [stats]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold">Análise de Sentimento</h2>
          <p className="text-muted-foreground">Insights automáticos dos comentários</p>
        </div>
        <div className="flex gap-2">
          {onStartAnalysis && (
            <Button onClick={onStartAnalysis} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              {isLoading ? 'Analisando...' : 'Nova Análise'}
            </Button>
          )}
          {onExportData && (
            <Button variant="outline" onClick={onExportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Análises</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Comentários analisados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentimento Positivo</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.positivePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.positive} de {stats.total} análises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentimento Negativo</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.negativePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.negative} de {stats.total} análises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.avgConfidence * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lowConfidence} com baixa confiança
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights automáticos */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insights Automáticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <span className="text-sm">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros e Busca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por comentário, palavra-chave ou atendente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <SentimentFilters
            sentimentFilter={sentimentFilter}
            confidenceFilter={confidenceFilter}
            sortBy={sortBy}
            onSentimentChange={setSentimentFilter}
            onConfidenceChange={setConfidenceFilter}
            onSortChange={setSortBy}
          />
        </CardContent>
      </Card>

      {/* Lista de análises */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Análises ({filteredAnalyses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAnalyses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {analyses.length === 0 
                ? 'Nenhuma análise disponível ainda'
                : 'Nenhuma análise encontrada com os filtros aplicados'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <SentimentBadge sentiment={analysis.sentiment} />
                        <Badge variant="outline">
                          {(analysis.confidence * 100).toFixed(0)}% confiança
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Nota: {analysis.evaluation.nota}/5
                        </span>
                      </div>
                      
                      <p className="text-sm">{analysis.comment}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {analysis.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Atendente: {analysis.evaluation.attendantName} • 
                        {new Date(analysis.analyzedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(analysis)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SentimentAnalysisPanel;