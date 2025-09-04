import type { Evaluation, SentimentAnalysis } from '@/lib/types';
import { 
  SentimentAnalysisSchema,
  type SentimentAnalysisInput
} from '@/lib/validation';
import { validateFormData, isValidDateRange, sanitizeString } from '@/lib/validation-utils';

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AnalysisProgress {
  total: number;
  analyzed: number;
  pending: number;
  percentage: number;
  isRunning: boolean;
  currentEvaluation?: Evaluation;
}

export interface SentimentStats {
  totalAnalyzed: number;
  distribution: SentimentDistribution;
  averageConfidence: number;
  recentAnalyses: SentimentAnalysis[];
}

export class SentimentService {
  /**
   * Calcula a distribuição de sentimentos
   */
  static calculateSentimentDistribution(analyses: SentimentAnalysis[]): SentimentDistribution {
    const total = analyses.length;
    
    if (total === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    const counts = analyses.reduce(
      (acc, analysis) => {
        acc[analysis.sentiment]++;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    return {
      positive: (counts.positive / total) * 100,
      neutral: (counts.neutral / total) * 100,
      negative: (counts.negative / total) * 100
    };
  }

  /**
   * Calcula o progresso da análise
   */
  static calculateAnalysisProgress(
    evaluations: Evaluation[],
    analyses: SentimentAnalysis[],
    isRunning: boolean = false,
    currentEvaluation?: Evaluation
  ): AnalysisProgress {
    const total = evaluations.length;
    const analyzed = analyses.length;
    const pending = total - analyzed;
    const percentage = total > 0 ? (analyzed / total) * 100 : 0;

    return {
      total,
      analyzed,
      pending,
      percentage,
      isRunning,
      currentEvaluation
    };
  }

  /**
   * Calcula estatísticas de sentimento
   */
  static calculateSentimentStats(analyses: SentimentAnalysis[]): SentimentStats {
    const totalAnalyzed = analyses.length;
    const distribution = this.calculateSentimentDistribution(analyses);
    
    const averageConfidence = totalAnalyzed > 0
      ? analyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / totalAnalyzed
      : 0;

    const recentAnalyses = [...analyses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalAnalyzed,
      distribution,
      averageConfidence,
      recentAnalyses
    };
  }

  /**
   * Filtra análises por sentimento
   */
  static filterBySentiment(
    analyses: SentimentAnalysis[],
    sentiment: 'positive' | 'neutral' | 'negative'
  ): SentimentAnalysis[] {
    // Valida o sentimento
    const validSentiments = ['positive', 'neutral', 'negative'];
    if (!validSentiments.includes(sentiment)) {
      throw new Error(`Sentimento inválido: ${sentiment}. Deve ser um de: ${validSentiments.join(', ')}`);
    }
    
    return analyses.filter(analysis => analysis.sentiment === sentiment);
  }

  /**
   * Filtra análises por período
   */
  static filterByPeriod(
    analyses: SentimentAnalysis[],
    startDate: Date,
    endDate: Date
  ): SentimentAnalysis[] {
    // Valida o período
    if (startDate > endDate) {
      throw new Error('Data de início deve ser anterior ou igual à data de fim');
    }
    return analyses.filter(analysis => {
      const analysisDate = new Date(analysis.createdAt);
      return analysisDate >= startDate && analysisDate <= endDate;
    });
  }

  /**
   * Filtra análises por nível de confiança
   */
  static filterByConfidence(
    analyses: SentimentAnalysis[],
    minConfidence: number
  ): SentimentAnalysis[] {
    // Valida o nível de confiança
    if (minConfidence < 0 || minConfidence > 1) {
      throw new Error('Nível de confiança deve estar entre 0 e 1');
    }
    
    return analyses.filter(analysis => analysis.confidence >= minConfidence);
  }

  /**
   * Busca análises por texto
   */
  static searchAnalyses(
    analyses: SentimentAnalysis[],
    searchTerm: string
  ): SentimentAnalysis[] {
    // Sanitiza o termo de busca
    const sanitizedSearchTerm = sanitizeString(searchTerm.toLowerCase());
    
    if (!sanitizedSearchTerm) {
      return analyses;
    }
    
    return analyses.filter(analysis => {
      const sanitizedSummary = sanitizeString(analysis.summary.toLowerCase());
      const sanitizedComment = sanitizeString(analysis.originalComment.toLowerCase());
      
      return sanitizedSummary.includes(sanitizedSearchTerm) ||
             sanitizedComment.includes(sanitizedSearchTerm);
    });
  }

  /**
   * Obtém análises com baixa confiança
   */
  static getLowConfidenceAnalyses(
    analyses: SentimentAnalysis[],
    threshold: number = 0.7
  ): SentimentAnalysis[] {
    return analyses
      .filter(analysis => analysis.confidence < threshold)
      .sort((a, b) => a.confidence - b.confidence);
  }

  /**
   * Obtém análises conflitantes (sentimento negativo com nota alta ou vice-versa)
   */
  static getConflictingAnalyses(
    analyses: SentimentAnalysis[],
    evaluations: Evaluation[]
  ): Array<SentimentAnalysis & { evaluation: Evaluation }> {
    const evaluationMap = new Map(evaluations.map(evaluation => [evaluation.id, evaluation]));
    
    return analyses
      .map(analysis => {
        const evaluation = evaluationMap.get(analysis.evaluationId);
        return evaluation ? { ...analysis, evaluation } : null;
      })
      .filter((item): item is SentimentAnalysis & { evaluation: Evaluation } => item !== null)
      .filter(({ sentiment, evaluation }) => {
        // Conflito: sentimento negativo com nota alta (4-5)
        if (sentiment === 'negative' && evaluation.nota >= 4) return true;
        // Conflito: sentimento positivo com nota baixa (1-2)
        if (sentiment === 'positive' && evaluation.nota <= 2) return true;
        return false;
      });
  }

  /**
   * Calcula tendências de sentimento ao longo do tempo
   */
  static calculateSentimentTrends(
    analyses: SentimentAnalysis[],
    months: number = 6
  ): Array<{
    period: string;
    distribution: SentimentDistribution;
    totalAnalyses: number;
  }> {
    const trends: Array<{
      period: string;
      distribution: SentimentDistribution;
      totalAnalyses: number;
    }> = [];
    
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthAnalyses = analyses.filter(analysis => {
        const analysisDate = new Date(analysis.createdAt);
        return analysisDate >= date && analysisDate < nextDate;
      });

      const distribution = this.calculateSentimentDistribution(monthAnalyses);
      
      trends.push({
        period: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        distribution,
        totalAnalyses: monthAnalyses.length
      });
    }

    return trends;
  }

  /**
   * Gera insights baseados na análise de sentimento
   */
  static generateSentimentInsights(
    analyses: SentimentAnalysis[],
    evaluations: Evaluation[]
  ): string[] {
    const insights: string[] = [];
    
    if (analyses.length === 0) {
      insights.push('📊 Nenhuma análise de sentimento disponível ainda');
      return insights;
    }

    const stats = this.calculateSentimentStats(analyses);
    const conflicting = this.getConflictingAnalyses(analyses, evaluations);
    const lowConfidence = this.getLowConfidenceAnalyses(analyses);
    
    // Insights sobre distribuição
    if (stats.distribution.positive > 70) {
      insights.push('😊 Excelente! Mais de 70% dos comentários têm sentimento positivo');
    } else if (stats.distribution.negative > 30) {
      insights.push('😟 Atenção: Mais de 30% dos comentários têm sentimento negativo');
    }

    // Insights sobre confiança
    if (stats.averageConfidence > 0.8) {
      insights.push('🎯 Alta confiança nas análises de IA (>80%)');
    } else if (stats.averageConfidence < 0.6) {
      insights.push('⚠️ Confiança baixa nas análises - revisar comentários manualmente');
    }

    // Insights sobre conflitos
    if (conflicting.length > 0) {
      insights.push(`🔍 ${conflicting.length} análises conflitantes encontradas - revisar manualmente`);
    }

    // Insights sobre análises de baixa confiança
    if (lowConfidence.length > analyses.length * 0.2) {
      insights.push('📝 Muitas análises com baixa confiança - considerar melhorar prompts de IA');
    }

    // Insights sobre tendências
    const trends = this.calculateSentimentTrends(analyses, 3);
    if (trends.length >= 2) {
      const latest = trends[trends.length - 1];
      const previous = trends[trends.length - 2];
      
      const positiveChange = latest.distribution.positive - previous.distribution.positive;
      if (positiveChange > 10) {
        insights.push('📈 Melhoria no sentimento dos comentários no último mês');
      } else if (positiveChange < -10) {
        insights.push('📉 Piora no sentimento dos comentários no último mês');
      }
    }

    return insights;
  }

  /**
   * Valida se uma análise precisa ser refeita
   */
  static needsReanalysis(
    analysis: SentimentAnalysis,
    evaluation: Evaluation,
    confidenceThreshold: number = 0.6
  ): boolean {
    // Baixa confiança
    if (analysis.confidence < confidenceThreshold) return true;
    
    // Análise muito antiga (mais de 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (new Date(analysis.createdAt) < sixMonthsAgo) return true;
    
    // Conflito entre sentimento e nota
    if (analysis.sentiment === 'negative' && evaluation.nota >= 4) return true;
    if (analysis.sentiment === 'positive' && evaluation.nota <= 2) return true;
    
    return false;
  }

  /**
   * Prioriza avaliações para análise
   */
  static prioritizeForAnalysis(
    evaluations: Evaluation[],
    existingAnalyses: SentimentAnalysis[]
  ): Evaluation[] {
    const analyzedIds = new Set(existingAnalyses.map(a => a.evaluationId));
    const unanalyzed = evaluations.filter(evaluation => !analyzedIds.has(evaluation.id));
    
    // Priorizar por:
    // 1. Avaliações com comentários mais longos
    // 2. Avaliações mais recentes
    // 3. Notas extremas (1-2 ou 5)
    return unanalyzed.sort((a, b) => {
      // Prioridade por tamanho do comentário
      const aCommentLength = a.comentario?.length || 0;
      const bCommentLength = b.comentario?.length || 0;
      if (aCommentLength !== bCommentLength) {
        return bCommentLength - aCommentLength;
      }
      
      // Prioridade por data
      const aDate = new Date(a.data).getTime();
      const bDate = new Date(b.data).getTime();
      if (aDate !== bDate) {
        return bDate - aDate;
      }
      
      // Prioridade por notas extremas
      const aExtreme = a.nota <= 2 || a.nota >= 5 ? 1 : 0;
      const bExtreme = b.nota <= 2 || b.nota >= 5 ? 1 : 0;
      return bExtreme - aExtreme;
    });
  }

  /**
   * Validar dados de análise de sentimento
   */
  static validateSentimentAnalysis(analysis: unknown): {
    isValid: boolean;
    data: SentimentAnalysisInput | null;
    errors: Record<string, string> | null;
  } {
    return validateFormData(SentimentAnalysisSchema, analysis);
  }

  /**
   * Sanitizar dados de análise
   */
  static sanitizeAnalysisData(data: any): any {
    return {
      ...data,
      summary: data.summary ? sanitizeString(data.summary) : data.summary,
      originalComment: data.originalComment ? sanitizeString(data.originalComment) : data.originalComment
    };
  }

  /**
   * Validar se uma análise precisa ser refeita
   */
  static shouldReanalyze(
    analysis: SentimentAnalysis,
    minConfidenceThreshold: number = 0.7,
    maxAgeInDays: number = 30
  ): boolean {
    // Valida parâmetros
    if (minConfidenceThreshold < 0 || minConfidenceThreshold > 1) {
      throw new Error('Threshold de confiança deve estar entre 0 e 1');
    }
    
    if (maxAgeInDays < 1) {
      throw new Error('Idade máxima deve ser pelo menos 1 dia');
    }
    
    // Verifica confiança baixa
    if (analysis.confidence < minConfidenceThreshold) {
      return true;
    }
    
    // Verifica idade da análise
    const analysisDate = new Date(analysis.createdAt);
    const now = new Date();
    const daysDifference = Math.floor((now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDifference > maxAgeInDays;
  }

  /**
   * Calcular score de qualidade da análise
   */
  static calculateAnalysisQualityScore(analysis: SentimentAnalysis): number {
    let score = 0;
    
    // Pontuação baseada na confiança (0-40 pontos)
    score += analysis.confidence * 40;
    
    // Pontuação baseada no tamanho do resumo (0-20 pontos)
    const summaryLength = analysis.summary.length;
    if (summaryLength >= 50 && summaryLength <= 150) {
      score += 20;
    } else if (summaryLength >= 20) {
      score += 10;
    }
    
    // Pontuação baseada na consistência do sentimento (0-20 pontos)
    const commentLength = analysis.originalComment.length;
    if (commentLength > 0) {
      // Análise simples de consistência baseada em palavras-chave
      const positiveWords = ['bom', 'ótimo', 'excelente', 'satisfeito', 'recomendo'];
      const negativeWords = ['ruim', 'péssimo', 'insatisfeito', 'problema', 'reclamação'];
      
      const commentLower = analysis.originalComment.toLowerCase();
      const hasPositiveWords = positiveWords.some(word => commentLower.includes(word));
      const hasNegativeWords = negativeWords.some(word => commentLower.includes(word));
      
      if (analysis.sentiment === 'positive' && hasPositiveWords && !hasNegativeWords) {
        score += 20;
      } else if (analysis.sentiment === 'negative' && hasNegativeWords && !hasPositiveWords) {
        score += 20;
      } else if (analysis.sentiment === 'neutral' && !hasPositiveWords && !hasNegativeWords) {
        score += 15;
      } else {
        score += 5; // Pontuação baixa para inconsistência
      }
    }
    
    // Pontuação baseada na idade da análise (0-20 pontos)
    const analysisDate = new Date(analysis.createdAt);
    const now = new Date();
    const daysDifference = Math.floor((now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference <= 7) {
      score += 20;
    } else if (daysDifference <= 30) {
      score += 15;
    } else if (daysDifference <= 90) {
      score += 10;
    } else {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }
}