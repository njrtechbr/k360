import { BackupStorage } from "../backupStorage";
import { BackupMetadata } from "@/types/backup";

/**
 * Exemplo de uso da classe BackupStorage
 *
 * Este arquivo demonstra como usar todas as funcionalidades
 * da classe BackupStorage para gerenciar metadados de backup.
 */

async function exemploBackupStorage() {
  console.log("=== Exemplo de uso do BackupStorage ===\n");

  try {
    // 1. Inicializar o sistema de storage
    console.log("1. Inicializando BackupStorage...");
    await BackupStorage.initialize();
    console.log("✅ BackupStorage inicializado com sucesso\n");

    // 2. Criar metadados de exemplo
    const backupMetadata: BackupMetadata = {
      id: `backup-${Date.now()}`,
      filename: `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`,
      filepath: `./backups/files/backup_${Date.now()}.sql`,
      size: 1024 * 1024 * 5, // 5MB
      checksum: "sha256:abc123def456...",
      createdAt: new Date(),
      createdBy: "admin@example.com",
      status: "success",
      duration: 30000, // 30 segundos
      databaseVersion: "15.0",
      schemaVersion: "1.0",
    };

    // 3. Adicionar backup ao registry
    console.log("2. Adicionando backup ao registry...");
    await BackupStorage.addBackup(backupMetadata);
    console.log(`✅ Backup ${backupMetadata.id} adicionado com sucesso\n`);

    // 4. Listar todos os backups
    console.log("3. Listando todos os backups...");
    const allBackups = await BackupStorage.listBackups();
    console.log(`📋 Total de backups: ${allBackups.length}`);
    allBackups.forEach((backup) => {
      console.log(
        `   - ${backup.filename} (${backup.status}) - ${(backup.size / 1024 / 1024).toFixed(2)}MB`,
      );
    });
    console.log();

    // 5. Buscar backup específico
    console.log("4. Buscando backup específico...");
    const foundBackup = await BackupStorage.getBackup(backupMetadata.id);
    if (foundBackup) {
      console.log(`✅ Backup encontrado: ${foundBackup.filename}`);
    } else {
      console.log("❌ Backup não encontrado");
    }
    console.log();

    // 6. Filtrar backups por status
    console.log("5. Filtrando backups por status...");
    const successfulBackups = await BackupStorage.listBackups({
      status: "success",
    });
    console.log(`📊 Backups bem-sucedidos: ${successfulBackups.length}`);
    console.log();

    // 7. Obter estatísticas
    console.log("6. Obtendo estatísticas dos backups...");
    const stats = await BackupStorage.getBackupStats();
    console.log(`📈 Estatísticas:`);
    console.log(`   - Total: ${stats.total}`);
    console.log(`   - Sucessos: ${stats.successful}`);
    console.log(`   - Falhas: ${stats.failed}`);
    console.log(`   - Em progresso: ${stats.inProgress}`);
    console.log(
      `   - Tamanho total: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
    );
    if (stats.oldestBackup) {
      console.log(
        `   - Backup mais antigo: ${stats.oldestBackup.toLocaleString()}`,
      );
    }
    if (stats.newestBackup) {
      console.log(
        `   - Backup mais recente: ${stats.newestBackup.toLocaleString()}`,
      );
    }
    console.log();

    // 8. Buscar backups por termo
    console.log("7. Buscando backups por termo...");
    const searchResults = await BackupStorage.searchBackups("backup");
    console.log(
      `🔍 Resultados da busca por "backup": ${searchResults.length} encontrados`,
    );
    console.log();

    // 9. Atualizar backup
    console.log("8. Atualizando metadados do backup...");
    await BackupStorage.updateBackup(backupMetadata.id, {
      status: "success",
      duration: 25000, // Atualizar duração
    });
    console.log("✅ Backup atualizado com sucesso\n");

    // 10. Verificar se precisa de limpeza
    console.log("9. Verificando necessidade de limpeza...");
    const needsCleanup = await BackupStorage.shouldPerformCleanup();
    console.log(`🧹 Precisa de limpeza: ${needsCleanup ? "Sim" : "Não"}\n`);

    // 11. Validar integridade do registry
    console.log("10. Validando integridade do registry...");
    const validation = await BackupStorage.validateRegistry();
    console.log(`✅ Registry válido: ${validation.isValid}`);
    if (validation.issues.length > 0) {
      console.log(`⚠️  Problemas encontrados: ${validation.issues.length}`);
      validation.issues.forEach((issue) => console.log(`   - ${issue}`));
    }
    if (validation.fixedIssues.length > 0) {
      console.log(`🔧 Problemas corrigidos: ${validation.fixedIssues.length}`);
      validation.fixedIssues.forEach((fix) => console.log(`   - ${fix}`));
    }
    console.log();

    // 12. Obter configurações
    console.log("11. Obtendo configurações atuais...");
    const settings = await BackupStorage.getSettings();
    console.log(`⚙️  Configurações:`);
    console.log(`   - Máximo de backups: ${settings.maxBackups}`);
    console.log(`   - Dias de retenção: ${settings.retentionDays}`);
    console.log(`   - Diretório padrão: ${settings.defaultDirectory}`);
    console.log();

    // 13. Demonstrar limpeza de backups falhados (simulação)
    console.log("12. Simulando limpeza de backups falhados...");

    // Adicionar um backup falhado para demonstração
    const failedBackup: BackupMetadata = {
      id: `failed-backup-${Date.now()}`,
      filename: "failed_backup.sql",
      filepath: "./backups/files/failed_backup.sql",
      size: 0,
      checksum: "",
      createdAt: new Date(),
      status: "failed",
      duration: 0,
      databaseVersion: "15.0",
      schemaVersion: "1.0",
    };

    await BackupStorage.addBackup(failedBackup);

    const cleanupResult = await BackupStorage.cleanupFailedBackups();
    console.log(`🗑️  Limpeza de backups falhados:`);
    console.log(`   - Removidos: ${cleanupResult.removed}`);
    console.log(
      `   - Espaço liberado: ${(cleanupResult.freedSpace / 1024 / 1024).toFixed(2)}MB`,
    );
    if (cleanupResult.errors.length > 0) {
      console.log(`   - Erros: ${cleanupResult.errors.length}`);
    }
    console.log();

    // 14. Remover backup de exemplo
    console.log("13. Removendo backup de exemplo...");
    await BackupStorage.removeBackup(backupMetadata.id);
    console.log("✅ Backup removido com sucesso\n");

    console.log("=== Exemplo concluído com sucesso! ===");
  } catch (error) {
    console.error("❌ Erro durante execução do exemplo:", error);
  }
}

// Executar exemplo se este arquivo for executado diretamente
if (require.main === module) {
  exemploBackupStorage().catch(console.error);
}

export { exemploBackupStorage };
