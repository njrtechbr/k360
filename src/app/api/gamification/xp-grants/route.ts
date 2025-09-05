import { NextRequest, NextResponse } from 'next/server';
import { XpAvulsoService, GrantXpSchema, GrantHistoryFiltersSchema } from '@/services/xpAvulsoService';
import { AuthMiddleware, AuthConfigs, AuditLogger } from '@/lib/auth-middleware';
import { xpGrantRateLimiter, xpAvulsoRateLimiter } from '@/lib/rate-limit';

/**
 * POST /api/gamification/xp-grants
 * Conceder XP avulso para um atendente
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar rate limiting para concessões
    const limitResult = await xpGrantRateLimiter.checkLimit(request);
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas de concessão. Tente novamente em alguns instantes.',
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString()
          }
        }
      );
    }

    // Verificar autenticação e autorização (apenas ADMIN e SUPERADMIN)
    const authResult = await AuthMiddleware.checkAuth(request, AuthConfigs.adminOnly);

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const session = authResult.session!;

    // Obter dados do corpo da requisição
    const body = await request.json();

    // Validar dados de entrada
    const validationResult = GrantXpSchema.safeParse({
      ...body,
      grantedBy: session.user.id // Usar ID do usuário autenticado
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const grantData = validationResult.data;

    // Conceder XP avulso
    const xpGrant = await XpAvulsoService.grantXp(grantData);

    // Registrar log de auditoria
    await AuditLogger.logAdminAction(
      session.user.id,
      'XP_GRANT_CREATED',
      {
        grantId: xpGrant.id,
        attendantId: grantData.attendantId,
        typeId: grantData.typeId,
        points: xpGrant.points,
        justification: grantData.justification
      }
    );

    // Preparar dados de resposta incluindo informações de notificação
    const responseData = {
      id: xpGrant.id,
      attendant: {
        id: xpGrant.attendant.id,
        name: xpGrant.attendant.name
      },
      type: {
        id: xpGrant.type.id,
        name: xpGrant.type.name,
        points: xpGrant.type.points
      },
      points: xpGrant.points,
      justification: xpGrant.justification,
      grantedAt: xpGrant.grantedAt,
      granter: {
        id: xpGrant.granter.id,
        name: xpGrant.granter.name
      }
    };

    // Adicionar dados de notificação se disponíveis
    const notificationData = (xpGrant as any).notificationData;
    if (notificationData) {
      (responseData as any).notification = {
        xpAmount: notificationData.xpAmount,
        typeName: notificationData.typeName,
        justification: notificationData.justification,
        levelUp: notificationData.levelUp,
        achievementsUnlocked: notificationData.achievementsUnlocked
      };
    }

    // Retornar sucesso com dados da concessão
    return NextResponse.json(
      {
        success: true,
        message: 'XP avulso concedido com sucesso',
        data: responseData
      },
      { 
        status: 201,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString()
        }
      }
    );

  } catch (error) {
    console.error('Erro ao conceder XP avulso:', error);

    // Tratar erros específicos
    if (error instanceof Error) {
      // Erros de validação ou regras de negócio
      if (error.message.includes('não encontrado') || 
          error.message.includes('inativo') ||
          error.message.includes('temporada') ||
          error.message.includes('limite')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    // Erro interno do servidor
    return NextResponse.json(
      { error: 'Erro interno do servidor ao conceder XP avulso' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gamification/xp-grants
 * Buscar histórico de concessões de XP avulso com filtros
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar rate limiting
    const limitResult = await xpAvulsoRateLimiter.checkLimit(request);
    
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas. Tente novamente em alguns instantes.',
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString()
          }
        }
      );
    }

    // Verificar autenticação (supervisores e acima podem visualizar)
    const authResult = await AuthMiddleware.checkAuth(request, AuthConfigs.supervisorAndAbove);

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Obter parâmetros de query
    const { searchParams } = new URL(request.url);
    
    // Construir filtros
    const filters: any = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // Filtros opcionais
    if (searchParams.get('attendantId')) {
      filters.attendantId = searchParams.get('attendantId');
    }

    if (searchParams.get('typeId')) {
      filters.typeId = searchParams.get('typeId');
    }

    if (searchParams.get('granterId')) {
      filters.granterId = searchParams.get('granterId');
    }

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }

    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    if (searchParams.get('minPoints')) {
      filters.minPoints = parseInt(searchParams.get('minPoints')!);
    }

    if (searchParams.get('maxPoints')) {
      filters.maxPoints = parseInt(searchParams.get('maxPoints')!);
    }

    // Parâmetros de ordenação
    if (searchParams.get('sortBy')) {
      filters.sortBy = searchParams.get('sortBy');
    }

    if (searchParams.get('sortOrder')) {
      filters.sortOrder = searchParams.get('sortOrder');
    }

    // Validar filtros
    const validationResult = GrantHistoryFiltersSchema.safeParse(filters);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros de filtro inválidos',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    // Buscar histórico de concessões
    const result = await XpAvulsoService.findGrantHistory(validationResult.data);

    // Retornar dados
    return NextResponse.json(
      {
        success: true,
        data: {
          grants: result.grants.map(grant => ({
            id: grant.id,
            attendant: {
              id: grant.attendant.id,
              name: grant.attendant.name
            },
            type: {
              id: grant.type.id,
              name: grant.type.name,
              category: grant.type.category,
              icon: grant.type.icon,
              color: grant.type.color
            },
            points: grant.points,
            justification: grant.justification,
            grantedAt: grant.grantedAt,
            granter: {
              id: grant.granter.id,
              name: grant.granter.name,
              role: grant.granter.role
            }
          })),
          pagination: {
            page: result.page,
            limit: validationResult.data.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        }
      },
      {
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString()
        }
      }
    );

  } catch (error) {
    console.error('Erro ao buscar histórico de XP avulso:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar histórico' },
      { status: 500 }
    );
  }
}