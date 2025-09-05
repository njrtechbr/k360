#!/usr/bin/env tsx

/**
 * Script de configuração inicial do sistema de backup
 * Configura diretórios, permissões e dependências necessárias
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  backupDirectory: string;
  maxBackups: number;
  retentionDays: number;
  enableCompression: boolean;
  enableMonitoring: boolean;
}

class BackupSystemSetup {
  private config: SetupConfig;
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.config = {
      backupDirectory: process.env.BACKUP_DIRECTORY || join(this.projectRoot, 'backups'),
      maxBackups: parseInt(process.env.BACKUP_MAX_BACKUPS || '50'),
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      enableCompression: process.env.BACKUP_ENABLE_COMPRESSION !== 'false',
      enableMonitoring: process.env.BACKUP_ENABLE_MONITORING !== 'false'
    };
  }

  async run(): Promise<void> {
    console.log('🚀 Iniciando configuração do sistema de backup...\n');

    try {
      await this.checkPrerequisites();
      await this.createDirectories();
      await this.initializeRegistry();
      await this.setupEnvironment();
      await this.installDependencies();
      await this.validateSetup();
      
      console.log('\n✅ Sistema de backup configurado com sucesso!');
      this.printNextSteps();
    } catch (error) {
      console.error('\n❌ Erro durante a configuração:', error);
      process.exit(1);
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Verificando pré-requisitos...');

    // Verificar Node.js
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      console.log(`  ✅ Node.js: ${nodeVersion}`);
    } catch {
      throw new Error('Node.js não encontrado. Instale Node.js 18+ antes de continuar.');
    }

    // Verificar PostgreSQL
    try {
      const pgVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
      console.log(`  ✅ PostgreSQL: ${pgVersion}`);
    } catch {
      console.log('  ⚠️  PostgreSQL client não encontrado. Instale postgresql-client.');
    }

    // Verificar pg_dump
    try {
      const pgDumpVersion = execSync('pg_dump --version', { encoding: 'utf8' }).trim();
      console.log(`  ✅ pg_dump: ${pgDumpVersion}`);
    } catch {
      throw new Error('pg_dump não encontrado. Instale PostgreSQL client tools.');
    }

    // Verificar DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada. Configure a variável de ambiente.');
    }
    console.log('  ✅ DATABASE_URL configurada');

    console.log('');
  }

  private async createDirectories(): Promise<void> {
    console.log('📁 Criando estrutura de diretórios...');

    const directories = [
      this.config.backupDirectory,
      join(this.config.backupDirectory, 'files'),
      join(this.config.backupDirectory, 'temp'),
      join(this.projectRoot, 'logs')
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Criado: ${dir}`);
      } else {
        console.log(`  ℹ️  Já existe: ${dir}`);
      }

      // Configurar permissões
      try {
        chmodSync(dir, 0o755);
      } catch (error) {
        console.log(`  ⚠️  Não foi possível ajustar permissões de ${dir}`);
      }
    }

    console.log('');
  }

  private async initializeRegistry(): Promise<void> {
    console.log('📋 Inicializando registry de backups...');

    const registryPath = join(this.config.backupDirectory, 'registry.json');
    
    if (!existsSync(registryPath)) {
      const initialRegistry = {
        backups: [],
        lastCleanup: new Date().toISOString(),
        settings: {
          maxBackups: this.config.maxBackups,
          retentionDays: this.config.retentionDays,
          defaultDirectory: this.config.backupDirectory,
          enableCompression: this.config.enableCompression,
          enableMonitoring: this.config.enableMonitoring
        },
        version: '1.0.0',
        createdAt: new Date().toISOString()
      };

      writeFileSync(registryPath, JSON.stringify(initialRegistry, null, 2));
      console.log(`  ✅ Registry criado: ${registryPath}`);
    } else {
      console.log(`  ℹ️  Registry já existe: ${registryPath}`);
    }

    console.log('');
  }

  private async setupEnvironment(): Promise<void> {
    console.log('⚙️  Configurando variáveis de ambiente...');

    const envPath = join(this.projectRoot, '.env.backup');
    const envContent = `# Configurações do Sistema de Backup
# Gerado automaticamente em ${new Date().toISOString()}

# Diretório principal de backups
BACKUP_DIRECTORY=${this.config.backupDirectory}

# Configurações de retenção
BACKUP_MAX_BACKUPS=${this.config.maxBackups}
BACKUP_RETENTION_DAYS=${this.config.retentionDays}

# Configurações de performance
BACKUP_MAX_CONCURRENT=2
BACKUP_ENABLE_COMPRESSION=${this.config.enableCompression}
BACKUP_ENABLE_MONITORING=${this.config.enableMonitoring}

# Configurações do PostgreSQL
PGDUMP_TIMEOUT=3600
PGDUMP_PATH=${this.findPgDumpPath()}

# Configurações de segurança
BACKUP_MAX_SIZE_GB=10
BACKUP_RATE_LIMIT_REQUESTS=10
BACKUP_RATE_LIMIT_WINDOW_MS=900000

# Configurações de logs
BACKUP_LOG_LEVEL=info
BACKUP_LOG_FILE=${join(this.projectRoot, 'logs', 'backup-system.log')}
`;

    writeFileSync(envPath, envContent);
    console.log(`  ✅ Arquivo de configuração criado: ${envPath}`);
    console.log('  ℹ️  Copie as variáveis para seu arquivo .env principal');

    console.log('');
  }

  private findPgDumpPath(): string {
    const possiblePaths = [
      '/usr/bin/pg_dump',
      '/usr/local/bin/pg_dump',
      '/opt/homebrew/bin/pg_dump',
      'pg_dump' // PATH
    ];

    for (const path of possiblePaths) {
      try {
        execSync(`${path} --version`, { stdio: 'ignore' });
        return path;
      } catch {
        continue;
      }
    }

    return 'pg_dump'; // Fallback para PATH
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Verificando dependências...');

    const packageJsonPath = join(this.projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json não encontrado. Execute este script na raiz do projeto.');
    }

    try {
      // Verificar se as dependências já estão instaladas
      const nodeModulesPath = join(this.projectRoot, 'node_modules');
      if (existsSync(nodeModulesPath)) {
        console.log('  ✅ node_modules encontrado');
      } else {
        console.log('  📦 Instalando dependências...');
        execSync('npm install', { stdio: 'inherit', cwd: this.projectRoot });
      }

      // Verificar dependências específicas do backup
      const requiredDeps = ['archiver'];
      for (const dep of requiredDeps) {
        try {
          require.resolve(dep);
          console.log(`  ✅ ${dep} disponível`);
        } catch {
          console.log(`  ⚠️  ${dep} não encontrado - instale com: npm install ${dep}`);
        }
      }
    } catch (error) {
      console.log('  ⚠️  Erro ao verificar dependências:', error);
    }

    console.log('');
  }

  private async validateSetup(): Promise<void> {
    console.log('🔍 Validando configuração...');

    // Testar conexão com banco
    try {
      const testQuery = 'SELECT version();';
      execSync(`psql "${process.env.DATABASE_URL}" -c "${testQuery}"`, { stdio: 'ignore' });
      console.log('  ✅ Conexão com banco de dados');
    } catch {
      console.log('  ❌ Falha na conexão com banco de dados');
      throw new Error('Não foi possível conectar ao banco. Verifique DATABASE_URL.');
    }

    // Testar criação de arquivo de teste
    try {
      const testFile = join(this.config.backupDirectory, 'test.tmp');
      writeFileSync(testFile, 'test');
      execSync(`rm -f ${testFile}`);
      console.log('  ✅ Permissões de escrita no diretório de backup');
    } catch {
      console.log('  ❌ Sem permissões de escrita no diretório de backup');
      throw new Error('Sem permissões adequadas no diretório de backup.');
    }

    // Testar pg_dump
    try {
      const pgDumpPath = this.findPgDumpPath();
      execSync(`${pgDumpPath} --help`, { stdio: 'ignore' });
      console.log('  ✅ pg_dump funcional');
    } catch {
      console.log('  ❌ pg_dump não funcional');
      throw new Error('pg_dump não está funcionando corretamente.');
    }

    console.log('');
  }

  private printNextSteps(): void {
    console.log('📋 Próximos passos:');
    console.log('');
    console.log('1. Copie as configurações de .env.backup para seu arquivo .env principal');
    console.log('2. Teste o sistema com: npm run backup:create --verbose');
    console.log('3. Configure backups automáticos se necessário');
    console.log('4. Acesse /dashboard/backup para usar a interface web');
    console.log('');
    console.log('📚 Documentação disponível em:');
    console.log('  - docs/sistema-backup-completo.md');
    console.log('  - docs/guia-usuario.md');
    console.log('  - docs/guia-cli.md');
    console.log('');
    console.log('🆘 Em caso de problemas, consulte:');
    console.log('  - docs/troubleshooting.md');
  }
}

// Executar setup se chamado diretamente
if (require.main === module) {
  const setup = new BackupSystemSetup();
  setup.run().catch(console.error);
}

export default BackupSystemSetup;