#!/usr/bin/env node

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, readdirSync, statSync, existsSync } = require('fs');
const { join, extname } = require('path');

/**
 * Script para limpeza de imports não utilizados e código morto
 * Parte da migração Prisma - Task 10.1
 */

class CodeCleanup {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      importsRemoved: 0,
      commentsRemoved: 0,
      orphanedFiles: []
    };
  }

  /**
   * Executa limpeza completa do código
   */
  async cleanup() {
    console.log('🧹 Iniciando limpeza de código...\n');

    // 1. Remover imports não utilizados
    await this.removeUnusedImports();

    // 2. Remover comentários relacionados à migração
    await this.removeMigrationComments();

    // 3. Verificar arquivos órfãos
    await this.findOrphanedFiles();

    // 4. Padronizar formatação
    await this.standardizeFormatting();

    this.printStats();
  }

  /**
   * Remove imports não utilizados usando ESLint
   */
  async removeUnusedImports() {
    console.log('📦 Removendo imports não utilizados...');

    try {
      // Executar ESLint com fix para remover imports não utilizados
      execSync('npx eslint src/ --fix --quiet', {
        stdio: 'pipe'
      });
      
      console.log('✅ ESLint executado para limpeza de imports');
    } catch (error) {
      console.log('⚠️  ESLint executado (alguns warnings podem ser esperados)');
    }

    // Verificar manualmente arquivos específicos da migração
    await this.manualImportCleanup();
  }

  /**
   * Limpeza manual de imports específicos da migração
   */
  async manualImportCleanup() {
    const filesToCheck = [
      'src/services/dashboardApiClient.ts',
      'src/services/achievementApiClient.ts',
      'src/types/dashboard.ts',
      'src/types/achievements.ts'
    ];

    for (const filePath of filesToCheck) {
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        let cleanedContent = content;

        // Remover imports do Prisma que não são mais necessários no frontend
        const prismaImportRegex = /import.*from\s+['"]@prisma\/client['"];?\n?/g;
        const matches = content.match(prismaImportRegex);
        
        if (matches) {
          for (const match of matches) {
            const importedTypes = this.extractImportedTypes(match);
            const isUsed = importedTypes.some(type => {
              const typeUsageRegex = new RegExp(`\\b${type}\\b`, 'g');
              const usages = content.match(typeUsageRegex);
              return usages && usages.length > 1; // Mais de 1 uso (import + uso real)
            });
            
            if (!isUsed) {
              cleanedContent = cleanedContent.replace(match, '');
              this.stats.importsRemoved++;
              console.log(`  ✅ Removido import não utilizado em: ${filePath}`);
            }
          }
        }

        if (cleanedContent !== content) {
          writeFileSync(filePath, cleanedContent);
        }

        this.stats.filesProcessed++;
      } catch (error) {
        console.log(`  ⚠️  Erro ao processar ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Extrai tipos importados de uma linha de import
   */
  extractImportedTypes(importLine) {
    const match = importLine.match(/import\s*{([^}]+)}/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(type => type.trim())
      .filter(type => type.length > 0);
  }

  /**
   * Remove comentários relacionados à migração
   */
  async removeMigrationComments() {
    console.log('💬 Removendo comentários de migração...');

    const directories = ['src/services', 'src/app/api', 'src/types'];
    
    for (const dir of directories) {
      if (existsSync(dir)) {
        await this.processDirectory(dir, (content) => {
          let cleanedContent = content;

          // Padrões de comentários relacionados à migração
          const migrationCommentPatterns = [
            /\/\*\*?\s*Migração.*?\*\//g,
            /\/\/\s*Migração.*/g,
            /\/\/\s*TODO.*migração.*/gi,
            /\/\/\s*FIXME.*migração.*/gi,
            /\/\*\s*Substituído.*migração.*\*\//g,
            /\/\/\s*Removido.*Prisma.*/gi,
            /\/\/\s*Legacy.*removed.*/gi,
            /\/\/\s*Migrated.*from.*/gi
          ];

          migrationCommentPatterns.forEach(pattern => {
            const matches = cleanedContent.match(pattern);
            if (matches) {
              this.stats.commentsRemoved += matches.length;
              cleanedContent = cleanedContent.replace(pattern, '');
            }
          });

          // Remover linhas vazias excessivas
          cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

          return cleanedContent;
        });
      }
    }
  }

  /**
   * Processa arquivos em um diretório
   */
  async processDirectory(dirPath, processor) {
    try {
      const files = readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        const stat = statSync(filePath);
        
        if (stat.isDirectory()) {
          await this.processDirectory(filePath, processor);
        } else if (this.isTypeScriptFile(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          const processedContent = processor(content);
          
          if (processedContent !== content) {
            writeFileSync(filePath, processedContent);
            console.log(`  ✅ Processado: ${filePath}`);
          }
          
          this.stats.filesProcessed++;
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Erro ao processar diretório ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Verifica se é arquivo TypeScript
   */
  isTypeScriptFile(filePath) {
    const ext = extname(filePath);
    return ['.ts', '.tsx'].includes(ext);
  }

  /**
   * Encontra arquivos órfãos que podem ser removidos
   */
  async findOrphanedFiles() {
    console.log('🔍 Verificando arquivos órfãos...');

    // Arquivos que podem ter sido deixados pela migração
    const potentialOrphans = [
      'src/services/dashboardService.ts',
      'src/services/realtimeDashboardService.ts',
      'src/services/achievementProcessor.ts',
      'src/services/attendantPrismaService.ts',
      'src/services/evaluationPrismaService.ts',
      'src/services/userPrismaService.ts'
    ];

    for (const filePath of potentialOrphans) {
      if (existsSync(filePath)) {
        try {
          const isReferenced = await this.isFileReferenced(filePath);
          
          if (!isReferenced) {
            this.stats.orphanedFiles.push(filePath);
            console.log(`  ⚠️  Arquivo órfão encontrado: ${filePath}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Erro ao verificar ${filePath}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Verifica se um arquivo é referenciado em outros lugares
   */
  async isFileReferenced(filePath) {
    const fileName = filePath.replace('src/', '').replace('.ts', '');
    
    try {
      // Buscar referências usando findstr no Windows
      execSync(`findstr /r /s "${fileName}" src\\*.ts src\\*.tsx`, {
        stdio: 'pipe'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Padroniza formatação do código
   */
  async standardizeFormatting() {
    console.log('🎨 Padronizando formatação...');

    try {
      // Executar Prettier nos arquivos modificados
      execSync('npx prettier --write "src/**/*.{ts,tsx}"', {
        stdio: 'pipe'
      });
      
      console.log('✅ Formatação padronizada com Prettier');
    } catch (error) {
      console.log('⚠️  Prettier não disponível, pulando formatação');
    }
  }

  /**
   * Exibe estatísticas da limpeza
   */
  printStats() {
    console.log('\n📊 Estatísticas da Limpeza:');
    console.log(`  📁 Arquivos processados: ${this.stats.filesProcessed}`);
    console.log(`  📦 Imports removidos: ${this.stats.importsRemoved}`);
    console.log(`  💬 Comentários removidos: ${this.stats.commentsRemoved}`);
    
    if (this.stats.orphanedFiles.length > 0) {
      console.log(`  🗑️  Arquivos órfãos encontrados: ${this.stats.orphanedFiles.length}`);
      this.stats.orphanedFiles.forEach(file => {
        console.log(`    - ${file}`);
      });
      console.log('\n⚠️  Revise os arquivos órfãos antes de removê-los manualmente.');
    }
    
    console.log('\n✅ Limpeza de código concluída!');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const cleanup = new CodeCleanup();
  cleanup.cleanup().catch(console.error);
}

module.exports = { CodeCleanup };