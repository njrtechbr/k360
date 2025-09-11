import { NextRequest, NextResponse } from "next/server";
import { XpAvulsoService } from "@/services/xpAvulsoService";
import {
  AuthMiddleware,
  AuthConfigs,
  AuditLogger,
} from "@/lib/auth-middleware";
import { xpAvulsoRateLimiter } from "@/lib/rate-limit";

// GET /api/gamification/xp-types
// Buscar todos os tipos de XP com filtros opcionais
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

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const category = searchParams.get("category");

    // Buscar tipos de XP
    let xpTypes = await XpAvulsoService.findAllXpTypes(activeOnly);

    // Filtrar por categoria se especificado
    if (category) {
      xpTypes = xpTypes.filter((type) => type.category === category);
    }

    // Calcular estatísticas
    const stats = {
      total: xpTypes.length,
      active: xpTypes.filter((type) => type.active).length,
      inactive: xpTypes.filter((type) => !type.active).length,
      categories: [...new Set(xpTypes.map((type) => type.category))],
      totalUsage: xpTypes.reduce(
        (sum, type) => sum + (type._count?.xpGrants || 0),
        0,
      ),
    };

    // Log de auditoria
    await AuditLogger.logAdminAction(
      "VIEW_XP_TYPES",
      authResult.session!.user.id,
      { activeOnly, category, totalFound: xpTypes.length },
      request,
    );

    return NextResponse.json({
      success: true,
      data: xpTypes,
      stats,
    });
  } catch (error) {
    console.error("Erro ao buscar tipos de XP:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST /api/gamification/xp-types
// Criar novo tipo de XP
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

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const {
      name,
      description,
      points,
      category = "general",
      icon = "star",
      color = "#3B82F6",
    } = body;

    // Validar dados básicos primeiro
    if (!name || !description || typeof points !== "number" || points <= 0) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details:
            "Nome, descrição são obrigatórios e pontos deve ser um número positivo",
        },
        { status: 400 },
      );
    }

    try {
      const validatedData = {
        name,
        description,
        points,
        category,
        icon,
        color,
        createdBy: authResult.session!.user.id,
      };

      // Criar tipo de XP
      const xpType = await XpAvulsoService.createXpType(validatedData);

      // Log de auditoria
      await AuditLogger.logAdminAction(
        "CREATE_XP_TYPE",
        authResult.session!.user.id,
        { xpTypeId: xpType.id, name, points, category },
        request,
      );

      return NextResponse.json(
        {
          success: true,
          message: "Tipo de XP criado com sucesso",
          data: xpType,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Erro ao criar tipo de XP:", error);

      // Tratar erros específicos
      if (error instanceof Error) {
        if (error.message.includes("já está em uso")) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error.message.includes("Dados inválidos")) {
          return NextResponse.json(
            { error: "Dados inválidos", details: error.message },
            { status: 400 },
          );
        }
      }

      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
