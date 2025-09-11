import { NextRequest } from "next/server";
import { BackupRateLimiter } from "@/lib/rateLimit/backupRateLimit";
import { withBackupSecurity } from "@/lib/middleware/backupSecurityMiddleware";

interface RateLimitQuery {
  userId?: string;
}

interface RateLimitAction {
  action: "reset" | "stats" | "cleanup";
  userId?: string;
  operation?: string;
}

export async function GET(request: NextRequest) {
  return withBackupSecurity(request, "canList", async (context) => {
    try {
      // Apenas ADMIN e SUPERADMIN podem ver rate limit stats
      if (!["ADMIN", "SUPERADMIN"].includes(context.user.role)) {
        throw new Error("Permissões insuficientes para visualizar rate limits");
      }

      const { searchParams } = new URL(request.url);
      const query: RateLimitQuery = {
        userId: searchParams.get("userId") || undefined,
      };

      if (query.userId) {
        // Obter stats de um usuário específico
        const userStats = BackupRateLimiter.getUserRateLimitStats(query.userId);

        return {
          success: true,
          data: {
            userId: query.userId,
            rateLimits: userStats,
          },
        };
      } else {
        // Para stats gerais, retornar informações básicas
        return {
          success: true,
          data: {
            message: "Rate limiting ativo",
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      console.error("[RATE_LIMIT_STATS_ERROR]", error);
      throw error;
    }
  });
}

export async function POST(request: NextRequest) {
  return withBackupSecurity(request, "canCreate", async (context) => {
    try {
      // Apenas SUPERADMIN pode executar operações de rate limit
      if (context.user.role !== "SUPERADMIN") {
        throw new Error("Apenas SUPERADMIN pode gerenciar rate limits");
      }

      const body: RateLimitAction = await request.json();

      if (!body.action) {
        throw new Error("Ação é obrigatória");
      }

      switch (body.action) {
        case "reset":
          if (!body.userId) {
            throw new Error("userId é obrigatório para reset");
          }

          const resetCount = BackupRateLimiter.resetUserRateLimit(
            body.userId,
            body.operation,
          );

          return {
            success: true,
            message: `Rate limit resetado para usuário ${body.userId}`,
            resetCount,
          };

        case "cleanup":
          const cleanupCount = BackupRateLimiter.cleanup();

          return {
            success: true,
            message: `${cleanupCount} entradas de rate limit expiradas removidas`,
            cleanupCount,
          };

        case "stats":
          // Retornar estatísticas gerais do rate limiter
          return {
            success: true,
            data: {
              message: "Rate limiter operacional",
              timestamp: new Date().toISOString(),
            },
          };

        default:
          throw new Error(`Ação '${body.action}' não reconhecida`);
      }
    } catch (error) {
      console.error("[RATE_LIMIT_MANAGEMENT_ERROR]", error);
      throw error;
    }
  });
}
