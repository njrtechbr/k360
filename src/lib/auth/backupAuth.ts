import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export interface BackupAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: Role;
  };
  error?: string;
}

export interface BackupPermissions {
  canCreate: boolean;
  canList: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canValidate: boolean;
}

/**
 * Permissões de backup por role
 */
export const BACKUP_PERMISSIONS: Record<Role, BackupPermissions> = {
  SUPERADMIN: {
    canCreate: true,
    canList: true,
    canDownload: true,
    canDelete: true,
    canValidate: true,
  },
  ADMIN: {
    canCreate: true,
    canList: true,
    canDownload: true,
    canDelete: true,
    canValidate: true,
  },
  SUPERVISOR: {
    canCreate: false,
    canList: true,
    canDownload: true,
    canDelete: false,
    canValidate: false,
  },
  USUARIO: {
    canCreate: false,
    canList: false,
    canDownload: false,
    canDelete: false,
    canValidate: false,
  },
};

/**
 * Verifica autenticação e autorização para operações de backup
 */
export async function authenticateBackupRequest(
  request: NextRequest,
): Promise<BackupAuthResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return {
        success: false,
        error: "Usuário não autenticado",
      };
    }

    const user = {
      id: session.user.id,
      email: session.user.email || "",
      role: session.user.role as Role,
    };

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Erro na autenticação de backup:", error);
    return {
      success: false,
      error: "Erro interno de autenticação",
    };
  }
}

/**
 * Verifica se o usuário tem permissão para uma operação específica
 */
export function hasBackupPermission(
  userRole: Role,
  operation: keyof BackupPermissions,
): boolean {
  const permissions = BACKUP_PERMISSIONS[userRole];
  return permissions[operation];
}

/**
 * Middleware de autorização para operações de backup
 */
export async function authorizeBackupOperation(
  request: NextRequest,
  operation: keyof BackupPermissions,
): Promise<BackupAuthResult> {
  const authResult = await authenticateBackupRequest(request);

  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  const hasPermission = hasBackupPermission(authResult.user.role, operation);

  if (!hasPermission) {
    return {
      success: false,
      error: `Usuário não tem permissão para ${operation} backups`,
    };
  }

  return authResult;
}

/**
 * Cria resposta de erro de autorização
 */
export function createAuthErrorResponse(error: string, status: number = 401) {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
