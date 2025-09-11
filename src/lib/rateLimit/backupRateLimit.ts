import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requests na janela
  skipSuccessfulRequests?: boolean; // Se deve contar apenas requests com erro
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Configurações de rate limit por role e operação
 */
const RATE_LIMIT_CONFIGS: Record<Role, Record<string, RateLimitConfig>> = {
  SUPERADMIN: {
    create: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 backups por minuto
    list: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 listagens por minuto
    download: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 downloads por minuto
    delete: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 exclusões por minuto
  },
  ADMIN: {
    create: { windowMs: 60 * 1000, maxRequests: 8 }, // 8 backups por minuto
    list: { windowMs: 60 * 1000, maxRequests: 50 }, // 50 listagens por minuto
    download: { windowMs: 60 * 1000, maxRequests: 15 }, // 15 downloads por minuto
    delete: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 exclusões por minuto
  },
  SUPERVISOR: {
    list: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 listagens por minuto
    download: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 downloads por minuto
  },
  USUARIO: {
    // Usuários regulares não têm acesso a operações de backup
  },
};

/**
 * Rate limiter em memória para operações de backup
 * Em produção, considere usar Redis para persistência entre instâncias
 */
export class BackupRateLimiter {
  private static store = new Map<string, RateLimitEntry>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Verifica se uma requisição está dentro do limite
   */
  static checkRateLimit(
    userId: string,
    userRole: Role,
    operation: string,
    ipAddress?: string,
  ): RateLimitResult {
    const config = this.getRateLimitConfig(userRole, operation);

    if (!config) {
      // Se não há configuração, permite a operação
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now(),
      };
    }

    const key = this.generateKey(userId, operation, ipAddress);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = this.store.get(key);

    // Se não existe entrada ou a janela expirou, cria nova
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        lastRequest: now,
      };
    }

    // Incrementa contador
    entry.count++;
    entry.lastRequest = now;
    this.store.set(key, entry);

    // Inicia limpeza automática se necessário
    this.startCleanupIfNeeded();

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((entry.resetTime - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  /**
   * Obtém estatísticas de rate limiting para um usuário
   */
  static getUserRateLimitStats(userId: string): Record<string, RateLimitEntry> {
    const stats: Record<string, RateLimitEntry> = {};

    for (const [key, entry] of this.store.entries()) {
      if (key.startsWith(`${userId}:`)) {
        const operation = key.split(":")[1];
        stats[operation] = { ...entry };
      }
    }

    return stats;
  }

  /**
   * Limpa entradas expiradas do rate limiter
   */
  static cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Reseta rate limit para um usuário específico (uso administrativo)
   */
  static resetUserRateLimit(userId: string, operation?: string): number {
    let removedCount = 0;
    const prefix = operation ? `${userId}:${operation}` : `${userId}:`;

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Obtém configuração de rate limit para role e operação
   */
  private static getRateLimitConfig(
    role: Role,
    operation: string,
  ): RateLimitConfig | null {
    const roleConfig = RATE_LIMIT_CONFIGS[role];
    return roleConfig?.[operation] || null;
  }

  /**
   * Gera chave única para o rate limiter
   */
  private static generateKey(
    userId: string,
    operation: string,
    ipAddress?: string,
  ): string {
    // Inclui IP para proteção adicional contra ataques distribuídos
    const ipSuffix = ipAddress ? `:${ipAddress}` : "";
    return `${userId}:${operation}${ipSuffix}`;
  }

  /**
   * Inicia limpeza automática se não estiver rodando
   */
  private static startCleanupIfNeeded(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(
        () => {
          const removed = this.cleanup();
          if (removed > 0) {
            console.log(
              `[RATE LIMIT] Limpeza automática: ${removed} entradas removidas`,
            );
          }
        },
        5 * 60 * 1000,
      ); // Limpa a cada 5 minutos
    }
  }

  /**
   * Para a limpeza automática (para testes)
   */
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Limpa todo o store (para testes)
   */
  static clearAll(): void {
    this.store.clear();
  }
}

/**
 * Middleware para aplicar rate limiting em requests
 */
export function applyRateLimit(
  userId: string,
  userRole: Role,
  operation: string,
  request: NextRequest,
): RateLimitResult {
  const ipAddress = getClientIP(request);
  return BackupRateLimiter.checkRateLimit(
    userId,
    userRole,
    operation,
    ipAddress,
  );
}

/**
 * Extrai IP do cliente da requisição
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  // Fallback para desenvolvimento
  return "unknown";
}

/**
 * Cria resposta de rate limit excedido
 */
export function createRateLimitResponse(rateLimitResult: RateLimitResult) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
  };

  if (rateLimitResult.retryAfter) {
    headers["Retry-After"] = rateLimitResult.retryAfter.toString();
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "Rate limit excedido. Tente novamente mais tarde.",
      retryAfter: rateLimitResult.retryAfter,
    }),
    {
      status: 429,
      headers,
    },
  );
}
