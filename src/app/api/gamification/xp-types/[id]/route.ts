import { NextRequest, NextResponse } from "next/server";
import { XpAvulsoService } from "@/services/xpAvulsoService";
import {
  AuthMiddleware,
  AuthConfigs,
  AuditLogger,
} from "@/lib/auth-middleware";
import { xpAvulsoRateLimiter } from "@/lib/rate-limit";

// PUT /api/gamification/xp-types/[id]
// Atualizar tipo de XP existente
export const PUT = AuthMiddleware.withAuth(
  AuthConfigs.adminOnly,
  async (
    request: NextRequest,
    session,
    { params }: { params: Promise<{ id: string }> },
  ) => {
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

      const { id } = await params;
      const body = await request.json();
      const { name, description, points, category, icon, color } = body;

      // Validar se pelo menos um campo foi fornecido
      if (!name && !description && !points && !category && !icon && !color) {
        return NextResponse.json(
          { error: "Pelo menos um campo deve ser fornecido para atualização" },
          { status: 400 },
        );
      }

      // Validar pontos se fornecido
      if (points !== undefined && (typeof points !== "number" || points <= 0)) {
        return NextResponse.json(
          { error: "Pontos devem ser um número positivo" },
          { status: 400 },
        );
      }

      // Atualizar tipo de XP
      const updatedXpType = await XpAvulsoService.updateXpType(id, {
        name,
        description,
        points,
        category,
        icon,
        color,
      });

      // Log de auditoria
      await AuditLogger.logAdminAction(
        "UPDATE_XP_TYPE",
        session.user.id,
        {
          xpTypeId: id,
          changes: { name, description, points, category, icon, color },
        },
        request,
      );

      const response = NextResponse.json(updatedXpType);

      // Adicionar headers de rate limiting
      response.headers.set("X-RateLimit-Limit", "30");
      response.headers.set(
        "X-RateLimit-Remaining",
        limitResult.remaining.toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(limitResult.resetTime / 1000).toString(),
      );

      return response;
    } catch (error) {
      console.error("Erro ao atualizar tipo de XP:", error);

      // Tratar erros específicos
      if (error instanceof Error) {
        if (error.message.includes("não encontrado")) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error.message.includes("já está em uso")) {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        if (error.message.includes("Dados inválidos")) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }

      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      );
    }
  },
);

// DELETE /api/gamification/xp-types/[id]
// Desativar tipo de XP (não deleta, apenas alterna status)
export const DELETE = AuthMiddleware.withAuth(
  AuthConfigs.adminOnly,
  async (
    request: NextRequest,
    session,
    { params }: { params: Promise<{ id: string }> },
  ) => {
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

      const { id } = await params;

      // Alternar status do tipo de XP
      const updatedXpType = await XpAvulsoService.toggleXpTypeStatus(id);

      const action = updatedXpType.active ? "ativado" : "desativado";

      // Log de auditoria
      await AuditLogger.logAdminAction(
        "TOGGLE_XP_TYPE_STATUS",
        session.user.id,
        { xpTypeId: id, newStatus: updatedXpType.active, action },
        request,
      );

      const response = NextResponse.json({
        message: `Tipo de XP ${action} com sucesso`,
        xpType: updatedXpType,
      });

      // Adicionar headers de rate limiting
      response.headers.set("X-RateLimit-Limit", "30");
      response.headers.set(
        "X-RateLimit-Remaining",
        limitResult.remaining.toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(limitResult.resetTime / 1000).toString(),
      );

      return response;
    } catch (error) {
      console.error("Erro ao alterar status do tipo de XP:", error);

      // Tratar erros específicos
      if (error instanceof Error) {
        if (error.message.includes("não encontrado")) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
      }

      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      );
    }
  },
);

// GET /api/gamification/xp-types/[id]
// Buscar tipo de XP específico
export const GET = AuthMiddleware.withAuth(
  AuthConfigs.adminOnly,
  async (
    request: NextRequest,
    session,
    { params }: { params: Promise<{ id: string }> },
  ) => {
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

      const { id } = await params;

      // Buscar todos os tipos e filtrar pelo ID (usando método existente)
      const allXpTypes = await XpAvulsoService.findAllXpTypes(false);
      const xpType = allXpTypes.find((type) => type.id === id);

      if (!xpType) {
        return NextResponse.json(
          { error: "Tipo de XP não encontrado" },
          { status: 404 },
        );
      }

      // Log de auditoria
      await AuditLogger.logAdminAction(
        "VIEW_XP_TYPE",
        session.user.id,
        { xpTypeId: id, xpTypeName: xpType.name },
        request,
      );

      const response = NextResponse.json(xpType);

      // Adicionar headers de rate limiting
      response.headers.set("X-RateLimit-Limit", "30");
      response.headers.set(
        "X-RateLimit-Remaining",
        limitResult.remaining.toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(limitResult.resetTime / 1000).toString(),
      );

      return response;
    } catch (error) {
      console.error("Erro ao buscar tipo de XP:", error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      );
    }
  },
);
