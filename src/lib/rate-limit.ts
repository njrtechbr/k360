import { NextRequest } from 'next/server';

// Interface para configuração de rate limiting
interface RateLimitConfig {
  windowMs: number; // Janela de tempo em milissegundos
  maxRequests: number; // Máximo de requests por janela
  keyGenerator?: (request: NextRequest) => string; // Função para gerar chave única
}

// Armazenamento em memória para rate limiting (em produção, usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Middleware de rate limiting
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Verificar se o request está dentro do limite
   */
  async checkLimit(request: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    error?: string;
  }> {
    try {
      // Gerar chave única para o cliente
      const key = this.config.keyGenerator 
        ? this.config.keyGenerator(request)
        : this.getDefaultKey(request);

      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Limpar entradas expiradas
      this.cleanupExpiredEntries(windowStart);

      // Obter ou criar entrada para a chave
      let entry = requestCounts.get(key);
      
      if (!entry || entry.resetTime <= now) {
        // Criar nova entrada ou resetar se expirou
        entry = {
          count: 0,
          resetTime: now + this.config.windowMs
        };
      }

      // Incrementar contador
      entry.count++;
      requestCounts.set(key, entry);

      // Verificar se excedeu o limite
      const allowed = entry.count <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - entry.count);

      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
        error: allowed ? undefined : 'Rate limit exceeded'
      };
    } catch (error) {
      console.error('Erro no rate limiting:', error);
      // Em caso de erro, permitir o request
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      };
    }
  }

  /**
   * Gerar chave padrão baseada no IP
   */
  private getDefaultKey(request: NextRequest): string {
    // Tentar obter IP real
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    return `rate_limit:${ip}`;
  }

  /**
   * Limpar entradas expiradas do cache
   */
  private cleanupExpiredEntries(windowStart: number): void {
    for (const [key, entry] of requestCounts.entries()) {
      if (entry.resetTime <= windowStart) {
        requestCounts.delete(key);
      }
    }
  }
}

/**
 * Rate limiter para endpoints de XP avulso
 */
export const xpAvulsoRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 30, // 30 requests por minuto
  keyGenerator: (request: NextRequest) => {
    // Usar IP + User-Agent para identificação mais precisa
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    return `xp_avulso:${ip}:${userAgent.slice(0, 50)}`;
  }
});

/**
 * Rate limiter mais restritivo para operações de concessão de XP
 */
export const xpGrantRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10, // 10 concessões por minuto
  keyGenerator: (request: NextRequest) => {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    return `xp_grant:${ip}`;
  }
});

/**
 * Aplicar rate limiting em um handler de API
 */
export function withRateLimit(
  rateLimiter: RateLimiter,
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    // Verificar rate limit
    const limitResult = await rateLimiter.checkLimit(request);

    // Adicionar headers de rate limiting
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimiter['config'].maxRequests.toString());
    headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', Math.ceil(limitResult.resetTime / 1000).toString());

    // Se excedeu o limite, retornar erro
    if (!limitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Muitas tentativas. Tente novamente em alguns instantes.',
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers.entries())
          }
        }
      );
    }

    // Executar handler original
    const response = await handler(request, ...args);

    // Adicionar headers de rate limiting à resposta
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  };
}