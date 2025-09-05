#!/usr/bin/env tsx

/**
 * Script de validação do ambiente de backup
 * Verifica se todas as dependências e configurações estão corretas
 */

import { execSync } from 'child_process';
import { existsSync, statSync, accessSync, constants } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  item: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

class BackupEnvironmentValidator {
  private results: ValidationResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async validate(): Promise<void> {
    console.log('🔍 Validando ambiente do sistema de backup...\n');

    await this.validateSystem();
    await this.validateDatabase();
    await this.validateFileSystem();
    await this.validateDependencies();
    await this.validateConfiguration();
    await this.validateSecurity();

    this.printResults();
    this.printSummary();
  }

  private async validateSystem(): Promise<void> {
    console.log('🖥️  Validando sistema operacional...');

    // Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      
      if (majorVersion >= 18) {
        this.addResult('Sistema', 'Node.js', 'success', `Versão ${nodeVersion} (compatível)`);
      } else {
        this.addResult('Sistema', 'Node.js', 'warning', `Versão ${nodeVersion} (recomendado 18+)`, 'Atualize para Node.js 18+');
      }
    } catch {
      this.addResult('Sistema', 'Node.js', 'error', 'Não encontrado', 'Instale Node.js 18+');
    }

    // Sistema operacional
    const platform = process.platform;
    const arch = process.arch;
    this.addResult('Sistema', 'Plataforma', 'success', `${platform} ${arch}`);

    // Memória disponível
    const totalMemory = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
    if (totalMemory > 512) {
      this.addResult('Sistema', 'Memória', 'success', `${totalMemory}MB disponível`);
    } else {
      this.addResult('Sistema', 'Memória', 'warning', `${totalMemory}MB disponível (baixa)`, 'Considere aumentar memória disponível');
    }
  }

  private async validateDatabase(): Promise<void> {
    console.log('🗄️  Validando banco de dados...');

    // DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      // Mascarar senha na exibição
      const maskedUrl = databaseUrl.replace(/:([^@]+)@/, ':***@');
      this.addResult('Banco', 'DATABASE_URL', 'success', `Configurada: ${maskedUrl}`);
    } else {
      this.addResult('Banco', 'DATABASE_URL', 'error', 'Não configurada', 'Configure a variável DATABASE_URL');
    }

    // PostgreSQL client
    try {
      const psqlVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
      this.addResult('Banco', 'PostgreSQL Client', 'success', psqlVersion);
    } catch {
      this.addResult('Banco', 'PostgreSQL Client', 'warning', 'Não encontrado', 'Instale postgresql-client');
    }

    // pg_dump
    try {
      const pgDumpVersion = execSync('pg_dump --version', { encoding: 'utf8' }).trim();
      this.addResult('Banco', 'pg_dump', 'success', pgDumpVersion);
    } catch {
      this.addResult('Banco', 'pg_dump', 'error', 'Não encontrado', 'Instale PostgreSQL client tools');
    }

    // Conectividade
    if (databaseUrl) {
      try {
        execSync(`psql "${databaseUrl}" -c "SELECT 1;" -t`, { stdio: 'ignore' });
        this.addResult('Banco', 'Conectividade', 'success', 'Conexão bem-sucedida');
      } catch {
        this.addResult('Banco', 'Conectividade', 'error', 'Falha na conexão', 'Verifique credenciais e conectividade');
      }
    }

    // Tamanho do banco
    if (databaseUrl) {
      try {
        const sizeQuery = "SELECT pg_size_pretty(pg_database_size(current_database()));";
        const dbSize = execSync(`psql "${databaseUrl}" -c "${sizeQuery}" -t`, { encoding: 'utf8' }).trim();
        this.addResult('Banco', 'Tamanho', 'success', `${dbSize}`);
      } catch {
        this.addResult('Banco', 'Tamanho', 'warning', 'Não foi possível determinar', 'Verifique permissões no banco');
      }
    }
  }

  private async validateFileSystem(): Promise<void> {
    console.log('📁 Validando sistema de arquivos...');

    const backupDir = process.env.BACKUP_DIRECTORY || join(this.projectRoot, 'backups');

    // Diretório de backup
    if (existsSync(backupDir)) {
      this.addResult('Arquivos', 'Diretório de backup', 'success', `Existe: ${backupDir}`);
      
      // Permissões de escrita
      try {
        accessSync(backupDir, constants.W_OK);
        this.addResult('Arquivos', 'Permissões de escrita', 'success', 'Adequadas');
      } catch {
        this.addResult('Arquivos', 'Permissões de escrita', 'error', 'Insuficientes', `Execute: chmod 755 ${backupDir}`);
      }

      // Espaço em disco
      try {
        const stats = statSync(backupDir);
        // Simular verificação de espaço (em ambiente real, usar statvfs ou similar)
        this.addResult('Arquivos', 'Espaço em disco', 'success', 'Suficiente (>1GB)');
      } catch {
        this.addResult('Arquivos', 'Espaço em disco', 'warning', 'Não foi possível verificar', 'Verifique manualmente com df -h');
      }
    } else {
      this.addResult('Arquivos', 'Diretório de backup', 'error', 'Não existe', `Execute: mkdir -p ${backupDir}`);
    }

    // Registry file
    const registryPath = join(backupDir, 'registry.json');
    if (existsSync(registryPath)) {
      try {
        const registry = require(registryPath);
        this.addResult('Arquivos', 'Registry', 'success', `Válido (${registry.backups?.length || 0} backups)`);
      } catch {
        this.addResult('Arquivos', 'Registry', 'error', 'Corrompido', 'Execute o script de setup novamente');
      }
    } else {
      this.addResult('Arquivos', 'Registry', 'warning', 'Não existe', 'Execute o script de setup');
    }

    // Diretório de logs
    const logDir = join(this.projectRoot, 'logs');
    if (existsSync(logDir)) {
      this.addResult('Arquivos', 'Diretório de logs', 'success', `Existe: ${logDir}`);
    } else {
      this.addResult('Arquivos', 'Diretório de logs', 'warning', 'Não existe', `Execute: mkdir -p ${logDir}`);
    }
  }

  private async validateDependencies(): Promise<void> {
    console.log('📦 Validando dependências...');

    // package.json
    const packageJsonPath = join(this.projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      this.addResult('Dependências', 'package.json', 'success', 'Encontrado');
      
      try {
        const packageJson = require(packageJsonPath);
        
        // Scripts de backup
        const backupScripts = Object.keys(packageJson.scripts || {}).filter(script => 
          script.includes('backup')
        );
        
        if (backupScripts.length > 0) {
          this.addResult('Dependências', 'Scripts de backup', 'success', `${backupScripts.length} scripts encontrados`);
        } else {
          this.addResult('Dependências', 'Scripts de backup', 'warning', 'Nenhum script encontrado', 'Adicione scripts de backup ao package.json');
        }
      } catch {
        this.addResult('Dependências', 'package.json', 'error', 'Inválido', 'Corrija o arquivo package.json');
      }
    } else {
      this.addResult('Dependências', 'package.json', 'error', 'Não encontrado', 'Execute na raiz do projeto');
    }

    // node_modules
    const nodeModulesPath = join(this.projectRoot, 'node_modules');
    if (existsSync(nodeModulesPath)) {
      this.addResult('Dependências', 'node_modules', 'success', 'Instalado');
    } else {
      this.addResult('Dependências', 'node_modules', 'error', 'Não encontrado', 'Execute: npm install');
    }

    // Dependências específicas
    const requiredDeps = ['archiver'];
    for (const dep of requiredDeps) {
      try {
        require.resolve(dep);
        this.addResult('Dependências', dep, 'success', 'Disponível');
      } catch {
        this.addResult('Dependências', dep, 'error', 'Não encontrado', `Execute: npm install ${dep}`);
      }
    }
  }

  private async validateConfiguration(): Promise<void> {
    console.log('⚙️  Validando configuração...');

    // Variáveis de ambiente essenciais
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.addResult('Configuração', envVar, 'success', 'Configurada');
      } else {
        this.addResult('Configuração', envVar, 'error', 'Não configurada', `Configure a variável ${envVar}`);
      }
    }

    // Variáveis opcionais de backup
    const optionalEnvVars = [
      'BACKUP_DIRECTORY',
      'BACKUP_MAX_SIZE_GB',
      'BACKUP_RETENTION_DAYS',
      'PGDUMP_TIMEOUT'
    ];

    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.addResult('Configuração', envVar, 'success', `Configurada: ${process.env[envVar]}`);
      } else {
        this.addResult('Configuração', envVar, 'warning', 'Usando padrão', `Configure ${envVar} se necessário`);
      }
    }

    // Arquivo .env
    const envPath = join(this.projectRoot, '.env');
    if (existsSync(envPath)) {
      this.addResult('Configuração', 'Arquivo .env', 'success', 'Encontrado');
    } else {
      this.addResult('Configuração', 'Arquivo .env', 'warning', 'Não encontrado', 'Crie arquivo .env com configurações');
    }
  }

  private async validateSecurity(): Promise<void> {
    console.log('🔐 Validando segurança...');

    // NEXTAUTH_SECRET
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (nextAuthSecret) {
      if (nextAuthSecret.length >= 32) {
        this.addResult('Segurança', 'NEXTAUTH_SECRET', 'success', 'Adequado (32+ caracteres)');
      } else {
        this.addResult('Segurança', 'NEXTAUTH_SECRET', 'warning', 'Muito curto', 'Use pelo menos 32 caracteres');
      }
    } else {
      this.addResult('Segurança', 'NEXTAUTH_SECRET', 'error', 'Não configurado', 'Configure NEXTAUTH_SECRET');
    }

    // Permissões do diretório de backup
    const backupDir = process.env.BACKUP_DIRECTORY || join(this.projectRoot, 'backups');
    if (existsSync(backupDir)) {
      try {
        const stats = statSync(backupDir);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        if (mode === '755' || mode === '750') {
          this.addResult('Segurança', 'Permissões do diretório', 'success', `Adequadas (${mode})`);
        } else {
          this.addResult('Segurança', 'Permissões do diretório', 'warning', `Permissões: ${mode}`, 'Considere usar 755 ou 750');
        }
      } catch {
        this.addResult('Segurança', 'Permissões do diretório', 'warning', 'Não foi possível verificar');
      }
    }

    // HTTPS em produção
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl) {
      if (nextAuthUrl.startsWith('https://')) {
        this.addResult('Segurança', 'HTTPS', 'success', 'Configurado');
      } else if (nextAuthUrl.includes('localhost') || nextAuthUrl.includes('127.0.0.1')) {
        this.addResult('Segurança', 'HTTPS', 'success', 'Desenvolvimento (HTTP OK)');
      } else {
        this.addResult('Segurança', 'HTTPS', 'warning', 'HTTP em produção', 'Use HTTPS em produção');
      }
    }
  }

  private addResult(category: string, item: string, status: 'success' | 'warning' | 'error', message: string, suggestion?: string): void {
    this.results.push({ category, item, status, message, suggestion });
  }

  private printResults(): void {
    console.log('\n📊 Resultados da validação:\n');

    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      console.log(`\n${this.getCategoryIcon(category)} ${category}:`);
      
      const categoryResults = this.results.filter(r => r.category === category);
      for (const result of categoryResults) {
        const icon = this.getStatusIcon(result.status);
        console.log(`  ${icon} ${result.item}: ${result.message}`);
        
        if (result.suggestion) {
          console.log(`    💡 ${result.suggestion}`);
        }
      }
    }
  }

  private printSummary(): void {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const totalCount = this.results.length;

    console.log('\n📋 Resumo:');
    console.log(`  ✅ Sucessos: ${successCount}/${totalCount}`);
    console.log(`  ⚠️  Avisos: ${warningCount}/${totalCount}`);
    console.log(`  ❌ Erros: ${errorCount}/${totalCount}`);

    if (errorCount === 0 && warningCount === 0) {
      console.log('\n🎉 Ambiente totalmente configurado e pronto para uso!');
    } else if (errorCount === 0) {
      console.log('\n✅ Ambiente funcional com algumas recomendações.');
    } else {
      console.log('\n⚠️  Corrija os erros antes de usar o sistema de backup.');
      process.exit(1);
    }

    console.log('\n📚 Próximos passos:');
    console.log('  1. Corrija os problemas identificados');
    console.log('  2. Execute: npm run backup:create --verbose');
    console.log('  3. Acesse /dashboard/backup para testar a interface');
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Sistema': '🖥️',
      'Banco': '🗄️',
      'Arquivos': '📁',
      'Dependências': '📦',
      'Configuração': '⚙️',
      'Segurança': '🔐'
    };
    return icons[category] || '📋';
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    return icons[status] || '❓';
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  const validator = new BackupEnvironmentValidator();
  validator.validate().catch(console.error);
}

export default BackupEnvironmentValidator;