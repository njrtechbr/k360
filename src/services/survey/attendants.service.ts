import type { Attendant, Evaluation } from '@/lib/types';
import { 
  AttendantSchema, 
  CreateAttendantSchema, 
  UpdateAttendantSchema,
  type AttendantInput,
  type CreateAttendantInput,
  type UpdateAttendantInput
} from '@/lib/validation';
import { validateFormData, isValidCPF, formatCPF, formatPhone, sanitizeString } from '@/lib/validation-utils';

export interface AttendantStats {
  totalEvaluations: number;
  averageRating: number;
  satisfactionRate: number;
  ratingDistribution: Record<number, number>;
  commentsCount: number;
  lastEvaluation?: string;
  trend: 'up' | 'down' | 'stable';
}

export interface AttendantPerformance {
  attendant: Attendant;
  stats: AttendantStats;
  rank?: number;
}

export class AttendantsService {
  /**
   * Calcula estatísticas de um atendente específico
   */
  static calculateAttendantStats(
    attendantId: string,
    evaluations: Evaluation[]
  ): AttendantStats {
    const attendantEvaluations = evaluations.filter(evaluation => evaluation.attendantId === attendantId);

    if (attendantEvaluations.length === 0) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        satisfactionRate: 0,
        ratingDistribution: {},
        commentsCount: 0,
        trend: 'stable'
      };
    }

    const totalEvaluations = attendantEvaluations.length;
    const totalRating = attendantEvaluations.reduce((sum, evaluation) => sum + evaluation.nota, 0);
    const averageRating = totalRating / totalEvaluations;

    // Distribuição de notas
    const ratingDistribution: Record<number, number> = {};
    attendantEvaluations.forEach(evaluation => {
      ratingDistribution[evaluation.nota] = (ratingDistribution[evaluation.nota] || 0) + 1;
    });

    // Taxa de satisfação (notas 4 e 5)
    const satisfiedCount = attendantEvaluations.filter(evaluation => evaluation.nota >= 4).length;
    const satisfactionRate = (satisfiedCount / totalEvaluations) * 100;

    // Contagem de comentários
    const commentsCount = attendantEvaluations.filter(
      evaluation => evaluation.comentario && evaluation.comentario.trim() !== ''
    ).length;

    // Última avaliação
    const sortedByDate = [...attendantEvaluations].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    const lastEvaluation = sortedByDate[0]?.data;

    // Tendência (comparar últimos 30 dias com 30 dias anteriores)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentEvals = attendantEvaluations.filter(evaluation => new Date(evaluation.data) >= thirtyDaysAgo);
    const previousEvals = attendantEvaluations.filter(evaluation => {
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
      totalEvaluations,
      averageRating,
      satisfactionRate,
      ratingDistribution,
      commentsCount,
      lastEvaluation,
      trend
    };
  }

  /**
   * Obtém performance de todos os atendentes
   */
  static getAttendantsPerformance(
    attendants: Attendant[],
    evaluations: Evaluation[]
  ): AttendantPerformance[] {
    return attendants.map(attendant => ({
      attendant,
      stats: this.calculateAttendantStats(attendant.id, evaluations)
    }));
  }

  /**
   * Obtém os melhores atendentes por nota média
   */
  static getTopRatedAttendants(
    attendants: Attendant[],
    evaluations: Evaluation[],
    limit: number = 5
  ): AttendantPerformance[] {
    const performances = this.getAttendantsPerformance(attendants, evaluations)
      .filter(perf => perf.stats.totalEvaluations > 0)
      .sort((a, b) => b.stats.averageRating - a.stats.averageRating)
      .slice(0, limit);

    return performances.map((perf, index) => ({
      ...perf,
      rank: index + 1
    }));
  }

  /**
   * Obtém os atendentes mais avaliados
   */
  static getMostEvaluatedAttendants(
    attendants: Attendant[],
    evaluations: Evaluation[],
    limit: number = 5
  ): AttendantPerformance[] {
    const performances = this.getAttendantsPerformance(attendants, evaluations)
      .filter(perf => perf.stats.totalEvaluations > 0)
      .sort((a, b) => b.stats.totalEvaluations - a.stats.totalEvaluations)
      .slice(0, limit);

    return performances.map((perf, index) => ({
      ...perf,
      rank: index + 1
    }));
  }

  /**
   * Filtra atendentes por critérios
   */
  static filterAttendants(
    attendants: Attendant[],
    filters: {
      status?: string;
      setor?: string;
      searchTerm?: string;
    }
  ): Attendant[] {
    // Sanitiza o termo de busca
    const sanitizedSearchTerm = filters.searchTerm ? sanitizeString(filters.searchTerm.toLowerCase()) : '';
    
    return attendants.filter(attendant => {
      // Filtro por status
      if (filters.status && attendant.status !== filters.status) {
        return false;
      }

      // Filtro por setor
      if (filters.setor && attendant.setor !== filters.setor) {
        return false;
      }

      // Filtro por termo de busca
      if (sanitizedSearchTerm) {
        const nameMatch = sanitizeString(attendant.name.toLowerCase()).includes(sanitizedSearchTerm);
        const emailMatch = attendant.email.toLowerCase().includes(sanitizedSearchTerm);
        const funcaoMatch = attendant.funcao.toLowerCase().includes(sanitizedSearchTerm);
        
        if (!nameMatch && !emailMatch && !funcaoMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Obtém atendentes com baixa performance
   */
  static getLowPerformanceAttendants(
    attendants: Attendant[],
    evaluations: Evaluation[],
    threshold: number = 3.0
  ): AttendantPerformance[] {
    // Valida o threshold
    if (threshold < 1 || threshold > 5) {
      throw new Error('Threshold deve estar entre 1 e 5');
    }
    
    return this.getAttendantsPerformance(attendants, evaluations)
      .filter(perf => 
        perf.stats.totalEvaluations >= 3 && 
        perf.stats.averageRating < threshold
      )
      .sort((a, b) => a.stats.averageRating - b.stats.averageRating);
  }

  /**
   * Obtém estatísticas gerais dos atendentes
   */
  static getGeneralStats(
    attendants: Attendant[],
    evaluations: Evaluation[]
  ) {
    const activeAttendants = attendants.filter(att => att.status === 'Ativo');
    const evaluatedAttendants = attendants.filter(att => 
      evaluations.some(evaluation => evaluation.attendantId === att.id)
    );

    const performances = this.getAttendantsPerformance(attendants, evaluations)
      .filter(perf => perf.stats.totalEvaluations > 0);

    const totalRating = performances.reduce((sum, perf) => 
      sum + (perf.stats.averageRating * perf.stats.totalEvaluations), 0
    );
    const totalEvaluations = performances.reduce((sum, perf) => 
      sum + perf.stats.totalEvaluations, 0
    );

    return {
      totalAttendants: attendants.length,
      activeAttendants: activeAttendants.length,
      evaluatedAttendants: evaluatedAttendants.length,
      averageRating: totalEvaluations > 0 ? totalRating / totalEvaluations : 0,
      bestAttendant: performances.length > 0 ? 
        performances.reduce((best, current) => 
          current.stats.averageRating > best.stats.averageRating ? current : best
        ) : null
    };
  }

  /**
   * Validar dados de atendente para criação
   */
  static validateCreateAttendant(attendant: unknown): {
    isValid: boolean;
    data: CreateAttendantInput | null;
    errors: Record<string, string> | null;
  } {
    const result = validateFormData(CreateAttendantSchema, attendant);
    
    // Validação adicional de CPF se fornecido
    if (result.isValid && result.data?.cpf && !isValidCPF(result.data.cpf)) {
      return {
        isValid: false,
        data: null,
        errors: { cpf: 'CPF inválido' }
      };
    }
    
    return result;
  }

  /**
   * Validar dados de atendente para atualização
   */
  static validateUpdateAttendant(attendant: unknown): {
    isValid: boolean;
    data: UpdateAttendantInput | null;
    errors: Record<string, string> | null;
  } {
    const result = validateFormData(UpdateAttendantSchema, attendant);
    
    // Validação adicional de CPF se fornecido
    if (result.isValid && result.data?.cpf && !isValidCPF(result.data.cpf)) {
      return {
        isValid: false,
        data: null,
        errors: { cpf: 'CPF inválido' }
      };
    }
    
    return result;
  }

  /**
   * Validar atendente completo
   */
  static validateAttendant(attendant: unknown): {
    isValid: boolean;
    data: AttendantInput | null;
    errors: Record<string, string> | null;
  } {
    const result = validateFormData(AttendantSchema, attendant);
    
    // Validação adicional de CPF
    if (result.isValid && result.data?.cpf && !isValidCPF(result.data.cpf)) {
      return {
        isValid: false,
        data: null,
        errors: { cpf: 'CPF inválido' }
      };
    }
    
    return result;
  }

  /**
   * Formatar dados de atendente para exibição
   */
  static formatAttendantData(attendant: Attendant): Attendant {
    return {
      ...attendant,
      name: sanitizeString(attendant.name),
      cpf: formatCPF(attendant.cpf),
      telefone: attendant.telefone ? formatPhone(attendant.telefone) : attendant.telefone
    };
  }

  /**
   * Sanitizar dados de entrada
   */
  static sanitizeAttendantInput(data: any): any {
    return {
      ...data,
      name: data.name ? sanitizeString(data.name) : data.name,
      funcao: data.funcao ? sanitizeString(data.funcao) : data.funcao,
      setor: data.setor ? sanitizeString(data.setor) : data.setor,
      portaria: data.portaria ? sanitizeString(data.portaria) : data.portaria,
      situacao: data.situacao ? sanitizeString(data.situacao) : data.situacao
    };
  }
}