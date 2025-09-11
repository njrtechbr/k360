#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Script para limpeza de imports não utilizados e código morto
 * Parte da migração Prisma - Task 10.1
 */

interface CleanupStats {
  filesProcessed: number;
  importsRemoved: number;
  commentsRemoved: number;
  orphanedFiles: string[];
}

class CodeCleanup {
  private stats: CleanupStats = {
    filesProcessed: 0,
    importsRemoved: 0,
    commentsRemoved: 0,
    orphanedFiles: []
  };

  /**
   * Executa limpeza completa do código
   */
  async cleanup(): Promise<void> {
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
  private async removeUnusedImports(): Promise<void> {
    console.log('📦 Removendo imports não utilizados...');

    try {
      // Executar ESLint com fix para remover imports não utilizados
      execSync('npx eslint src/ --fix --rule "no-unused-vars: error" --rule "@typescript-eslint/no-unused-imports: error"', {
        stdio: 'pipe'
      });
      
      console.log('✅ Imports não utilizados removidos via ESLint');
    } catch (error) {
      console.log('⚠️  ESLint executado (alguns warnings podem ser esperados)');
    }

    // Verificar manualmente arquivos específicos da migração
    await this.manualImportCleanup();
  }

  /**
   * Limpeza manual de imports específicos da migração
   */
  private async manualImportCleanup(): Promise<void> {
    const filesToCheck = [
      'src/services/dashboardApiClient.ts',
      'src/services/achievementApiClient.ts',
      'src/types/dashboard.ts',
      'src/types/achievements.ts'
    ];

    for (const filePath of filesToCheck) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        let cleanedContent = content;

        // Remover imports do Prisma que não são mais necessários
        const prismaImportRegex = /import.*from\s+['"]@prisma\/client['"];?\n?/g;
        const matches = content.match(prismaImportRegex);
        
        if (matches) {
          // Verificar se os tipos do Prisma são realmente usados
          for (const match of matches) {
            const importedTypes = this.extractImportedTypes(match);
            const isUsed = importedTypes.some(type => 
              content.includes(type) && content.indexOf(type) !== content.indexOf(match)
            );
            
            if (!isUsed) {
              cleanedContent = cleanedContent.replace(match, '');
              this.stats.importsRemoved++;
            }
          }
        }

        if (cleanedContent !== content) {
          writeFileSync(filePath, cleanedContent);
          console.log(`  ✅ Limpo: ${filePath}`);
        }

        this.stats.filesProcessed++;
      } catch (error) {
        console.log(`  ⚠️  Erro ao processar ${filePath}: ${error}`);
      }
    }
  }

  /**
   * Extrai tipos importados de uma linha de import
   */
  private extractImportedTypes(importLine: string): string[] {
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
  private async removeMigrationComments(): Promise<void> {
    console.log('💬 Removendo comentários de migração...');

    const directories = ['src/services', 'src/app/api', 'src/types'];
    
    for (const dir of directories) {
      await this.processDirectory(dir, (content: string) => {
        let cleanedContent = content;

        // Padrões de comentários relacionados à migração
        const migrationCommentPatterns = [
          /\/\*\*?\s*Migração.*?\*\//g,
          /\/\/\s*Migração.*/g,
          /\/\/\s*TODO.*migração.*/gi,
          /\/\/\s*FIXME.*migração.*/gi,
          /\/\*\s*Substituído.*migração.*\*\//g,
          /\/\/\s*Removido.*Prisma.*/gi
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

  /**
   * Processa arquivos em um diretório
   */
  private async processDirectory(
    dirPath: string, 
    processor: (content: string) => string
  ): Promise<void> {
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
      console.log(`  ⚠️  Erro ao processar diretório ${dirPath}: ${error}`);
    }
  }

  /**
   * Verifica se é arquivo TypeScript
   */
  private isTypeScriptFile(filePath: string): boolean {
    const ext = extname(filePath);
    return ['.ts', '.tsx'].includes(ext);
  }

  /**
   * Encontra arquivos órfãos que podem ser removidos
   */
  private async findOrphanedFiles(): Promise<void> {
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
      try {
        const content = readFileSync(filePath, 'utf-8');
        // Se o arquivo existe, verificar se ainda é referenciado
        const isReferenced = await this.isFileReferenced(filePath);
        
        if (!isReferenced) {
          this.stats.orphanedFiles.push(filePath);
          console.log(`  ⚠️  Arquivo órfão encontrado: ${filePath}`);
        }
      } catch (error) {
        // Arquivo não existe, ok
      }
    }
  }

  /**
   * Verifica se um arquivo é referenciado em outros lugares
   */
  private async isFileReferenced(filePath: string): Promise<boolean> {
    const fileName = filePath.replace('src/', '').replace('.ts', '');
    
    try {
      // Buscar referências usando grep
      execSync(`grep -r "${fileName}" src/ --exclude-dir=node_modules`, {
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
  private async standardizeFormatting(): Promise<void> {
    console.log('🎨 Padronizando formatação...');

    try {
      // Executar Prettier nos arquivos modificados
      execSync('npx prettier --write "src/**/*.{ts,tsx}"', {
        stdio: 'pipe'
      });
      
      console.log('✅ Formatação padronizada com Prettier');
    } catch (error) {
      console.log('⚠️  Erro ao executar Prettier:', error);
    }
  }

  /**
   * Exibe estatísticas da limpeza
   */
  private printStats(): void {
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
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleanup = new CodeCleanup();
  cleanup.cleanup().catch(console.error);
}

export { CodeCleanup };