import type { Evaluation, Attendant } from '@/lib/types';
import { 
  EvaluationSchema, 
  CreateEvaluationSchema, 
  UpdateEvaluationSchema,
  EvaluationFiltersSchema,
  type EvaluationInput,
  type CreateEvaluationInput,
  type UpdateEvaluationInput,
  type EvaluationFiltersInput
} from '@/lib/validation';
import { validateAndTransform, validateFormData } from '@/lib/validation-utils';

export interface EvaluationFilters {
  attendantId?: string;
  rating?: number;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
  hasComment?: boolean;
}

export interface EvaluationStats {
  total: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  satisfactionRate: number;
  commentsCount: number;
  lastEvaluation?: string;
  trend: 'up' | 'down' | 'stable';
}

export interface EvaluationSummary {
  evaluation: Evaluation;
  attendantName: string;
}

export class EvaluationsService {
  /**
   * Filtra avaliações baseado nos critérios fornecidos
   */
  static filterEvaluations(
    evaluations: Evaluation[],
    filters: EvaluationFiltersInput
  ): Evaluation[] {
    // Valida os filtros
    const validatedFilters = validateAndTransform(EvaluationFiltersSchema, filters);
    return evaluations.filter(evaluation => {
      // Filtro por atendente
      if (validatedFilters.attendantId && evaluation.attendantId !== validatedFilters.attendantId) {
        return false;
      }

      // Filtro por nota
      if (validatedFilters.rating && evaluation.nota !== validatedFilters.rating) {
        return false;
      }

      // Filtro por data inicial
      if (validatedFilters.dateFrom) {
        const evalDate = new Date(evaluation.data);
        const fromDate = new Date(validatedFilters.dateFrom);
        if (evalDate < fromDate) {
          return false;
        }
      }

      // Filtro por data final
      if (validatedFilters.dateTo) {
        const evalDate = new Date(evaluation.data);
        const toDate = new Date(validatedFilters.dateTo);
        if (evalDate > toDate) {
          return false;
        }
      }

      // Filtro por termo de busca (comentário)
      if (validatedFilters.searchTerm && evaluation.comentario) {
        const searchLower = validatedFilters.searchTerm.toLowerCase();
        const commentLower = evaluation.comentario.toLowerCase();
        if (!commentLower.includes(searchLower)) {
          return false;
        }
      }

      // Filtro por nota mínima
      if (validatedFilters.minRating && evaluation.nota < validatedFilters.minRating) {
        return false;
      }

      // Filtro por nota máxima
      if (validatedFilters.maxRating && evaluation.nota > validatedFilters.maxRating) {
        return false;
      }

      // Filtro por presença de comentário
      if (validatedFilters.hasComment !== undefined) {
        const hasComment = evaluation.comentario && evaluation.comentario.trim().length > 0;
        if (validatedFilters.hasComment !== hasComment) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calcula estatísticas das avaliações
   */
  static calculateStats(evaluations: Evaluation[]): EvaluationStats {
    if (evaluations.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        ratingDistribution: {},
        satisfactionRate: 0,
        commentsCount: 0,
        trend: 'stable'
      };
    }

    const total = evaluations.length;
    const totalRating = evaluations.reduce((sum, evaluation) => sum + evaluation.nota, 0);
    const averageRating = totalRating / total;

    // Distribuição de notas
    const ratingDistribution: Record<number, number> = {};
    evaluations.forEach(evaluation => {
      ratingDistribution[evaluation.nota] = (ratingDistribution[evaluation.nota] || 0) + 1;
    });

    // Taxa de satisfação (notas 4 e 5)
    const satisfiedCount = evaluations.filter(evaluation => evaluation.nota >= 4).length;
    const satisfactionRate = (satisfiedCount / total) * 100;

    // Contagem de comentários
    const commentsCount = evaluations.filter(evaluation => evaluation.comentario && evaluation.comentario.trim() !== '').length;

    // Última avaliação
    const sortedByDate = [...evaluations].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const lastEvaluation = sortedByDate[0]?.data;

    // Tendência (comparar últimos 30 dias com 30 dias anteriores)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentEvals = evaluations.filter(evaluation => new Date(evaluation.data) >= thirtyDaysAgo);
    const previousEvals = evaluations.filter(evaluation => {
      const date = new Date(evaluation.data);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentEvals.length > 0 && previousEvals.length > 0) {
      const recentAvg = recentEvals.reduce((sum, evaluation) => sum + evaluation.nota, 0) / recentEvals.length;
      const previousAvg = previousEvals.reduce((sum, evaluation) => sum + evaluation.nota, 0) / previousEvals.length;
      
      if (recentAvg > previousAvg + 0.1) trend = 'up';
      else if (recentAvg < previousAvg - 0.1) trend = 'down';
    }

    return {
      total,
      averageRating,
      ratingDistribution,
      satisfactionRate,
      commentsCount,
      lastEvaluation,
      trend
    };
  }

  /**
   * Ordena avaliações por critério
   */
  static sortEvaluations(
    evaluations: Evaluation[],
    sortBy: 'date' | 'rating' | 'attendant',
    order: 'asc' | 'desc' = 'desc'
  ): Evaluation[] {
    return [...evaluations].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.data).getTime() - new Date(b.data).getTime();
          break;
        case 'rating':
          comparison = a.nota - b.nota;
          break;
        case 'attendant':
          comparison = a.attendantId.localeCompare(b.attendantId);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Cria resumo de avaliações com nomes dos atendentes
   */
  static createEvaluationSummaries(
    evaluations: Evaluation[],
    attendants: Attendant[]
  ): EvaluationSummary[] {
    const attendantMap = new Map(attendants.map(att => [att.id, att.name]));

    return evaluations.map(evaluation => ({
      evaluation,
      attendantName: attendantMap.get(evaluation.attendantId) || 'Atendente não encontrado'
    }));
  }

  /**
   * Busca avaliações por termo
   */
  static searchEvaluations(
    evaluations: Evaluation[],
    attendants: Attendant[],
    searchTerm: string
  ): Evaluation[] {
    if (!searchTerm.trim()) return evaluations;

    const searchLower = searchTerm.toLowerCase();
    const attendantMap = new Map(attendants.map(att => [att.id, att.name.toLowerCase()]));

    return evaluations.filter(evaluation => {
      // Busca no comentário
      if (evaluation.comentario && evaluation.comentario.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Busca no nome do atendente
      const attendantName = attendantMap.get(evaluation.attendantId);
      if (attendantName && attendantName.includes(searchLower)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Obtém avaliações recentes
   */
  static getRecentEvaluations(
    evaluations: Evaluation[],
    limit: number = 5
  ): Evaluation[] {
    return this.sortEvaluations(evaluations, 'date', 'desc').slice(0, limit);
  }

  /**
   * Validar dados de avaliação para criação
   */
  static validateCreateEvaluation(evaluation: unknown): {
    isValid: boolean;
    data: CreateEvaluationInput | null;
    errors: Record<string, string> | null;
  } {
    return validateFormData(CreateEvaluationSchema, evaluation);
  }

  /**
   * Validar dados de avaliação para atualização
   */
  static validateUpdateEvaluation(evaluation: unknown): {
    isValid: boolean;
    data: UpdateEvaluationInput | null;
    errors: Record<string, string> | null;
  } {
    return validateFormData(UpdateEvaluationSchema, evaluation);
  }

  /**
   * Validar avaliação completa
   */
  static validateEvaluation(evaluation: unknown): {
    isValid: boolean;
    data: EvaluationInput | null;
    errors: Record<string, string> | null;
  } {
    return validateFormData(EvaluationSchema, evaluation);
  }

  /**
   * Buscar avaliação por ID
   */
  static getById(evaluations: Evaluation[], id: string): Evaluation | undefined {
    return evaluations.find(evaluation => evaluation.id === id);
  }

  /**
   * Filtrar avaliações por atendente
   */
  static filterByAttendant(evaluations: Evaluation[], attendantId: string): Evaluation[] {
    return evaluations.filter(evaluation => evaluation.attendantId === attendantId);
  }

  /**
   * Filtrar avaliações (alias para filterEvaluations)
   */
  static filter(evaluations: Evaluation[], filters: EvaluationFiltersInput): Evaluation[] {
    return this.filterEvaluations(evaluations, filters);
  }

  /**
   * Buscar avaliações (alias para searchEvaluations)
   */
  static search(evaluations: Evaluation[], searchTerm: string): Evaluation[] {
    // Para manter compatibilidade, vamos buscar apenas no comentário
    if (!searchTerm.trim()) return evaluations;
    
    const searchLower = searchTerm.toLowerCase();
    return evaluations.filter(evaluation => {
      return evaluation.comentario && evaluation.comentario.toLowerCase().includes(searchLower);
    });
  }

  /**
   * Obter avaliações recentes (alias para getRecentEvaluations)
   */
  static getRecent(evaluations: Evaluation[], limit: number = 10): Evaluation[] {
    return this.getRecentEvaluations(evaluations, limit);
  }

  /**
   * Calcular estatísticas básicas (interface compatível com hooks)
   */
  static calculateBasicStats(evaluations: Evaluation[]): {
    totalEvaluations: number;
    averageRating: number;
    satisfactionRate: number;
    commentsCount: number;
  } {
    const stats = this.calculateStats(evaluations);
    return {
      totalEvaluations: stats.total,
      averageRating: stats.averageRating,
      satisfactionRate: stats.satisfactionRate,
      commentsCount: stats.commentsCount
    };
  }
}