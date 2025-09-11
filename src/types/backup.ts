export interface BackupOptions {
  filename?: string;
  directory?: string;
  includeData?: boolean;
  includeSchema?: boolean;
  compress?: boolean;
}

export interface BackupResult {
  success: boolean;
  filename: string;
  filepath: string;
  size: number;
  checksum: string;
  duration: number;
  error?: string;
}

export interface BackupMetadata {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  checksum: string;
  createdAt: Date;
  createdBy?: string;
  status: "success" | "failed" | "in_progress";
  duration: number;
  databaseVersion: string;
  schemaVersion: string;
}

export interface BackupRegistry {
  backups: BackupMetadata[];
  lastCleanup: Date;
  settings: {
    maxBackups: number;
    retentionDays: number;
    defaultDirectory: string;
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  checksum: string;
  size: number;
  hasValidStructure: boolean;
  errors: string[];
}

export interface CleanupResult {
  removed: number;
  freedSpace: number;
  errors: string[];
}

export interface BackupStats {
  total: number;
  successful: number;
  failed: number;
  inProgress: number;
  totalSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
}
