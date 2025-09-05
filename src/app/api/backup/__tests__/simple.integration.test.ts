/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';

describe('Teste Simples de Integração', () => {
  it('deve executar teste básico', () => {
    expect(1 + 1).toBe(2);
  });

  it('deve ter acesso ao ambiente Node.js', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('deve conseguir importar módulos do Next.js', async () => {
    const { NextRequest } = await import('next/server');
    expect(NextRequest).toBeDefined();
  });

  it('deve conseguir usar mocks do Jest', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});