import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BackupService } from "@/services/backupService";
import { Role } from "@prisma/client";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem excluir backups
    const userRole = session.user.role as Role;
    if (!["ADMIN", "SUPERADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Permissões insuficientes para excluir backups" },
        { status: 403 },
      );
    }

    const backupId = params.id;

    // Validar formato do ID
    if (!backupId || typeof backupId !== "string") {
      return NextResponse.json(
        { error: "ID do backup inválido" },
        { status: 400 },
      );
    }

    // Verificar se o backup existe
    const backupInfo = await BackupService.getBackupInfo(backupId);

    if (!backupInfo) {
      return NextResponse.json(
        { error: "Backup não encontrado" },
        { status: 404 },
      );
    }

    // Verificar se o backup não está em progresso
    if (backupInfo.status === "in_progress") {
      return NextResponse.json(
        { error: "Não é possível excluir backup em progresso" },
        { status: 400 },
      );
    }

    // Log de auditoria antes da exclusão
    console.log(
      `[BACKUP_AUDIT] Exclusão iniciada por usuário ${session.user.id} (${userRole}): ${backupInfo.filename}`,
    );

    // Excluir backup usando o serviço
    const deleteResult = await BackupService.deleteBackup(backupId);

    if (!deleteResult) {
      return NextResponse.json(
        { error: "Falha ao excluir backup" },
        { status: 500 },
      );
    }

    // Log de auditoria após exclusão bem-sucedida
    console.log(
      `[BACKUP_AUDIT] Backup excluído com sucesso por usuário ${session.user.id} (${userRole}): ${backupInfo.filename}`,
    );

    return NextResponse.json({
      success: true,
      message: "Backup excluído com sucesso",
      deletedBackup: {
        id: backupId,
        filename: backupInfo.filename,
        deletedAt: new Date().toISOString(),
        deletedBy: session.user.id,
      },
    });
  } catch (error) {
    console.error("[BACKUP_DELETE_ERROR]", error);

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar permissões - ADMIN, SUPERADMIN e SUPERVISOR podem ver detalhes
    const userRole = session.user.role as Role;
    const allowedRoles = ["ADMIN", "SUPERADMIN", "SUPERVISOR"];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Permissões insuficientes para acessar detalhes do backup" },
        { status: 403 },
      );
    }

    const backupId = params.id;

    // Validar formato do ID
    if (!backupId || typeof backupId !== "string") {
      return NextResponse.json(
        { error: "ID do backup inválido" },
        { status: 400 },
      );
    }

    // Buscar informações do backup
    const backupInfo = await BackupService.getBackupInfo(backupId);

    if (!backupInfo) {
      return NextResponse.json(
        { error: "Backup não encontrado" },
        { status: 404 },
      );
    }

    // Filtrar dados sensíveis baseado no role
    const sanitizedBackup = { ...backupInfo };

    // SUPERVISOR não pode ver informações de criação
    if (userRole === "SUPERVISOR") {
      delete sanitizedBackup.createdBy;
    }

    return NextResponse.json({
      success: true,
      backup: sanitizedBackup,
    });
  } catch (error) {
    console.error("[BACKUP_GET_ERROR]", error);

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}
