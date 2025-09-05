/**
 * Configurações do sistema de backup
 */

export interface BackupConfig {
  directory: string;
  maxSizeGB: number;
  retentionDays: number;
  maxConcurrent: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  pgdumpPath: string;
  pgdumpTimeout: number;
}

export interface SecurityConfig {
  maxBackupsPerUser: number;
  maxBackupSizeGB: number;
  allowedDirectories: string[];
  encryptBackups: boolean;
  auditLogRetentionDays: number;
}

export interface MaintenanceConfig {
  autoCleanupEnabled: boolean;
  cleanupSchedule: string; // cron expression
  maxBackupsToKeep: number;
  maxStorageSizeGB: number;
  compressionThresholdMB: number;
}

/**
 * Configuração padrão do sistema de backup
 */
export const defaultBackupConfig: BackupConfig = {
  directory: process.env.BACKUP_DIRECTORY || './backups',
  maxSizeGB: parseInt(process.env.BACKUP_MAX_SIZE_GB || '10'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  maxConcurrent: parseInt(process.env.BACKUP_MAX_CONCURRENT || '2'),
  enableCompression: process.env.BACKUP_ENABLE_COMPRESSION === 'true',
  enableEncryption: process.env.BACKUP_ENABLE_ENCRYPTION === 'true',
  pgdumpPath: process.env.PGDUMP_PATH || 'pg_dump',
  pgdumpTimeout: parseInt(process.env.PGDUMP_TIMEOUT || '3600'),
};

/**
 * Configuração de segurança padrão
 */
export const defaultSecurityConfig: SecurityConfig = {
  maxBackupsPerUser: 10,
  maxBackupSizeGB: 5,
  allowedDirectories: ['./backups/files'],
  encryptBackups: false,
  auditLogRetentionDays: 90,
};

/**
 * Configuração de manutenção padrão
 */
export const defaultMaintenanceConfig: MaintenanceConfig = {
  autoCleanupEnabled: true,
  cleanupSchedule: '0 2 * * *', // Todo dia às 2h da manhã
  maxBackupsToKeep: 50,
  maxStorageSizeGB: 100,
  compressionThresholdMB: 100,
};

/**
 * Permissões de backup por role
 */
export const backupPermissions = {
  SUPERADMIN: ['create', 'list', 'download', 'delete', 'validate'],
  ADMIN: ['create', 'list', 'download', 'delete', 'validate'],
  SUPERVISOR: ['list', 'download'],
  USUARIO: [] // Sem acesso
} as const;

/**
 * Valida se um usuário tem permissão para uma operação de backup
 */
export function hasBackupPermission(
  userRole: string,
  operation: string
): boolean {
  const permissions = backupPermissions[userRole as keyof typeof backupPermissions];
  return permissions ? permissions.includes(operation as any) : false;
}