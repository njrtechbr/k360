import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { 
  authorizeBackupOperation, 
  BackupAuthResult, 
  createAuthErrorResponse,
  BackupPermissions 
} from '@/lib/auth/backupAuth';
import { 
  applyRateLimit, 
  createRateLimitResponse 
} from '@/lib/rateLimit/backupRateLimit';
import { 
  BackupAuditLogger, 
  createAuditEntry 
} from '@/services/backupAuditLog';

export interface SecurityMiddlewareResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: Role;
  };
  error?: string;
  response?: Response;
}

export interface SecurityContext {
  user: {
    id: string;
    email: string;
    role: Role;
  };
  ipAddress: string;
  userAgent: string;
  operation: keyof BackupPermissions;
}

/**
 * Middleware de segurança completo para operações de backup
 */
export async function applyBackupSecurity(
  request: NextRequest,
  operation: keyof BackupPermissions
): Promise<SecurityMiddlewareResult> {
  const startTime = Date.now();
  let auditLogged = false;

  try {
    // 1. Autenticação e Autorização
    const authResult = await authorizeBackupOperation(request, operation);
    
    if (!authResult.success || !authResult.user) {
      // Log da tentativa de acesso não autorizada
      await logUnauthorizedAttempt(request, operation, authResult.error);
      
      return {
        success: false,
        error: authResult.error,
        response: createAuthErrorResponse(authResult.error || 'Acesso negado'),
      };
    }

    const user = authResult.user;
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 2. Rate Limiting
    const rateLimitResult = applyRateLimit(user.id, user.role, operation, request);
    
    if (!rateLimitResult.allowed) {
      // Log da tentativa de rate limit excedido
      await BackupAuditLogger.logOperation(
        createAuditEntry(operation, user, false, {
          error: 'Rate limit excedido',
          ipAddress,
          userAgent,
          metadata: {
            remaining: rateLimitResult.remaining,
            retryAfter: rateLimitResult.retryAfter,
          },
        })
      );
      auditLogged = true;

      return {
        success: false,
        error: 'Rate limit excedido',
        response: createRateLimitResponse(rateLimitResult),
      };
    }

    // 3. Log de acesso autorizado
    await BackupAuditLogger.logOperation(
      createAuditEntry(operation, user, true, {
        ipAddress,
        userAgent,
        metadata: {
          rateLimitRemaining: rateLimitResult.remaining,
          processingTime: Date.now() - startTime,
        },
      })
    );
    auditLogged = true;

    return {
      success: true,
      user,
    };

  } catch (error) {
    console.error('Erro no middleware de segurança de backup:', error);
    
    // Log do erro se ainda não foi logado
    if (!auditLogged) {
      try {
        await BackupAuditLogger.logOperation({
          userId: 'unknown',
          userEmail: 'unknown',
          userRole: 'USUARIO',
          operation,
          success: false,
          error: 'Erro interno no middleware de segurança',
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
        });
      } catch (logError) {
        console.error('Erro ao registrar audit log:', logError);
      }
    }

    return {
      success: false,
      error: 'Erro interno de segurança',
      response: createAuthErrorResponse('Erro interno de segurança', 500),
    };
  }
}

/**
 * Wrapper para operações de backup com segurança completa
 */
export async function withBackupSecurity<T>(
  request: NextRequest,
  operation: keyof BackupPermissions,
  handler: (context: SecurityContext) => Promise<T>
): Promise<Response> {
  const securityResult = await applyBackupSecurity(request, operation);

  if (!securityResult.success || !securityResult.user) {
    return securityResult.response || createAuthErrorResponse('Acesso negado');
  }

  const context: SecurityContext = {
    user: securityResult.user,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    operation,
  };

  try {
    const result = await handler(context);
    
    // Log de operação bem-sucedida
    await BackupAuditLogger.logOperation(
      createAuditEntry(operation, context.user, true, {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          resultType: typeof result,
        },
      })
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error(`Erro na operação ${operation}:`, error);
    
    // Log de operação com falha
    await BackupAuditLogger.logOperation(
      createAuditEntry(operation, context.user, false, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno na operação',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * Registra tentativas de acesso não autorizado
 */
async function logUnauthorizedAttempt(
  request: NextRequest,
  operation: keyof BackupPermissions,
  error?: string
): Promise<void> {
  try {
    await BackupAuditLogger.logOperation({
      userId: 'unauthorized',
      userEmail: 'unauthorized',
      userRole: 'USUARIO',
      operation,
      success: false,
      error: error || 'Acesso não autorizado',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        url: request.url,
        method: request.method,
      },
    });
  } catch (logError) {
    console.error('Erro ao registrar tentativa não autorizada:', logError);
  }
}

/**
 * Extrai IP do cliente da requisição
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }

  // Fallback para desenvolvimento
  return 'localhost';
}

/**
 * Valida se uma operação é permitida para o contexto atual
 */
export function validateOperation(
  context: SecurityContext,
  requiredOperation: keyof BackupPermissions
): boolean {
  return context.operation === requiredOperation;
}

/**
 * Cria resposta de sucesso padronizada
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Cria resposta de erro padronizada
 */
export function createErrorResponse(error: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}