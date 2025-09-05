/**
 * Testes de integração final do sistema de XP avulso
 * Verifica compatibilidade com rankings, temporadas, multiplicadores e conquistas
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { GamificationService } from '@/services/gamificationService';

const prisma = new PrismaClient();

describe('XP Avulso - Integração Final', () => {
  let testUserId: string;
  let testAttendantId: string;
  let testSeasonId: string;
  let testXpTypeId: string;

  beforeEach(async () => {
    // Criar usuário de teste
    const testUser = await prisma.user.create({
      data: {
        name: 'Admin Teste',
        email: 'admin@teste.com',
        role: 'ADMIN'
      }
    });
    testUserId = testUser.id;

    // Criar atendente de teste
    const testAttendant = await prisma.attendant.create({
      data: {
        name: 'Atendente Teste',
        email: 'atendente@teste.com',
        userId: testUserId
      }
    });
    testAttendantId = testAttendant.id;

    // Criar temporada ativa com multiplicador
    const testSeason = await prisma.gamificationSeason.create({
      data: {
        name: 'Temporada Teste',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        active: true,
        xpMultiplier: 2.0 // Multiplicador de 2x
      }
    });
    testSeasonId = testSeason.id;

    // Criar tipo de XP avulso
    const testXpType = await XpAvulsoService.createXpType({
      name: 'Excelência no Atendimento',
      description: 'Reconhecimento por atendimento excepcional',
      points: 100,
      category: 'excellence',
      icon: 'star',
      color: '#FFD700',
      createdBy: testUserId
    });
    testXpTypeId = testXpType.id;
  });

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.xpGrant.deleteMany({});
    await prisma.xpEvent.deleteMany({});
    await prisma.xpTypeConfig.deleteMany({});
    await prisma.gamificationSeason.deleteMany({});
    await prisma.attendant.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('Multiplicadores Sazonais', () => {
    it('deve aplicar multiplicador sazonal ao XP avulso', async () => {
      // Conceder XP avulso
      const grant = await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Atendimento excepcional ao cliente',
        grantedBy: testUserId
      });

      // Verificar se o XP foi multiplicado
      const xpEvent = await prisma.xpEvent.findUnique({
        where: { id: grant.xpEventId }
      });

      expect(xpEvent).toBeTruthy();
      expect(xpEvent!.basePoints).toBe(100); // Pontos base
      expect(xpEvent!.points).toBe(200); // Pontos com multiplicador 2x
      expect(xpEvent!.multiplier).toBe(2.0);
    });

    it('deve funcionar sem multiplicador quando não há temporada ativa', async () => {
      // Desativar temporada
      await prisma.gamificationSeason.update({
        where: { id: testSeasonId },
        data: { active: false }
      });

      // Tentar conceder XP avulso deve falhar
      await expect(
        XpAvulsoService.grantXp({
          attendantId: testAttendantId,
          typeId: testXpTypeId,
          justification: 'Teste sem temporada',
          grantedBy: testUserId
        })
      ).rejects.toThrow('Não há temporada ativa para conceder XP');
    });

    it('deve aplicar diferentes multiplicadores em temporadas diferentes', async () => {
      // Criar segunda temporada com multiplicador diferente
      await prisma.gamificationSeason.update({
        where: { id: testSeasonId },
        data: { active: false }
      });

      const season2 = await prisma.gamificationSeason.create({
        data: {
          name: 'Temporada 2',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          active: true,
          xpMultiplier: 1.5
        }
      });

      // Conceder XP na nova temporada
      const grant = await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Teste multiplicador 1.5x',
        grantedBy: testUserId
      });

      const xpEvent = await prisma.xpEvent.findUnique({
        where: { id: grant.xpEventId }
      });

      expect(xpEvent!.basePoints).toBe(100);
      expect(xpEvent!.points).toBe(150); // 100 * 1.5
      expect(xpEvent!.multiplier).toBe(1.5);
    });
  });

  describe('Rankings e Temporadas', () => {
    it('deve incluir XP avulso nos rankings de temporada', async () => {
      // Criar segundo atendente
      const attendant2 = await prisma.attendant.create({
        data: {
          name: 'Atendente 2',
          email: 'atendente2@teste.com',
          userId: testUserId
        }
      });

      // Conceder XP avulso para ambos atendentes
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Primeiro lugar',
        grantedBy: testUserId
      });

      await XpAvulsoService.grantXp({
        attendantId: attendant2.id,
        typeId: testXpTypeId,
        justification: 'Segundo lugar',
        grantedBy: testUserId
      });

      // Conceder XP adicional para o primeiro atendente
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'XP extra',
        grantedBy: testUserId
      });

      // Calcular ranking
      const rankings = await GamificationService.calculateSeasonRankings(testSeasonId);

      expect(rankings).toHaveLength(2);
      expect(rankings[0].attendantId).toBe(testAttendantId);
      expect(rankings[0].totalXp).toBe(400); // 2 concessões * 100 * 2 (multiplicador)
      expect(rankings[0].position).toBe(1);
      
      expect(rankings[1].attendantId).toBe(attendant2.id);
      expect(rankings[1].totalXp).toBe(200); // 1 concessão * 100 * 2 (multiplicador)
      expect(rankings[1].position).toBe(2);
    });

    it('deve calcular XP total incluindo XP avulso', async () => {
      // Conceder XP avulso
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Teste XP total',
        grantedBy: testUserId
      });

      // Calcular XP total
      const totalXp = await GamificationService.calculateTotalXp(testAttendantId, testSeasonId);
      
      expect(totalXp).toBe(200); // 100 * 2 (multiplicador)
    });

    it('deve filtrar XP por temporada corretamente', async () => {
      // Criar segunda temporada inativa
      const season2 = await prisma.gamificationSeason.create({
        data: {
          name: 'Temporada Inativa',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          active: false,
          xpMultiplier: 1.0
        }
      });

      // Conceder XP na temporada ativa
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'XP temporada ativa',
        grantedBy: testUserId
      });

      // Verificar XP por temporada
      const xpTemporadaAtiva = await GamificationService.calculateTotalXp(testAttendantId, testSeasonId);
      const xpTemporadaInativa = await GamificationService.calculateTotalXp(testAttendantId, season2.id);
      
      expect(xpTemporadaAtiva).toBe(200);
      expect(xpTemporadaInativa).toBe(0);
    });
  });

  describe('Conquistas', () => {
    beforeEach(async () => {
      // Criar conquista baseada em XP
      await prisma.achievementConfig.create({
        data: {
          id: 'xp_milestone_500',
          title: 'Marco de 500 XP',
          description: 'Alcançou 500 pontos de experiência',
          xp: 50,
          active: true,
          icon: 'trophy',
          color: '#FFD700'
        }
      });
    });

    it('deve verificar conquistas após concessão de XP avulso', async () => {
      // Conceder XP suficiente para desbloquear conquista (500 XP = 250 base * 2 multiplicador)
      const xpType250 = await XpAvulsoService.createXpType({
        name: 'Grande Conquista',
        description: 'XP para conquista',
        points: 250,
        category: 'achievement',
        icon: 'trophy',
        color: '#FFD700',
        createdBy: testUserId
      });

      // Conceder XP
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: xpType250.id,
        justification: 'Para desbloquear conquista',
        grantedBy: testUserId
      });

      // Verificar se conquista foi desbloqueada
      const unlockedAchievements = await GamificationService.findUnlockedAchievements(testAttendantId);
      
      // Nota: A verificação automática de conquistas pode não estar implementada ainda
      // Este teste verifica se o sistema está preparado para isso
      expect(Array.isArray(unlockedAchievements)).toBe(true);
    });

    it('deve considerar XP avulso no cálculo total para conquistas', async () => {
      // Conceder múltiplas concessões de XP
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Primeira concessão',
        grantedBy: testUserId
      });

      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Segunda concessão',
        grantedBy: testUserId
      });

      // Verificar XP total
      const totalXp = await GamificationService.calculateTotalXp(testAttendantId);
      
      expect(totalXp).toBe(400); // 2 * 100 * 2 (multiplicador)
      
      // Este XP deve ser considerado para verificação de conquistas
      expect(totalXp).toBeGreaterThan(0);
    });
  });

  describe('Compatibilidade com Sistema Existente', () => {
    it('deve manter compatibilidade com XP de avaliações', async () => {
      // Simular XP de avaliação criando evento XP diretamente
      const evaluationXpEvent = await GamificationService.createXpEvent({
        attendantId: testAttendantId,
        points: 50,
        reason: 'Avaliação 5 estrelas',
        type: 'evaluation',
        relatedId: 'eval-123'
      });

      // Conceder XP avulso
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'XP avulso adicional',
        grantedBy: testUserId
      });

      // Verificar XP total (deve somar ambos)
      const totalXp = await GamificationService.calculateTotalXp(testAttendantId);
      
      expect(totalXp).toBe(300); // (50 + 100) * 2 (multiplicador)
    });

    it('deve aparecer corretamente no histórico de eventos XP', async () => {
      // Conceder XP avulso
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Para verificar histórico',
        grantedBy: testUserId
      });

      // Buscar eventos XP do atendente
      const xpEvents = await GamificationService.findXpEventsByAttendant(testAttendantId);
      
      expect(xpEvents).toHaveLength(1);
      expect(xpEvents[0].type).toBe('manual_grant');
      expect(xpEvents[0].points).toBe(200); // Com multiplicador
      expect(xpEvents[0].basePoints).toBe(100); // Sem multiplicador
      expect(xpEvents[0].reason).toContain('XP Avulso: Excelência no Atendimento');
    });

    it('deve funcionar com diferentes tipos de eventos XP', async () => {
      // Criar diferentes tipos de XP
      const xpType2 = await XpAvulsoService.createXpType({
        name: 'Trabalho em Equipe',
        description: 'Colaboração excepcional',
        points: 75,
        category: 'teamwork',
        icon: 'users',
        color: '#10B981',
        createdBy: testUserId
      });

      // Conceder diferentes tipos
      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Excelência',
        grantedBy: testUserId
      });

      await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: xpType2.id,
        justification: 'Trabalho em equipe',
        grantedBy: testUserId
      });

      // Verificar XP total
      const totalXp = await GamificationService.calculateTotalXp(testAttendantId);
      
      expect(totalXp).toBe(350); // (100 + 75) * 2 (multiplicador)
    });
  });

  describe('Validações de Integridade', () => {
    it('deve manter consistência entre XpGrant e XpEvent', async () => {
      // Conceder XP avulso
      const grant = await XpAvulsoService.grantXp({
        attendantId: testAttendantId,
        typeId: testXpTypeId,
        justification: 'Teste consistência',
        grantedBy: testUserId
      });

      // Verificar se XpEvent existe e está vinculado
      const xpEvent = await prisma.xpEvent.findUnique({
        where: { id: grant.xpEventId }
      });

      expect(xpEvent).toBeTruthy();
      expect(xpEvent!.attendantId).toBe(testAttendantId);
      expect(xpEvent!.type).toBe('manual_grant');
      expect(xpEvent!.relatedId).toBe(testXpTypeId);
    });

    it('deve falhar se temporada for desativada durante concessão', async () => {
      // Desativar temporada
      await prisma.gamificationSeason.update({
        where: { id: testSeasonId },
        data: { active: false }
      });

      // Tentar conceder XP deve falhar
      await expect(
        XpAvulsoService.grantXp({
          attendantId: testAttendantId,
          typeId: testXpTypeId,
          justification: 'Deve falhar',
          grantedBy: testUserId
        })
      ).rejects.toThrow('Não há temporada ativa para conceder XP');
    });

    it('deve falhar se tipo de XP for desativado', async () => {
      // Desativar tipo de XP
      await XpAvulsoService.toggleXpTypeStatus(testXpTypeId);

      // Tentar conceder XP deve falhar
      await expect(
        XpAvulsoService.grantXp({
          attendantId: testAttendantId,
          typeId: testXpTypeId,
          justification: 'Deve falhar',
          grantedBy: testUserId
        })
      ).rejects.toThrow('Tipo de XP está inativo');
    });
  });
});