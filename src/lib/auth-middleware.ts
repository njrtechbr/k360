import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Tipos de roles permitidos
export type UserRole = "SUPERADMIN" | "ADMIN" | "SUPERVISOR" | "USUARIO";

// Interface para configuração de autorização
interface AuthConfig {
  requiredRoles: UserRole[];
  requireAuth?: boolean;
}

// Interface para sessão do usuário
interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

/**
 * Middleware de autenticação e autorização
 */
export class AuthMiddleware {
  /**
   * Verificar autenticação e autorização
   */
  static async checkAuth(
    request: NextRequest,
    config: AuthConfig,
  ): Promise<{
    authorized: boolean;
    session?: AuthSession;
    error?: string;
    statusCode?: number;
  }> {
    try {
      // Se não requer autenticação, permitir
      if (config.requireAuth === false) {
        return { authorized: true };
      }

      // Obter sessão
      const session = (await getServerSession(
        authOptions,
      )) as AuthSession | null;

      // Verificar se está autenticado
      if (!session?.user) {
        return {
          authorized: false,
          error: "Não autorizado. Faça login para continuar.",
          statusCode: 401,
        };
      }

      // Verificar se tem role necessário
      if (!config.requiredRoles.includes(session.user.role)) {
        return {
          authorized: false,
          error: `Acesso negado. Roles permitidos: ${config.requiredRoles.join(", ")}`,
          statusCode: 403,
        };
      }

      return {
        authorized: true,
        session,
      };
    } catch (error) {
      console.error("Erro na verificação de autenticação:", error);
      return {
        authorized: false,
        error: "Erro interno de autenticação",
        statusCode: 500,
      };
    }
  }

  /**
   * Wrapper para aplicar autenticação em handlers de API
   */
  static withAuth(
    config: AuthConfig,
    handler: (
      request: NextRequest,
      session: AuthSession,
      ...args: any[]
    ) => Promise<Response>,
  ) {
    return async (request: NextRequest, ...args: any[]): Promise<Response> => {
      // Verificar autenticação
      const authResult = await this.checkAuth(request, config);

      if (!authResult.authorized) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.statusCode || 401 },
        );
      }

      // Executar handler com sessão
      return handler(request, authResult.session!, ...args);
    };
  }

  /**
   * Verificar se usuário tem permissão específica
   */
  static hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Verificar se usuário é administrador
   */
  static isAdmin(userRole: UserRole): boolean {
    return ["ADMIN", "SUPERADMIN"].includes(userRole);
  }

  /**
   * Verificar se usuário é superadministrador
   */
  static isSuperAdmin(userRole: UserRole): boolean {
    return userRole === "SUPERADMIN";
  }

  /**
   * Obter nível de permissão numérico
   */
  static getPermissionLevel(userRole: UserRole): number {
    const levels = {
      USUARIO: 1,
      SUPERVISOR: 2,
      ADMIN: 3,
      SUPERADMIN: 4,
    };
    return levels[userRole] || 0;
  }

  /**
   * Verificar se usuário tem nível de permissão mínimo
   */
  static hasMinimumLevel(userRole: UserRole, minimumLevel: number): boolean {
    return this.getPermissionLevel(userRole) >= minimumLevel;
  }
}

/**
 * Configurações pré-definidas para diferentes tipos de endpoints
 */
export const AuthConfigs = {
  // Apenas administradores (ADMIN e SUPERADMIN)
  adminOnly: {
    requiredRoles: ["ADMIN", "SUPERADMIN"] as UserRole[],
    requireAuth: true,
  },

  // Apenas superadministradores
  superAdminOnly: {
    requiredRoles: ["SUPERADMIN"] as UserRole[],
    requireAuth: true,
  },

  // Supervisores e acima
  supervisorAndAbove: {
    requiredRoles: ["SUPERVISOR", "ADMIN", "SUPERADMIN"] as UserRole[],
    requireAuth: true,
  },

  // Qualquer usuário autenticado
  authenticated: {
    requiredRoles: [
      "USUARIO",
      "SUPERVISOR",
      "ADMIN",
      "SUPERADMIN",
    ] as UserRole[],
    requireAuth: true,
  },

  // Público (sem autenticação)
  public: {
    requiredRoles: [] as UserRole[],
    requireAuth: false,
  },
};

/**
 * Logs de auditoria para ações administrativas
 */
export class AuditLogger {
  /**
   * Registrar ação administrativa
   */
  static async logAdminAction(
    action: string,
    userId: string,
    details: Record<string, any>,
    request: NextRequest,
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        userId,
        details,
        ip: this.getClientIP(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      };

      // Em produção, salvar no banco de dados ou serviço de logs
      console.log("AUDIT LOG:", JSON.stringify(logEntry, null, 2));
    } catch (error) {
      console.error("Erro ao registrar log de auditoria:", error);
    }
  }

  /**
   * Obter IP do cliente
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    return forwarded?.split(",")[0] || realIp || "unknown";
  }
}

/**
 * Wrapper combinado para autenticação, autorização e rate limiting
 */
export function withAuthAndRateLimit(
  authConfig: AuthConfig,
  rateLimiter: any,
  handler: (
    request: NextRequest,
    session: AuthSession,
    ...args: any[]
  ) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    // 1. Verificar rate limiting
    if (rateLimiter) {
      const limitResult = await rateLimiter.checkLimit(request);

      if (!limitResult.allowed) {
        return NextResponse.json(
          {
            error: "Muitas tentativas. Tente novamente em alguns instantes.",
            retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": rateLimiter.config.maxRequests.toString(),
              "X-RateLimit-Remaining": limitResult.remaining.toString(),
              "X-RateLimit-Reset": Math.ceil(
                limitResult.resetTime / 1000,
              ).toString(),
            },
          },
        );
      }
    }

    // 2. Verificar autenticação e autorização
    const authResult = await AuthMiddleware.checkAuth(request, authConfig);

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 },
      );
    }

    // 3. Executar handler
    const response = await handler(request, authResult.session!, ...args);

    // 4. Adicionar headers de rate limiting se aplicável
    if (rateLimiter) {
      const limitResult = await rateLimiter.checkLimit(request);
      response.headers.set(
        "X-RateLimit-Limit",
        rateLimiter.config.maxRequests.toString(),
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        limitResult.remaining.toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(limitResult.resetTime / 1000).toString(),
      );
    }

    return response;
  };
}
