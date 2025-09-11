import type { LevelReward } from "@/lib/types";

export interface LevelInfo {
  level: number;
  xpRequired: number;
  xpForNext: number;
  progress: number;
  reward?: LevelReward;
}

export interface LevelProgress {
  currentLevel: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressToNext: number;
  nextReward?: LevelReward;
  recentlyUnlocked: LevelReward[];
}

export class LevelsService {
  /**
   * Calcula o nível baseado no XP total
   */
  static getLevelFromXp(totalXp: number): number {
    if (totalXp < 0) return 1;

    // Fórmula: level = floor(sqrt(xp / 100)) + 1
    // Isso significa que cada nível requer progressivamente mais XP
    return Math.floor(Math.sqrt(totalXp / 100)) + 1;
  }

  /**
   * Calcula o XP necessário para um nível específico
   */
  static getXpRequiredForLevel(level: number): number {
    if (level <= 1) return 0;

    // Fórmula inversa: xp = (level - 1)² * 100
    return Math.pow(level - 1, 2) * 100;
  }

  /**
   * Calcula o XP necessário para o próximo nível
   */
  static getXpForNextLevel(currentLevel: number): number {
    return this.getXpRequiredForLevel(currentLevel + 1);
  }

  /**
   * Calcula informações detalhadas do nível atual
   */
  static getLevelInfo(totalXp: number, levelRewards: LevelReward[]): LevelInfo {
    const currentLevel = this.getLevelFromXp(totalXp);
    const xpRequired = this.getXpRequiredForLevel(currentLevel);
    const xpForNext = this.getXpForNextLevel(currentLevel);
    const xpInCurrentLevel = totalXp - xpRequired;
    const xpNeededForNext = xpForNext - xpRequired;
    const progress =
      xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;

    const reward = levelRewards.find((r) => r.level === currentLevel);

    return {
      level: currentLevel,
      xpRequired,
      xpForNext,
      progress: Math.min(100, Math.max(0, progress)),
      reward,
    };
  }

  /**
   * Calcula o progresso detalhado do nível
   */
  static getLevelProgress(
    totalXp: number,
    levelRewards: LevelReward[],
  ): LevelProgress {
    const currentLevel = this.getLevelFromXp(totalXp);
    const xpForCurrentLevel = this.getXpRequiredForLevel(currentLevel);
    const xpForNextLevel = this.getXpForNextLevel(currentLevel);
    const xpInCurrentLevel = totalXp - xpForCurrentLevel;
    const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
    const progressToNext =
      xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;

    const nextReward = levelRewards.find((r) => r.level === currentLevel + 1);
    const recentlyUnlocked = this.getRecentlyUnlockedRewards(
      totalXp,
      levelRewards,
    );

    return {
      currentLevel,
      currentXp: totalXp,
      xpForCurrentLevel,
      xpForNextLevel,
      progressToNext: Math.min(100, Math.max(0, progressToNext)),
      nextReward,
      recentlyUnlocked,
    };
  }

  /**
   * Encontra recompensas recentemente desbloqueadas
   */
  static getRecentlyUnlockedRewards(
    totalXp: number,
    levelRewards: LevelReward[],
    xpGained: number = 0,
  ): LevelReward[] {
    if (xpGained <= 0) return [];

    const previousXp = totalXp - xpGained;
    const previousLevel = this.getLevelFromXp(previousXp);
    const currentLevel = this.getLevelFromXp(totalXp);

    if (currentLevel <= previousLevel) return [];

    const unlockedRewards: LevelReward[] = [];

    for (let level = previousLevel + 1; level <= currentLevel; level++) {
      const reward = levelRewards.find((r) => r.level === level);
      if (reward) {
        unlockedRewards.push(reward);
      }
    }

    return unlockedRewards;
  }

  /**
   * Gera a trilha de recompensas (reward track)
   */
  static generateRewardTrack(
    levelRewards: LevelReward[],
    currentXp: number,
    maxLevels: number = 50,
  ): Array<{
    level: number;
    xpRequired: number;
    reward?: LevelReward;
    isUnlocked: boolean;
    isCurrent: boolean;
  }> {
    const currentLevel = this.getLevelFromXp(currentXp);
    const track: Array<{
      level: number;
      xpRequired: number;
      reward?: LevelReward;
      isUnlocked: boolean;
      isCurrent: boolean;
    }> = [];

    for (let level = 1; level <= maxLevels; level++) {
      const xpRequired = this.getXpRequiredForLevel(level);
      const reward = levelRewards.find((r) => r.level === level);
      const isUnlocked = currentXp >= xpRequired;
      const isCurrent = level === currentLevel;

      track.push({
        level,
        xpRequired,
        reward,
        isUnlocked,
        isCurrent,
      });
    }

    return track;
  }

  /**
   * Calcula estatísticas de níveis para um grupo de atendentes
   */
  static calculateLevelStats(
    attendantsXp: Array<{ id: string; totalXp: number }>,
  ): {
    averageLevel: number;
    levelDistribution: Record<number, number>;
    highestLevel: number;
    lowestLevel: number;
    totalLevels: number;
  } {
    if (attendantsXp.length === 0) {
      return {
        averageLevel: 1,
        levelDistribution: {},
        highestLevel: 1,
        lowestLevel: 1,
        totalLevels: 0,
      };
    }

    const levels = attendantsXp.map((a) => this.getLevelFromXp(a.totalXp));
    const levelDistribution: Record<number, number> = {};

    levels.forEach((level) => {
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    });

    const averageLevel =
      levels.reduce((sum, level) => sum + level, 0) / levels.length;
    const highestLevel = Math.max(...levels);
    const lowestLevel = Math.min(...levels);
    const totalLevels = Object.keys(levelDistribution).length;

    return {
      averageLevel,
      levelDistribution,
      highestLevel,
      lowestLevel,
      totalLevels,
    };
  }

  /**
   * Encontra próximas recompensas importantes
   */
  static getUpcomingRewards(
    currentXp: number,
    levelRewards: LevelReward[],
    count: number = 3,
  ): Array<{
    level: number;
    xpRequired: number;
    xpRemaining: number;
    reward: LevelReward;
  }> {
    const currentLevel = this.getLevelFromXp(currentXp);

    const upcomingRewards = levelRewards
      .filter((reward) => reward.level > currentLevel)
      .sort((a, b) => a.level - b.level)
      .slice(0, count)
      .map((reward) => {
        const xpRequired = this.getXpRequiredForLevel(reward.level);
        const xpRemaining = Math.max(0, xpRequired - currentXp);

        return {
          level: reward.level,
          xpRequired,
          xpRemaining,
          reward,
        };
      });

    return upcomingRewards;
  }

  /**
   * Valida configuração de recompensas de nível
   */
  static validateLevelRewards(levelRewards: LevelReward[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar se há níveis duplicados
    const levels = levelRewards.map((r) => r.level);
    const duplicateLevels = levels.filter(
      (level, index) => levels.indexOf(level) !== index,
    );

    if (duplicateLevels.length > 0) {
      errors.push(
        `Níveis duplicados encontrados: ${duplicateLevels.join(", ")}`,
      );
    }

    // Verificar se há níveis inválidos
    const invalidLevels = levelRewards.filter((r) => r.level < 1);
    if (invalidLevels.length > 0) {
      errors.push("Níveis devem ser maiores que 0");
    }

    // Verificar se há recompensas vazias
    const emptyRewards = levelRewards.filter(
      (r) => !r.title || r.title.trim().length === 0,
    );
    if (emptyRewards.length > 0) {
      warnings.push("Algumas recompensas não têm título");
    }

    // Verificar distribuição de níveis
    const sortedLevels = levels.sort((a, b) => a - b);
    const gaps: number[] = [];

    for (let i = 1; i < sortedLevels.length; i++) {
      const gap = sortedLevels[i] - sortedLevels[i - 1];
      if (gap > 5) {
        gaps.push(sortedLevels[i - 1]);
      }
    }

    if (gaps.length > 0) {
      warnings.push(`Grandes lacunas entre níveis após: ${gaps.join(", ")}`);
    }

    // Verificar se há recompensas nos primeiros níveis
    const hasEarlyRewards = levelRewards.some((r) => r.level <= 5);
    if (!hasEarlyRewards) {
      warnings.push(
        "Considere adicionar recompensas nos primeiros níveis para motivar novos usuários",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Gera sugestões de recompensas para níveis vazios
   */
  static generateRewardSuggestions(
    existingRewards: LevelReward[],
    maxLevel: number = 50,
  ): Array<{
    level: number;
    suggestedTitle: string;
    suggestedDescription: string;
    suggestedType: "badge" | "title" | "privilege" | "bonus";
  }> {
    const existingLevels = new Set(existingRewards.map((r) => r.level));
    const suggestions: Array<{
      level: number;
      suggestedTitle: string;
      suggestedDescription: string;
      suggestedType: "badge" | "title" | "privilege" | "bonus";
    }> = [];

    // Sugestões para marcos importantes
    const milestones = [5, 10, 15, 20, 25, 30, 40, 50];

    milestones.forEach((level) => {
      if (level <= maxLevel && !existingLevels.has(level)) {
        let title: string;
        let description: string;
        let type: "badge" | "title" | "privilege" | "bonus";

        if (level <= 10) {
          title = `Iniciante Nível ${level}`;
          description = `Parabéns por alcançar o nível ${level}!`;
          type = "badge";
        } else if (level <= 25) {
          title = `Experiente Nível ${level}`;
          description = `Você está se tornando um expert! Nível ${level} alcançado.`;
          type = "title";
        } else if (level <= 40) {
          title = `Veterano Nível ${level}`;
          description = `Impressionante! Você é um veterano de nível ${level}.`;
          type = "privilege";
        } else {
          title = `Mestre Nível ${level}`;
          description = `Você é um verdadeiro mestre! Nível ${level} conquistado.`;
          type = "bonus";
        }

        suggestions.push({
          level,
          suggestedTitle: title,
          suggestedDescription: description,
          suggestedType: type,
        });
      }
    });

    return suggestions.sort((a, b) => a.level - b.level);
  }

  /**
   * Calcula tempo estimado para próximo nível
   */
  static estimateTimeToNextLevel(
    currentXp: number,
    recentXpGains: number[],
    daysToAnalyze: number = 7,
  ): {
    daysEstimated: number;
    xpNeeded: number;
    averageDailyXp: number;
    confidence: "high" | "medium" | "low";
  } {
    const currentLevel = this.getLevelFromXp(currentXp);
    const xpForNextLevel = this.getXpForNextLevel(currentLevel);
    const xpNeeded = xpForNextLevel - currentXp;

    if (recentXpGains.length === 0) {
      return {
        daysEstimated: Infinity,
        xpNeeded,
        averageDailyXp: 0,
        confidence: "low",
      };
    }

    const averageDailyXp =
      recentXpGains.reduce((sum, xp) => sum + xp, 0) / recentXpGains.length;
    const daysEstimated =
      averageDailyXp > 0 ? Math.ceil(xpNeeded / averageDailyXp) : Infinity;

    // Calcular confiança baseada na consistência dos ganhos
    const variance =
      recentXpGains.reduce(
        (sum, xp) => sum + Math.pow(xp - averageDailyXp, 2),
        0,
      ) / recentXpGains.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation =
      averageDailyXp > 0 ? standardDeviation / averageDailyXp : 1;

    let confidence: "high" | "medium" | "low";
    if (coefficientOfVariation < 0.3) {
      confidence = "high";
    } else if (coefficientOfVariation < 0.7) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return {
      daysEstimated,
      xpNeeded,
      averageDailyXp,
      confidence,
    };
  }
}
