#!/usr/bin/env tsx

import { Command } from 'commander';
import { BackupService } from '@/services/backupService';
import { BackupValidator } from '@/services/backupValidator';
import { BackupStorage } from '@/services/backupStorage';
import path from 'path';
import fs from 'fs';

// Tipos para opções do CLI
interface CreateOptions {
  output?: string;
  name?: string;
  compress?: boolean;
  schemaOnly?: boolean;
  dataOnly?: boolean;
  verbose?: boolean;
}

interface ListOptions {
  format?: 'table' | 'json';
  limit?: number;
  verbose?: boolean;
}

interface ValidateOptions {
  verbose?: boolean;
  checksum?: boolean;
}

interface CleanupOptions {
  days?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

interface InfoOptions {
  verbose?: boolean;
}

// Classe principal do CLI
class BackupCLI {
  private program: Command;
  private verbose: boolean = false;

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  private setupProgram(): void {
    this.program
      .name('backup-cli')
      .description('Sistema de backup do banco de dados PostgreSQL')
      .version('1.0.0')
      .option('-v, --verbose', 'Saída detalhada para debugging')
      .hook('preAction', (thisCommand) => {
        this.verbose = thisCommand.opts().verbose || false;
      });

    this.setupCommands();
  }

  private setupCommands(): void {
    // Comando CREATE
    this.program
      .command('create')
      .description('Criar um novo backup do banco de dados')
      .option('-o, --output <directory>', 'Diretório de saída para o backup')
      .option('-n, --name <filename>', 'Nome personalizado para o arquivo de backup')
      .option('-c, --compress', 'Comprimir o arquivo de backup')
      .option('--schema-only', 'Fazer backup apenas da estrutura (sem dados)')
      .option('--data-only', 'Fazer backup apenas dos dados (sem estrutura)')
      .option('-v, --verbose', 'Saída detalhada')
      .action(async (options: CreateOptions) => {
        await this.handleCreate(options);
      });

    // Comando LIST
    this.program
      .command('list')
      .description('Listar backups existentes')
      .option('-f, --format <type>', 'Formato de saída (table|json)', 'table')
      .option('-l, --limit <number>', 'Limitar número de resultados', '10')
      .option('-v, --verbose', 'Mostrar informações detalhadas')
      .action(async (options: ListOptions) => {
        await this.handleList(options);
      });

    // Comando VALIDATE
    this.program
      .command('validate')
      .description('Validar integridade de um arquivo de backup')
      .argument('<filepath>', 'Caminho para o arquivo de backup')
      .option('-v, --verbose', 'Saída detalhada da validação')
      .option('--checksum', 'Verificar checksum do arquivo')
      .action(async (filepath: string, options: ValidateOptions) => {
        await this.handleValidate(filepath, options);
      });

    // Comando CLEANUP
    this.program
      .command('cleanup')
      .description('Limpar backups antigos')
      .option('-d, --days <number>', 'Remover backups mais antigos que N dias', '30')
      .option('--dry-run', 'Mostrar o que seria removido sem executar')
      .option('-v, --verbose', 'Saída detalhada')
      .action(async (options: CleanupOptions) => {
        await this.handleCleanup(options);
      });

    // Comando INFO
    this.program
      .command('info')
      .description('Mostrar informações sobre um backup específico')
      .argument('<backupId>', 'ID do backup')
      .option('-v, --verbose', 'Mostrar informações detalhadas')
      .action(async (backupId: string, options: InfoOptions) => {
        await this.handleInfo(backupId, options);
      });
  }

  // Handlers para cada comando
  private async handleCreate(options: CreateOptions): Promise<void> {
    try {
      this.log('Iniciando criação de backup...', options.verbose);
      
      // Validar parâmetros
      const validatedOptions = this.validateCreateOptions(options);
      
      // Mostrar configurações se verbose (Requirement 2.3)
      if (options.verbose) {
        console.log('🔧 Configurações do backup:');
        console.log(`  - Incluir schema: ${validatedOptions.includeSchema ? 'Sim' : 'Não'}`);
        console.log(`  - Incluir dados: ${validatedOptions.includeData ? 'Sim' : 'Não'}`);
        console.log(`  - Compressão: ${validatedOptions.compress ? 'Habilitada' : 'Desabilitada'}`);
        if (validatedOptions.directory) {
          console.log(`  - Diretório: ${validatedOptions.directory}`);
        }
        if (validatedOptions.filename) {
          console.log(`  - Nome personalizado: ${validatedOptions.filename}`);
        }
        
        // Mostrar o que será incluído no backup (Requirements 3.1-3.5)
        console.log('📋 Conteúdo do backup:');
        if (validatedOptions.includeSchema) {
          console.log('  ✓ Estrutura das tabelas (CREATE statements)');
          console.log('  ✓ Índices e constraints');
          console.log('  ✓ Sequences e outros objetos do banco');
        }
        if (validatedOptions.includeData) {
          console.log('  ✓ Dados das tabelas (INSERT statements)');
          console.log('  ✓ Todas as tabelas do schema Prisma');
        }
        console.log('');
      }
      
      // Mostrar progresso inicial (Requirement 2.3)
      this.logProgress('Conectando ao banco de dados...', options.verbose);
      this.logProgress('Executando pg_dump...', options.verbose);
      
      // Criar backup
      const result = await BackupService.createBackup(validatedOptions);
      
      if (result.success) {
        console.log(`✅ Backup criado com sucesso!`);
        console.log(`📁 Arquivo: ${result.filename}`);
        console.log(`📍 Localização: ${result.filepath}`);
        console.log(`📊 Tamanho: ${this.formatFileSize(result.size)}`);
        console.log(`⏱️  Duração: ${result.duration}ms`);
        
        if (options.verbose && result.id) {
          console.log(`🆔 ID: ${result.id}`);
          console.log(`🔐 Checksum: ${result.checksum}`);
        }
        
        // Código de saída 0 para sucesso (Requirement 2.4)
        process.exit(0);
      } else {
        // Mensagem de erro detalhada (Requirement 2.5)
        console.error(`❌ Falha ao criar backup: ${result.error}`);
        // Código de saída não-zero para erro (Requirement 2.5)
        process.exit(1);
      }
    } catch (error) {
      // Tratamento de erro com código de saída não-zero (Requirement 2.5)
      console.error(`❌ Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  private async handleList(options: ListOptions): Promise<void> {
    try {
      this.log('Listando backups...', options.verbose);
      
      const limit = parseInt(String(options.limit || '10'));
      const backups = await BackupService.listBackups();
      const limitedBackups = backups.slice(0, limit);

      if (limitedBackups.length === 0) {
        console.log('📭 Nenhum backup encontrado.');
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(limitedBackups, null, 2));
      } else {
        this.displayBackupsTable(limitedBackups, options.verbose);
      }
      
      process.exit(0);
    } catch (error) {
      console.error(`❌ Erro ao listar backups: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  }

  private async handleValidate(filepath: string, options: ValidateOptions): Promise<void> {
    try {
      this.log(`Validando backup: ${filepath}`, options.verbose);
      
      // Verificar se arquivo existe
      const fs = require('fs');
      if (!fs.existsSync(filepath)) {
        console.error(`❌ Arquivo não encontrado: ${filepath}`);
        process.exit(1);
      }

      // Usar o método correto do BackupValidator para validação detalhada
      const validationResult = await BackupValidator.validateBackup(filepath);
      
      if (validationResult.isValid) {
        console.log(`✅ Backup válido: ${filepath}`);
        console.log(`📊 Tamanho: ${this.formatFileSize(validationResult.size)}`);
        console.log(`⏱️  Tempo de validação: ${validationResult.validationTime}ms`);
        
        if (options.checksum || options.verbose) {
          console.log(`🔐 Checksum: ${validationResult.checksum}`);
        }
        
        if (options.verbose && validationResult.warnings.length > 0) {
          console.log('⚠️  Avisos:');
          validationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        process.exit(0);
      } else {
        console.error(`❌ Backup inválido ou corrompido: ${filepath}`);
        console.error('Erros encontrados:');
        validationResult.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Erro ao validar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  }

  private async handleCleanup(options: CleanupOptions): Promise<void> {
    try {
      const days = parseInt(String(options.days || '30'));
      this.log(`Limpando backups mais antigos que ${days} dias...`, options.verbose);
      
      if (options.dryRun) {
        // Para dry-run, usar simulação
        const simulation = await BackupStorage.simulateCleanupOldBackups(days);
        
        console.log(`🔍 Simulação de limpeza (${simulation.wouldRemove} arquivos seriam removidos):`);
        
        if (simulation.backupsToRemove.length === 0) {
          console.log('  Nenhum backup seria removido.');
        } else {
          simulation.backupsToRemove.forEach(backup => {
            console.log(`  - ${backup.filename} (${this.formatFileSize(backup.size)}) - ${backup.createdAt.toLocaleDateString('pt-BR')}`);
          });
        }
        
        console.log(`💾 Espaço que seria liberado: ${this.formatFileSize(simulation.wouldFreeSpace)}`);
      } else {
        const result = await BackupStorage.cleanupOldBackups();
        
        console.log(`🧹 Limpeza concluída (${result.removed} arquivos removidos)`);
        console.log(`💾 Espaço liberado: ${this.formatFileSize(result.freedSpace)}`);
        
        if (result.errors.length > 0) {
          console.log('⚠️  Erros durante limpeza:');
          result.errors.forEach(error => console.log(`  - ${error}`));
        }
      }
      
      process.exit(0);
    } catch (error) {
      console.error(`❌ Erro durante limpeza: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  }

  private async handleInfo(backupId: string, options: InfoOptions): Promise<void> {
    try {
      this.log(`Obtendo informações do backup: ${backupId}`, options.verbose);
      
      const backup = await BackupService.getBackupInfo(backupId);
      
      if (!backup) {
        console.error(`❌ Backup não encontrado: ${backupId}`);
        process.exit(1);
      }

      console.log(`📋 Informações do Backup`);
      console.log(`ID: ${backup.id}`);
      console.log(`Nome: ${backup.filename}`);
      console.log(`Localização: ${backup.filepath}`);
      console.log(`Tamanho: ${this.formatFileSize(backup.size)}`);
      console.log(`Status: ${this.formatStatus(backup.status)}`);
      console.log(`Criado em: ${backup.createdAt.toLocaleString('pt-BR')}`);
      console.log(`Duração: ${backup.duration}ms`);
      
      if (options.verbose) {
        console.log(`Checksum: ${backup.checksum}`);
        console.log(`Versão do Banco: ${backup.databaseVersion}`);
        console.log(`Versão do Schema: ${backup.schemaVersion}`);
        if (backup.createdBy) {
          console.log(`Criado por: ${backup.createdBy}`);
        }
      }
      
      process.exit(0);
    } catch (error) {
      console.error(`❌ Erro ao obter informações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  }

  // Métodos utilitários
  private validateCreateOptions(options: CreateOptions): any {
    const validated: any = {};

    // Validar diretório de saída (Requirement 2.2)
    if (options.output) {
      const outputPath = path.resolve(options.output);
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Diretório de saída não existe: ${outputPath}`);
      }
      
      // Verificar se é um diretório
      const stats = fs.statSync(outputPath);
      if (!stats.isDirectory()) {
        throw new Error(`Caminho especificado não é um diretório: ${outputPath}`);
      }
      
      // Verificar permissões de escrita
      try {
        fs.accessSync(outputPath, fs.constants.W_OK);
      } catch (error) {
        throw new Error(`Sem permissão de escrita no diretório: ${outputPath}`);
      }
      
      validated.directory = outputPath;
    }

    // Validar nome do arquivo (Requirement 2.2)
    if (options.name) {
      // Permitir caracteres válidos para nomes de arquivo (sem pontos para evitar confusão com extensões)
      if (!/^[a-zA-Z0-9_-]+$/.test(options.name)) {
        throw new Error('Nome do arquivo deve conter apenas letras, números, hífens e underscores');
      }
      
      // O BackupService espera o nome completo com extensão
      validated.filename = `${options.name}.sql`;
    }

    // Validar opções mutuamente exclusivas
    if (options.schemaOnly && options.dataOnly) {
      throw new Error('As opções --schema-only e --data-only são mutuamente exclusivas');
    }

    // Configurar opções de backup (Requirement 2.2)
    validated.includeSchema = !options.dataOnly;
    validated.includeData = !options.schemaOnly;
    validated.compress = options.compress || false;

    // Validar se pelo menos uma opção de conteúdo está habilitada
    if (!validated.includeSchema && !validated.includeData) {
      throw new Error('Pelo menos uma das opções de conteúdo (schema ou dados) deve estar habilitada');
    }

    return validated;
  }

  private displayBackupsTable(backups: any[], verbose: boolean = false): void {
    console.log(`📋 Lista de Backups (${backups.length} encontrados):\n`);
    
    // Cabeçalho
    const headers = ['ID', 'Nome', 'Tamanho', 'Status', 'Data'];
    if (verbose) {
      headers.push('Duração', 'Checksum');
    }
    
    console.log(headers.join('\t'));
    console.log('-'.repeat(headers.join('\t').length));
    
    // Dados
    backups.forEach(backup => {
      const row = [
        backup.id.substring(0, 8),
        backup.filename,
        this.formatFileSize(backup.size),
        this.formatStatus(backup.status),
        backup.createdAt.toLocaleDateString('pt-BR')
      ];
      
      if (verbose) {
        row.push(`${backup.duration}ms`);
        row.push(backup.checksum.substring(0, 8));
      }
      
      console.log(row.join('\t'));
    });
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'success': '✅ Sucesso',
      'failed': '❌ Falhou',
      'in_progress': '⏳ Em progresso'
    };
    
    return statusMap[status] || status;
  }

  private log(message: string, verbose: boolean = false): void {
    if (verbose || this.verbose) {
      console.log(`🔍 ${message}`);
    }
  }

  private logProgress(message: string, verbose: boolean = false): void {
    if (verbose || this.verbose) {
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      console.log(`[${timestamp}] ⏳ ${message}`);
    }
  }



  // Método principal para executar o CLI
  public async run(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error(`❌ Erro fatal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      process.exit(1);
    }
  }
}

// Executar CLI se chamado diretamente
if (require.main === module) {
  const cli = new BackupCLI();
  cli.run().catch((error) => {
    console.error(`❌ Erro fatal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    process.exit(1);
  });
}

export { BackupCLI };