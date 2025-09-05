import { NextRequest, NextResponse } from 'next/server';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware, AuthConfigs, AuditLogger } from '@/lib/auth-middleware';
import { xpAvulsoRateLimiter } from '@/lib/rate-limit';

// GET /api/gamification/xp-types
// Buscar todos os tipos de XP com filtros opcionais
export const GET = AuthMiddleware.withAuth(
  AuthConfigs.adminOnly,
  async (request: NextRequest, session) => {
    try {

      const { searchParams } = new URL(request.url);
      const activeOnly = searchParams.get('activeOnly') === 'true';
      const category = searchParams.get('category');

      // Aplicar rate limiting
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

      // Buscar tipos de XP
      let xpTypes = await XpAvulsoService.findAllXpTypes(activeOnly);

      // Filtrar por categoria se especificado
      if (category) {
        xpTypes = xpTypes.filter(type => type.category === category);
      }

      // Calcular estatísticas
      const stats = {
        total: xpTypes.length,
        active: xpTypes.filter(type => type.active).length,
        inactive: xpTypes.filter(type => !type.active).length,
        categories: [...new Set(xpTypes.map(type => type.category))],
        totalUsage: xpTypes.reduce((sum, type) => sum + (type._count?.xpGrants || 0), 0)
      };

      // Log de auditoria
      await AuditLogger.logAdminAction(
        'VIEW_XP_TYPES',
        session.user.id,
        { activeOnly, category, totalFound: xpTypes.length },
        request
      );

      const response = NextResponse.json({
        xpTypes,
        stats
      });

      // Adicionar headers de rate limiting
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(limitResult.resetTime / 1000).toString());

      return response;
    } catch (error) {
      console.error('Erro ao buscar tipos de XP:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  }
);

// POST /api/gamification/xp-types
// Criar novo tipo de XP
export const POST = AuthMiddleware.withAuth(
  AuthConfigs.adminOnly,
  async (request: NextRequest, session) => {
    try {

      // Aplicar rate limiting
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

      const body = await request.json();
      const {
        name,
        description,
        points,
        category = 'general',
        icon = 'star',
        color = '#3B82F6'
      } = body;

      // Validar dados obrigatórios
      if (!name || !description || !points) {
        return NextResponse.json(
          { error: 'Dados obrigatórios: name, description, points' },
          { status: 400 }
        );
      }

      // Validar pontos
      if (typeof points !== 'number' || points <= 0) {
        return NextResponse.json(
          { error: 'Pontos devem ser um número positivo' },
          { status: 400 }
        );
      }

      // Criar tipo de XP
      const xpType = await XpAvulsoService.createXpType({
        name,
        description,
        points,
        category,
        icon,
        color,
        createdBy: session.user.id
      });

      // Log de auditoria
      await AuditLogger.logAdminAction(
        'CREATE_XP_TYPE',
        session.user.id,
        { xpTypeId: xpType.id, name, points, category },
        request
      );

      const response = NextResponse.json(xpType, { status: 201 });

      // Adicionar headers de rate limiting
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(limitResult.resetTime / 1000).toString());

      return response;
    } catch (error) {
      console.error('Erro ao criar tipo de XP:', error);
      
      // Tratar erros específicos
      if (error instanceof Error) {
        if (error.message.includes('já está em uso')) {
          return NextResponse.json(
            { error: error.message },
            { status: 409 }
          );
        }
        if (error.message.includes('Dados inválidos')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  }
);