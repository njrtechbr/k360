import { NextRequest, NextResponse } from "next/server";
import { XpAvulsoConfigService } from "@/services/xpAvulsoConfigService";
import {
  AuthMiddleware,
  AuthConfigs,
  AuditLogger,
} from "@/lib/auth-middleware";
import { xpAvulsoRateLimiter } from "@/lib/rate-limit";

/**
 * GET /api/gamification/xp-avulso-config
 * Buscar configurações atuais do XP Avulso
 */
export async function GET(request: NextRequest) {
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

    // Verificar autenticação e autorização (apenas ADMIN e SUPERADMIN)
    const authResult = await AuthMiddleware.checkAuth(
      request,
      AuthConfigs.adminOnly,
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || "Não autorizado" },
        { status: authResult.statusCode || 401 },
      );
    }

    // Buscar configurações
    let config;
    try {
      config = await XpAvulsoConfigService.getConfig();
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      return NextResponse.json(
        { error: "Erro ao buscar configurações do banco de dados" },
        { status: 500 },
      );
    }

    // Buscar estatísticas de uso se solicitado
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const statsDays = parseInt(searchParams.get("statsDays") || "30");

    let stats = null;
    if (includeStats) {
      try {
        stats = await XpAvulsoConfigService.getUsageStats(statsDays);
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        // Continuar sem estatísticas se houver erro
        stats = {
          totalGrants: 0,
          totalPoints: 0,
          averagePointsPerGrant: 0,
          topGranters: [],
          dailyUsage: [],
        };
      }
    }

    // Log de auditoria
    await AuditLogger.logAdminAction(
      "VIEW_XP_AVULSO_CONFIG",
      authResult.session!.user.id,
      { includeStats, statsDays },
      request,
    );

    return NextResponse.json({
      success: true,
      data: config,
      stats,
    });
  } catch (error) {
    console.error("Erro ao buscar configurações de XP Avulso:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/gamification/xp-avulso-config
 * Atualizar configurações do XP Avulso
 */
export async function PUT(request: NextRequest) {
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

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Adicionar ID do usuário que está fazendo a atualização
    body.updatedBy = authResult.session!.user.id;

    // Buscar configuração atual para comparação
    const currentConfig = await XpAvulsoConfigService.getConfig();

    // Atualizar configurações
    const updatedConfig = await XpAvulsoConfigService.updateConfig(body);

    // Log de auditoria detalhado
    await AuditLogger.logAdminAction(
      "UPDATE_XP_AVULSO_CONFIG",
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
        newConfig: {
          dailyLimitPoints: updatedConfig.dailyLimitPoints,
          dailyLimitGrants: updatedConfig.dailyLimitGrants,
          maxPointsPerGrant: updatedConfig.maxPointsPerGrant,
          minPointsPerGrant: updatedConfig.minPointsPerGrant,
          requireJustification: updatedConfig.requireJustification,
          autoApproveLimit: updatedConfig.autoApproveLimit,
          maxGrantsPerAttendant: updatedConfig.maxGrantsPerAttendant,
          cooldownMinutes: updatedConfig.cooldownMinutes,
        },
        changes: Object.keys(body).filter(
          (key) =>
            key !== "updatedBy" &&
            currentConfig[key as keyof typeof currentConfig] !== body[key],
        ),
      },
      request,
    );

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
      data: updatedConfig,
    });
  } catch (error) {
    console.error("Erro ao atualizar configurações de XP Avulso:", error);

    // Tratar erros específicos
    if (error instanceof Error) {
      if (error.message.includes("Dados inválidos")) {
        return NextResponse.json(
          { error: "Dados inválidos", details: error.message },
          { status: 400 },
        );
      }
      if (error.message.includes("não pode ser maior")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gamification/xp-avulso-config/reset
 * Resetar configurações para valores padrão
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma requisição de reset
    const { pathname } = new URL(request.url);
    if (!pathname.endsWith("/reset")) {
      return NextResponse.json(
        { error: "Endpoint não encontrado" },
        { status: 404 },
      );
    }

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
      },
      request,
    );

    return NextResponse.json({
      success: true,
      message: "Configurações resetadas para valores padrão",
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
