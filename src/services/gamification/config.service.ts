import type { GamificationConfig, AchievementConfig, LevelTrackConfig } from '@/lib/types';

export interface GamificationSettings {
  gamificationConfig: GamificationConfig;
  achievementConfig: AchievementConfig;
  levelTrackConfig: LevelTrackConfig;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigService {
  /**
   * Valores padrão para configuração de gamificação
   */
  static getDefaultGamificationConfig(): GamificationConfig {
    return {
      id: 'default',
      pointsPerEvaluation: {
        rating1: -50,
        rating2: -25,
        rating3: 0,
        rating4: 25,
        rating5: 50
      },
      multipliers: {
        firstEvaluationOfDay: 1.2,
        weekendEvaluation: 1.1,
        perfectWeek: 2.0,
        consistencyBonus: 1.5
      },
      sessions: {
        minEvaluationsForBonus: 10,
        bonusMultiplier: 1.3,
        sessionTimeoutMinutes: 30
      },
      achievements: {
        enableAchievements: true,
        notifyOnUnlock: true,
        showProgress: true
      },
      levels: {
        enableLevels: true,
        showProgress: true,
        maxLevel: 100
      },
      leaderboard: {
        enableLeaderboard: true,
        showRankings: true,
        updateFrequencyMinutes: 15
      }
    };
  }

  /**
   * Valores padrão para configuração de conquistas
   */
  static getDefaultAchievementConfig(): AchievementConfig {
    return {
      id: 'default',
      categories: {
        evaluation: {
          enabled: true,
          weight: 1.0,
          description: 'Conquistas relacionadas a avaliações'
        },
        consistency: {
          enabled: true,
          weight: 1.2,
          description: 'Conquistas de consistência'
        },
        excellence: {
          enabled: true,
          weight: 1.5,
          description: 'Conquistas de excelência'
        },
        social: {
          enabled: true,
          weight: 1.1,
          description: 'Conquistas sociais e de equipe'
        }
      },
      difficulty: {
        easy: {
          xpReward: 50,
          color: '#4CAF50',
          icon: '🌟'
        },
        medium: {
          xpReward: 100,
          color: '#FF9800',
          icon: '🏆'
        },
        hard: {
          xpReward: 200,
          color: '#9C27B0',
          icon: '💎'
        },
        legendary: {
          xpReward: 500,
          color: '#FFD700',
          icon: '👑'
        }
      },
      notifications: {
        showPopup: true,
        playSound: true,
        showInFeed: true,
        emailNotification: false
      }
    };
  }

  /**
   * Valores padrão para configuração de trilha de níveis
   */
  static getDefaultLevelTrackConfig(): LevelTrackConfig {
    return {
      id: 'default',
      xpFormula: {
        baseXp: 100,
        multiplier: 1.5,
        formula: 'quadratic' // linear, quadratic, exponential
      },
      rewards: {
        enableRewards: true,
        rewardTypes: ['badge', 'title', 'privilege', 'bonus'],
        autoGenerate: true
      },
      progression: {
        showProgress: true,
        showNextReward: true,
        showEstimatedTime: true,
        highlightMilestones: true
      },
      milestones: [5, 10, 15, 20, 25, 30, 40, 50, 75, 100],
      display: {
        theme: 'modern',
        showAnimations: true,
        compactMode: false
      }
    };
  }

  /**
   * Mescla configurações com valores padrão
   */
  static mergeWithDefaults<T extends Record<string, any>>(
    userConfig: Partial<T>,
    defaultConfig: T
  ): T {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (userConfig[key] !== undefined) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
          merged[key] = this.mergeWithDefaults(
            userConfig[key] as Record<string, any>,
            defaultConfig[key] as Record<string, any>
          ) as T[Extract<keyof T, string>];
        } else {
          merged[key] = userConfig[key] as T[Extract<keyof T, string>];
        }
      }
    }
    
    return merged;
  }

  /**
   * Valida configuração de gamificação
   */
  static validateGamificationConfig(config: Partial<GamificationConfig>): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar pontos por avaliação
    if (config.pointsPerEvaluation) {
      const points = config.pointsPerEvaluation;
      
      if (points.rating5 <= points.rating4) {
        errors.push('Pontos para rating 5 devem ser maiores que rating 4');
      }
      
      if (points.rating4 <= points.rating3) {
        errors.push('Pontos para rating 4 devem ser maiores que rating 3');
      }
      
      if (points.rating1 >= 0) {
        warnings.push('Considere usar pontos negativos para rating 1 para desencorajar baixas avaliações');
      }
      
      if (points.rating5 < 10) {
        warnings.push('Pontos para rating 5 podem ser muito baixos para motivar');
      }
    }

    // Validar multiplicadores
    if (config.multipliers) {
      const mult = config.multipliers;
      
      Object.entries(mult).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (value < 0) {
            errors.push(`Multiplicador ${key} não pode ser negativo`);
          }
          
          if (value > 10) {
            warnings.push(`Multiplicador ${key} pode ser muito alto (${value})`);
          }
        }
      });
    }

    // Validar configurações de sessão
    if (config.sessions) {
      const sessions = config.sessions;
      
      if (sessions.minEvaluationsForBonus && sessions.minEvaluationsForBonus < 1) {
        errors.push('Mínimo de avaliações para bônus deve ser pelo menos 1');
      }
      
      if (sessions.sessionTimeoutMinutes && sessions.sessionTimeoutMinutes < 5) {
        warnings.push('Timeout de sessão muito baixo pode causar problemas de usabilidade');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida configuração de conquistas
   */
  static validateAchievementConfig(config: Partial<AchievementConfig>): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar categorias
    if (config.categories) {
      Object.entries(config.categories).forEach(([categoryName, categoryConfig]) => {
        if (categoryConfig.weight < 0) {
          errors.push(`Peso da categoria ${categoryName} não pode ser negativo`);
        }
        
        if (categoryConfig.weight > 5) {
          warnings.push(`Peso da categoria ${categoryName} pode ser muito alto`);
        }
      });
    }

    // Validar dificuldades
    if (config.difficulty) {
      const difficulties = Object.entries(config.difficulty);
      
      for (let i = 1; i < difficulties.length; i++) {
        const [prevName, prevDiff] = difficulties[i - 1];
        const [currName, currDiff] = difficulties[i];
        
        if (currDiff.xpReward <= prevDiff.xpReward) {
          warnings.push(`Recompensa XP para ${currName} deveria ser maior que ${prevName}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida configuração de trilha de níveis
   */
  static validateLevelTrackConfig(config: Partial<LevelTrackConfig>): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar fórmula de XP
    if (config.xpFormula) {
      const formula = config.xpFormula;
      
      if (formula.baseXp && formula.baseXp <= 0) {
        errors.push('XP base deve ser maior que zero');
      }
      
      if (formula.multiplier && formula.multiplier <= 0) {
        errors.push('Multiplicador deve ser maior que zero');
      }
      
      if (formula.multiplier && formula.multiplier > 3) {
        warnings.push('Multiplicador muito alto pode tornar progressão muito rápida');
      }
    }

    // Validar marcos
    if (config.milestones) {
      const milestones = config.milestones;
      
      if (milestones.length === 0) {
        warnings.push('Considere adicionar marcos para melhor experiência do usuário');
      }
      
      // Verificar se estão em ordem crescente
      for (let i = 1; i < milestones.length; i++) {
        if (milestones[i] <= milestones[i - 1]) {
          errors.push('Marcos devem estar em ordem crescente');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida todas as configurações
   */
  static validateAllConfigs(settings: Partial<GamificationSettings>): ConfigValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    if (settings.gamificationConfig) {
      const result = this.validateGamificationConfig(settings.gamificationConfig);
      allErrors.push(...result.errors.map(e => `Gamificação: ${e}`));
      allWarnings.push(...result.warnings.map(w => `Gamificação: ${w}`));
    }

    if (settings.achievementConfig) {
      const result = this.validateAchievementConfig(settings.achievementConfig);
      allErrors.push(...result.errors.map(e => `Conquistas: ${e}`));
      allWarnings.push(...result.warnings.map(w => `Conquistas: ${w}`));
    }

    if (settings.levelTrackConfig) {
      const result = this.validateLevelTrackConfig(settings.levelTrackConfig);
      allErrors.push(...result.errors.map(e => `Níveis: ${e}`));
      allWarnings.push(...result.warnings.map(w => `Níveis: ${w}`));
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Gera configurações otimizadas baseadas em métricas
   */
  static generateOptimizedConfig(
    currentConfig: GamificationSettings,
    metrics: {
      averageEvaluationsPerDay: number;
      averageRating: number;
      participationRate: number;
      retentionRate: number;
    }
  ): Partial<GamificationSettings> {
    const optimized: Partial<GamificationSettings> = {};

    // Ajustar pontos baseado na participação
    if (metrics.participationRate < 0.5) {
      // Baixa participação - aumentar recompensas
      optimized.gamificationConfig = {
        ...currentConfig.gamificationConfig,
        pointsPerEvaluation: {
          ...currentConfig.gamificationConfig.pointsPerEvaluation,
          rating4: Math.round(currentConfig.gamificationConfig.pointsPerEvaluation.rating4 * 1.2),
          rating5: Math.round(currentConfig.gamificationConfig.pointsPerEvaluation.rating5 * 1.2)
        }
      };
    }

    // Ajustar multiplicadores baseado na retenção
    if (metrics.retentionRate < 0.7) {
      // Baixa retenção - aumentar bônus de consistência
      optimized.gamificationConfig = {
        ...optimized.gamificationConfig,
        multipliers: {
          ...currentConfig.gamificationConfig.multipliers,
          consistencyBonus: Math.min(2.0, currentConfig.gamificationConfig.multipliers.consistencyBonus * 1.1),
          perfectWeek: Math.min(3.0, currentConfig.gamificationConfig.multipliers.perfectWeek * 1.1)
        }
      };
    }

    // Ajustar dificuldade das conquistas baseado no rating médio
    if (metrics.averageRating < 3.5) {
      // Rating baixo - facilitar conquistas
      optimized.achievementConfig = {
        ...currentConfig.achievementConfig,
        difficulty: {
          ...currentConfig.achievementConfig.difficulty,
          easy: {
            ...currentConfig.achievementConfig.difficulty.easy,
            xpReward: Math.round(currentConfig.achievementConfig.difficulty.easy.xpReward * 1.3)
          }
        }
      };
    }

    return optimized;
  }

  /**
   * Exporta configurações para backup
   */
  static exportConfig(settings: GamificationSettings): string {
    return JSON.stringify({
      ...settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Importa configurações de backup
   */
  static importConfig(configJson: string): {
    success: boolean;
    settings?: GamificationSettings;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(configJson);
      
      // Validar estrutura básica
      if (!parsed.gamificationConfig || !parsed.achievementConfig || !parsed.levelTrackConfig) {
        return {
          success: false,
          error: 'Formato de configuração inválido'
        };
      }

      const settings: GamificationSettings = {
        gamificationConfig: parsed.gamificationConfig,
        achievementConfig: parsed.achievementConfig,
        levelTrackConfig: parsed.levelTrackConfig
      };

      // Validar configurações
      const validation = this.validateAllConfigs(settings);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Configuração inválida: ${validation.errors.join(', ')}`
        };
      }

      return {
        success: true,
        settings
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao analisar JSON de configuração'
      };
    }
  }

  /**
   * Compara duas configurações e retorna diferenças
   */
  static compareConfigs(
    config1: GamificationSettings,
    config2: GamificationSettings
  ): {
    differences: Array<{
      path: string;
      oldValue: any;
      newValue: any;
    }>;
    hasChanges: boolean;
  } {
    const differences: Array<{
      path: string;
      oldValue: any;
      newValue: any;
    }> = [];

    const compareObjects = (obj1: any, obj2: any, path: string = '') => {
      for (const key in obj1) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj2)) {
          differences.push({
            path: currentPath,
            oldValue: obj1[key],
            newValue: undefined
          });
        } else if (typeof obj1[key] === 'object' && obj1[key] !== null && !Array.isArray(obj1[key])) {
          compareObjects(obj1[key], obj2[key], currentPath);
        } else if (obj1[key] !== obj2[key]) {
          differences.push({
            path: currentPath,
            oldValue: obj1[key],
            newValue: obj2[key]
          });
        }
      }
      
      // Verificar chaves que existem apenas no obj2
      for (const key in obj2) {
        if (!(key in obj1)) {
          const currentPath = path ? `${path}.${key}` : key;
          differences.push({
            path: currentPath,
            oldValue: undefined,
            newValue: obj2[key]
          });
        }
      }
    };

    compareObjects(config1, config2);

    return {
      differences,
      hasChanges: differences.length > 0
    };
  }
}