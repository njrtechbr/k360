import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BackupRateLimiter } from '../backupRateLimit';
import { Role } from '@prisma/client';

describe('BackupRateLimiter', () => {
  beforeEach(() => {
    BackupRateLimiter.clearAll();
    jest.useFakeTimers();
  });

  afterEach(() => {
    BackupRateLimiter.stopCleanup();
    BackupRateLimiter.clearAll();
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('deve permitir primeira requisição', () => {
      const result = BackupRateLimiter.checkRateLimit('user-1', 'ADMIN', 'create');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7); // 8 - 1 = 7 para ADMIN create
    });

    it('deve decrementar contador a cada requisição', () => {
      // Primeira requisição
      let result = BackupRateLimiter.checkRateLimit('user-1', 'ADMIN', 'create');
      expect(result.remaining).toBe(7);

      // Segunda requisição
      result = BackupRateLimiter.checkRateLimit('user-1', 'ADMIN', 'create');
      expect(result.remaining).toBe(6);

      // Terceira requisição
      result = BackupRateLimiter.checkRateLimit('user-1', 'ADMIN', 'create');
      expect(result.remaining).toBe(5);
    });

    it('deve bloquear após exceder limite', () => {
      const userId = 'user-1';
      const role: Role = 'ADMIN';
      const operation = 'create';

      // Fazer 8 requisições (limite para ADMIN create)
      for (let i = 0; i < 8; i++) {
        const result = BackupRateLimiter.checkRateLimit(userId, role, operation);
        expect(result.allowed).toBe(true);
      }

      // 9ª requisição deve ser bloqueada
      const result = BackupRateLimiter.checkRateLimit(userId, role, operation);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('deve resetar contador após janela de tempo', () => {
      const userId = 'user-1';
      const role: Role = 'ADMIN';
      const operation = 'create';

      // Fazer requisições até o limite
      for (let i = 0; i < 8; i++) {
        BackupRateLimiter.checkRateLimit(userId, role, operation);
      }

      // Verificar que está bloqueado
      let result = BackupRateLimiter.checkRateLimit(userId, role, operation);
      expect(result.allowed).toBe(false);

      // Avançar tempo além da janela (60 segundos)
      jest.advanceTimersByTime(61 * 1000);

      // Deve permitir novamente
      result = BackupRateLimiter.checkRateLimit(userId, role, operation);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
    });

    it('deve tratar diferentes usuários independentemente', () => {
      const role: Role = 'ADMIN';
      const operation = 'create';

      // User 1 faz requisições
      for (let i = 0; i < 8; i++) {
        BackupRateLimiter.checkRateLimit('user-1', role, operation);
      }

      // User 1 deve estar bloqueado
      let result = BackupRateLimiter.checkRateLimit('user-1', role, operation);
      expect(result.allowed).toBe(false);

      // User 2 deve estar livre
      result = BackupRateLimiter.checkRateLimit('user-2', role, operation);
      expect(result.allowed).toBe(true);
    });

    it('deve tratar diferentes operações independentemente', () => {
      const userId = 'user-1';
      const role: Role = 'ADMIN';

      // Esgotar limite para 'create'
      for (let i = 0; i < 8; i++) {
        BackupRateLimiter.checkRateLimit(userId, role, 'create');
      }

      // 'create' deve estar bloqueado
      let result = BackupRateLimiter.checkRateLimit(userId, role, 'create');
      expect(result.allowed).toBe(false);

      // 'list' deve estar livre
      result = BackupRateLimiter.checkRateLimit(userId, role, 'list');
      expect(result.allowed).toBe(true);
    });

    it('deve aplicar limites diferentes por role', () => {
      const userId = 'user-1';
      const operation = 'create';

      // ADMIN tem limite de 8
      for (let i = 0; i < 8; i++) {
        const result = BackupRateLimiter.checkRateLimit(userId, 'ADMIN', operation);
        expect(result.allowed).toBe(true);
      }

      // Limpar para testar SUPERADMIN
      BackupRateLimiter.clearAll();

      // SUPERADMIN tem limite de 10
      for (let i = 0; i < 10; i++) {
        const result = BackupRateLimiter.checkRateLimit(userId, 'SUPERADMIN', operation);
        expect(result.allowed).toBe(true);
      }
    });

    it('deve permitir operações não configuradas', () => {
      const result = BackupRateLimiter.checkRateLimit('user-1', 'ADMIN', 'unknown-operation');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('deve incluir IP no rate limiting quando fornecido', () => {
      const userId = 'user-1';
      const role: Role = 'ADMIN';
      const operation = 'create';
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // Esgotar limite para IP1
      for (let i = 0; i < 8; i++) {
        BackupRateLimiter.checkRateLimit(userId, role, operation, ip1);
      }

      // IP1 deve estar bloqueado
      let result = BackupRateLimiter.checkRateLimit(userId, role, operation, ip1);
      expect(result.allowed).toBe(false);

      // IP2 deve estar livre (mesmo usuário, IP diferente)
      result = BackupRateLimiter.checkRateLimit(userId, role, operation, ip2);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getUserRateLimitStats', () => {
    it('deve retornar stats vazias para usuário sem histórico', () => {
      const stats = BackupRateLimiter.getUserRateLimitStats('user-1');
      expect(stats).toEqual({});
    });

    it('deve retornar stats do usuário', () => {
      const userId = 'user-1';
      
      // Fazer algumas requisições
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'create');
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'create');
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'list');

      const stats = BackupRateLimiter.getUserRateLimitStats(userId);
      
      expect(stats.create).toBeDefined();
      expect(stats.create.count).toBe(2);
      expect(stats.list).toBeDefined();
      expect(stats.list.count).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('deve remover entradas expiradas', () => {
      const userId = 'user-1';
      
      // Fazer requisição
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'create');
      
      // Verificar que existe
      let stats = BackupRateLimiter.getUserRateLimitStats(userId);
      expect(Object.keys(stats)).toHaveLength(1);

      // Avançar tempo além da expiração
      jest.advanceTimersByTime(61 * 1000);

      // Executar limpeza
      const removedCount = BackupRateLimiter.cleanup();
      expect(removedCount).toBe(1);

      // Verificar que foi removido
      stats = BackupRateLimiter.getUserRateLimitStats(userId);
      expect(Object.keys(stats)).toHaveLength(0);
    });

    it('deve manter entradas não expiradas', () => {
      const userId = 'user-1';
      
      // Fazer requisição
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'create');
      
      // Avançar tempo, mas não além da expiração
      jest.advanceTimersByTime(30 * 1000);

      // Executar limpeza
      const removedCount = BackupRateLimiter.cleanup();
      expect(removedCount).toBe(0);

      // Verificar que ainda existe
      const stats = BackupRateLimiter.getUserRateLimitStats(userId);
      expect(Object.keys(stats)).toHaveLength(1);
    });
  });

  describe('resetUserRateLimit', () => {
    it('deve resetar rate limit de usuário específico', () => {
      const userId = 'user-1';
      
      // Fazer requisições
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'create');
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'list');

      // Verificar que existem
      let stats = BackupRateLimiter.getUserRateLimitStats(userId);
      expect(Object.keys(stats)).toHaveLength(2);

      // Resetar
      const resetCount = BackupRateLimiter.resetUserRateLimit(userId);
      expect(resetCount).toBe(2);

      // Verificar que foram removidos
      stats = BackupRateLimiter.getUserRateLimitStats(userId);
      expect(Object.keys(stats)).toHaveLength(0);
    });

    it('deve resetar apenas operação específica', () => {
      const userId = 'user-1';
      
      // Fazer requisições
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'create');
      BackupRateLimiter.checkRateLimit(userId, 'ADMIN', 'list');

      // Resetar apenas 'create'
      const resetCount = BackupRateLimiter.resetUserRateLimit(userId, 'create');
      expect(resetCount).toBe(1);

      // Verificar que apenas 'create' foi removido
      const stats = BackupRateLimiter.getUserRateLimitStats(userId);
      expect(stats.create).toBeUndefined();
      expect(stats.list).toBeDefined();
    });
  });
});