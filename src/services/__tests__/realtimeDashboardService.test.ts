import { RealtimeDashboardService } from '../realtimeDashboardService';

// Mock do Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    gamificationSeason: {
      findFirst: jest.fn(),
    },
    xpEvent: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    attendant: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    evaluation: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    unlockedAchievement: {
      findMany: jest.fn(),
    },
    achievementConfig: {
      findMany: jest.fn(),
    },
  })),
}));

// Mock do módulo de erros
jest.mock('@/lib/errors', () => ({
  logError: jest.fn(),
}));

describe('RealtimeDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGamificationMetrics', () => {
    it('deve retornar métricas de gamificação válidas', async () => {
      // Arrange
      const mockPrisma = require('@prisma/client').PrismaClient();
      
      mockPrisma.gamificationSeason.findFirst.mockResolvedValue({
        id: 'season-1',
        active: true
      });
      
      mockPrisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 1000 }
      });

      mockPrisma.attendant.findMany.mockResolvedValue([]);
      mockPrisma.xpEvent.groupBy.mockResolvedValue([]);
      mockPrisma.unlockedAchievement.findMany.mockResolvedValue([]);
      mockPrisma.achievementConfig.findMany.mockResolvedValue([]);

      // Act
      const result = await RealtimeDashboardService.getGamificationMetrics();

      // Assert
      expect(result).toHaveProperty('totalXp');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('topRanking');
      expect(result).toHaveProperty('recentAchievements');
      expect(result).toHaveProperty('xpTrend');
      expect(typeof result.totalXp).toBe('number');
    });
  });

  describe('getSatisfactionMetrics', () => {
    it('deve retornar métricas de satisfação válidas', async () => {
      // Arrange
      const mockPrisma = require('@prisma/client').PrismaClient();
      
      mockPrisma.evaluation.aggregate.mockResolvedValue({
        _avg: { nota: 4.2 }
      });
      
      mockPrisma.evaluation.count.mockResolvedValue(50);
      mockPrisma.evaluation.groupBy.mockResolvedValue([
        { nota: 5, _count: { nota: 20 } },
        { nota: 4, _count: { nota: 15 } },
        { nota: 3, _count: { nota: 10 } },
        { nota: 2, _count: { nota: 3 } },
        { nota: 1, _count: { nota: 2 } }
      ]);
      
      mockPrisma.evaluation.findMany.mockResolvedValue([]);

      // Act
      const result = await RealtimeDashboardService.getSatisfactionMetrics();

      // Assert
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('averageRating24h');
      expect(result).toHaveProperty('totalEvaluations');
      expect(result).toHaveProperty('ratingDistribution');
      expect(result).toHaveProperty('lowRatingAlerts');
      expect(result).toHaveProperty('trend');
      expect(typeof result.averageRating).toBe('number');
    });
  });

  describe('getAlertMetrics', () => {
    it('deve retornar métricas de alertas válidas', async () => {
      // Arrange
      const mockPrisma = require('@prisma/client').PrismaClient();
      
      mockPrisma.attendant.findMany.mockResolvedValue([]);
      mockPrisma.attendant.count.mockResolvedValue(5);
      mockPrisma.gamificationSeason.findFirst.mockResolvedValue({
        id: 'season-1',
        active: true
      });
      mockPrisma.evaluation.count.mockResolvedValue(10);
      mockPrisma.evaluation.aggregate.mockResolvedValue({
        _avg: { nota: 3.5 }
      });

      // Act
      const result = await RealtimeDashboardService.getAlertMetrics();

      // Assert
      expect(result).toHaveProperty('lowSatisfactionCount');
      expect(result).toHaveProperty('inactiveUsersCount');
      expect(result).toHaveProperty('systemAlerts');
      expect(typeof result.lowSatisfactionCount).toBe('number');
      expect(typeof result.inactiveUsersCount).toBe('number');
      expect(Array.isArray(result.systemAlerts)).toBe(true);
    });
  });

  describe('getAllDashboardMetrics', () => {
    it('deve retornar todas as métricas consolidadas', async () => {
      // Arrange
      const mockPrisma = require('@prisma/client').PrismaClient();
      
      // Mock para gamificação
      mockPrisma.gamificationSeason.findFirst.mockResolvedValue({
        id: 'season-1',
        active: true
      });
      mockPrisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 1000 }
      });
      mockPrisma.xpEvent.groupBy.mockResolvedValue([]);
      
      // Mock para satisfação
      mockPrisma.evaluation.aggregate.mockResolvedValue({
        _avg: { nota: 4.2 }
      });
      mockPrisma.evaluation.count.mockResolvedValue(50);
      mockPrisma.evaluation.groupBy.mockResolvedValue([]);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      
      // Mock para alertas
      mockPrisma.attendant.findMany.mockResolvedValue([]);
      mockPrisma.attendant.count.mockResolvedValue(5);
      mockPrisma.unlockedAchievement.findMany.mockResolvedValue([]);
      mockPrisma.achievementConfig.findMany.mockResolvedValue([]);

      // Act
      const result = await RealtimeDashboardService.getAllDashboardMetrics();

      // Assert
      expect(result).toHaveProperty('gamification');
      expect(result).toHaveProperty('satisfaction');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('lastUpdated');
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });
});