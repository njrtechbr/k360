/**
 * @jest-environment node
 */
import { GrantXpSchema, GrantHistoryFiltersSchema } from '../xpAvulsoService';

describe('XpAvulsoService Schemas', () => {
  describe('GrantXpSchema', () => {
    it('deve validar dados válidos', () => {
      const validData = {
        attendantId: 'att-123',
        typeId: 'type-123',
        grantedBy: 'user-123',
        justification: 'Excelente trabalho'
      };

      const result = GrantXpSchema.safeParse(validData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attendantId).toBe('att-123');
        expect(result.data.typeId).toBe('type-123');
        expect(result.data.grantedBy).toBe('user-123');
        expect(result.data.justification).toBe('Excelente trabalho');
      }
    });

    it('deve rejeitar dados inválidos', () => {
      const invalidData = {
        attendantId: '',
        typeId: '',
        grantedBy: ''
      };

      const result = GrantXpSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GrantHistoryFiltersSchema', () => {
    it('deve validar filtros básicos', () => {
      const validFilters = {
        page: 1,
        limit: 20
      };

      const result = GrantHistoryFiltersSchema.safeParse(validFilters);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('grantedAt'); // valor padrão
        expect(result.data.sortOrder).toBe('desc'); // valor padrão
      }
    });

    it('deve validar filtros com ordenação customizada', () => {
      const validFilters = {
        page: 1,
        limit: 10,
        sortBy: 'points' as const,
        sortOrder: 'asc' as const,
        attendantId: 'att-123'
      };

      const result = GrantHistoryFiltersSchema.safeParse(validFilters);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('points');
        expect(result.data.sortOrder).toBe('asc');
        expect(result.data.attendantId).toBe('att-123');
      }
    });

    it('deve rejeitar sortBy inválido', () => {
      const invalidFilters = {
        page: 1,
        limit: 20,
        sortBy: 'invalid'
      };

      const result = GrantHistoryFiltersSchema.safeParse(invalidFilters);
      
      expect(result.success).toBe(false);
    });

    it('deve rejeitar sortOrder inválido', () => {
      const invalidFilters = {
        page: 1,
        limit: 20,
        sortOrder: 'invalid'
      };

      const result = GrantHistoryFiltersSchema.safeParse(invalidFilters);
      
      expect(result.success).toBe(false);
    });
  });
});