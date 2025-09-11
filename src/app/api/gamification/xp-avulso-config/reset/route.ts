import { NextRequest, NextResponse } from "next/server";
import { XpAvulsoConfigService } from "@/services/xpAvulsoConfigService";
import {
  AuthMiddleware,
  AuthConfigs,
  AuditLogger,
} from "@/lib/auth-middleware";
import { xpAvulsoRateLimiter } from "@/lib/rate-limit";

/**
 * POST /api/gamification/xp-avulso-config/reset
 * Resetar configurações para valores padrão
 */
export async function POST(request: NextRequest) {
  try {
    // Aplicar rate limiting
    const limitResult = await xpAvulsoRateLimiter.checkLimit(request);
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Muitas tentativas. Tente novamente em alguns instantes.",
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": limitResult.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(
              limitResult.resetTime / 1000,
            ).toString(),
          },
        },
      );
    }

    // Verificar autenticação e autorização (apenas SUPERADMIN)
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.superAdminOnly,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || "Não autorizado" },
        { status: authResult.statusCode || 401 },
      );
    }

    // Buscar configuração atual para log
    const currentConfig = await XpAvulsoConfigService.getConfig();

    // Resetar para valores padrão
    const resetConfig = await XpAvulsoConfigService.resetToDefaults(
      authResult.session!.user.id,
    );

    // Log de auditoria
    await AuditLogger.logAdminAction(
      "RESET_XP_AVULSO_CONFIG",
      authResult.session!.user.id,
      {
        previousConfig: {
          dailyLimitPoints: currentConfig.dailyLimitPoints,
          dailyLimitGrants: currentConfig.dailyLimitGrants,
          maxPointsPerGrant: currentConfig.maxPointsPerGrant,
          minPointsPerGrant: currentConfig.minPointsPerGrant,
          requireJustification: currentConfig.requireJustification,
          autoApproveLimit: currentConfig.autoApproveLimit,
          maxGrantsPerAttendant: currentConfig.maxGrantsPerAttendant,
          cooldownMinutes: currentConfig.cooldownMinutes,
        },
        resetToDefaults: true,
        reason: "Configurações resetadas pelo administrador",
      },
      request,
    );

    return NextResponse.json({
      success: true,
      message: "Configurações resetadas para valores padrão com sucesso",
      data: resetConfig,
    });
  } catch (error) {
    console.error("Erro ao resetar configurações de XP Avulso:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
