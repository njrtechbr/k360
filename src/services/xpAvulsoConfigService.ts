import { XpAvulsoApiClient } from "./xpAvulsoApiClient";

/**
 * XpAvulsoConfigService - Serviço para gerenciar configurações de XP Avulso
 * Wrapper para manter compatibilidade com código existente
 */
export class XpAvulsoConfigService {
  /**
   * Buscar configurações atuais de XP Avulso
   */
  static async getConfig(): Promise<{
    dailyLimitPoints: number;
    dailyLimitGrants: number;
    maxPointsPerGrant: number;
    allowedRoles: string[];
  }> {
    return XpAvulsoApiClient.getXpAvulsoConfig();
  }

  /**
   * Atualizar configurações de XP Avulso
   */
  static async updateConfig(config: {
    dailyLimitPoints?: number;
    dailyLimitGrants?: number;
    maxPointsPerGrant?: number;
  }): Promise<{
    dailyLimitPoints: number;
    dailyLimitGrants: number;
    maxPointsPerGrant: number;
    allowedRoles: string[];
  }> {
    await XpAvulsoApiClient.updateXpAvulsoConfig(config);
    return this.getConfig();
  }

  /**
   * Validar concessão de XP contra configurações
   */
  static async validateGrant(
    typeId: string,
    points: number,
    granterId: string,
    attendantId: string,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return XpAvulsoApiClient.validateGrant(
      typeId,
      points,
      granterId,
      attendantId,
    );
  }

  /**
   * Resetar configurações para valores padrão
   */
  static async resetToDefaults(userId: string): Promise<{
    dailyLimitPoints: number;
    dailyLimitGrants: number;
    maxPointsPerGrant: number;
    allowedRoles: string[];
  }> {
    // Valores padrão
    const defaultConfig = {
      dailyLimitPoints: 1000,
      dailyLimitGrants: 10,
      maxPointsPerGrant: 100,
    };

    await XpAvulsoApiClient.updateXpAvulsoConfig(defaultConfig);
    return this.getConfig();
  }

  /**
   * Buscar estatísticas de uso das configurações
   */
  static async getUsageStats(days: number = 30): Promise<{
    totalGrants: number;
    totalPoints: number;
    averagePointsPerGrant: number;
    topGranters: Array<{
      userId: string;
      userName: string;
      totalGrants: number;
      totalPoints: number;
    }>;
    dailyUsage: Array<{
      date: string;
      grants: number;
      points: number;
    }>;
  }> {
    // Por enquanto, retornar dados mock
    // TODO: Implementar endpoint específico para estatísticas de configuração
    return {
      totalGrants: 0,
      totalPoints: 0,
      averagePointsPerGrant: 0,
      topGranters: [],
      dailyUsage: [],
    };
  }
}
