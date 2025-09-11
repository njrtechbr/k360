#!/usr/bin/env ts-node

/**
 * Script de validação final da refatoração da arquitetura API
 * Verifica se a migração foi bem-sucedida e identifica problemas pendentes
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  success: boolean;
  score: number;
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

interface ValidationSummary {
  totalFiles: number;
  filesWithPrismaImports: number;
  apiRoutesCount: number;
  serviceClientsCount: number;
  hooksCount: number;
  testsCount: number;
  coverageEstimate: number;
}

class RefactoringValidator {
  private issues: ValidationIssue[] = [];
  private summary: ValidationSummary = {
    totalFiles: 0,
    filesWithPrismaImports: 0,
    apiRoutesCount: 0,
    serviceClientsCount: 0,
    hooksCount: 0,
    testsCount: 0,
    coverageEstimate: 0
  };

  async validate(): Promise<ValidationResult> {
    console.log('🔍 Iniciando validação da refatoração...\n');

    // Executar todas as validações
    await this.validatePrismaUsage();
    await this.validateApiClients();
    await this.validateHooks();
    await this.validateComponents();
    await this.validateTests();
    await this.validateDocumentation();
    await this.validatePackageJson();

    // Calcular score final
    const score = this.calculateScore();
    const success = score >= 80;

    return {
      success,
      score,
      issues: this.issues,
      summary: this.summary
    };
  }

  private async validatePrismaUsage(): Promise<void> {
    console.log('📦 Validando uso do Prisma...');

    const srcFiles = await this.findFiles('src', ['.ts', '.tsx']);
    this.summary.totalFiles = srcFiles.length;

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Verificar imports do Prisma fora de API routes
      if (content.includes('import') && content.includes('PrismaClient')) {
        if (!file.includes('/api/')) {
          this.summary.filesWithPrismaImports++;
          this.addIssue('error', 'Prisma Usage', 
            `Prisma import encontrado fora de API routes: ${file}`,
            file, undefined,
            'Refatorar para usar API client ao invés de Prisma direto'
          );
        }
      }

      // Verificar new PrismaClient() fora de API routes
      if (content.includes('new PrismaClient') && !file.includes('/api/')) {
        this.addIssue('error', 'Prisma Usage',
          `Instanciação do Prisma encontrada fora de API routes: ${file}`,
          file, undefined,
          'Usar httpClient ao invés de instanciar Prisma'
        );
      }

      // Contar API routes
      if (file.includes('/api/') && file.endsWith('route.ts')) {
        this.summary.apiRoutesCount++;
      }
    }

    console.log(`   ✓ ${this.summary.totalFiles} arquivos verificados`);
    console.log(`   ✓ ${this.summary.apiRoutesCount} API routes encontradas`);
    
    if (this.summary.filesWithPrismaImports > 0) {
      console.log(`   ⚠️  ${this.summary.filesWithPrismaImports} arquivos com Prisma fora de APIs`);
    }
  }

  private async validateApiClients(): Promise<void> {
    console.log('🔌 Validando API clients...');

    const serviceFiles = await this.findFiles('src/services', ['.ts']);
    
    for (const file of serviceFiles) {
      if (file.includes('ApiClient.ts')) {
        this.summary.serviceClientsCount++;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // Verificar se usa httpClient
        if (!content.includes('httpClient')) {
          this.addIssue('error', 'API Client',
            `API client não usa httpClient: ${file}`,
            file, undefined,
            'Implementar métodos usando httpClient'
          );
        }

        // Verificar se tem tratamento de erro
        if (!content.includes('success') || !content.includes('error')) {
          this.addIssue('warning', 'API Client',
            `API client pode não ter tratamento de erro adequado: ${file}`,
            file, undefined,
            'Implementar tratamento de erro consistente'
          );
        }

        // Verificar se tem tipos TypeScript
        if (!content.includes('Promise<') || !content.includes('interface')) {
          this.addIssue('warning', 'API Client',
            `API client pode não ter tipagem adequada: ${file}`,
            file, undefined,
            'Adicionar tipos TypeScript apropriados'
          );
        }
      }
    }

    console.log(`   ✓ ${this.summary.serviceClientsCount} API clients encontrados`);
  }

  private async validateHooks(): Promise<void> {
    console.log('🎣 Validando hooks de API...');

    const hookFiles = await this.findFiles('src/hooks', ['.ts', '.tsx']);
    
    for (const file of hookFiles) {
      if (file.includes('use') && (file.includes('Api') || file.includes('Data'))) {
        this.summary.hooksCount++;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // Verificar se usa useApiQuery ou useApiMutation
        if (!content.includes('useApiQuery') && !content.includes('useApiMutation')) {
          this.addIssue('warning', 'Hooks',
            `Hook pode não estar usando padrões de API: ${file}`,
            file, undefined,
            'Migrar para usar useApiQuery/useApiMutation'
          );
        }

        // Verificar se tem estados de loading e error
        if (!content.includes('loading') || !content.includes('error')) {
          this.addIssue('warning', 'Hooks',
            `Hook pode não ter estados de loading/error: ${file}`,
            file, undefined,
            'Implementar estados de loading e error'
          );
        }
      }
    }

    console.log(`   ✓ ${this.summary.hooksCount} hooks verificados`);
  }

  private async validateComponents(): Promise<void> {
    console.log('🧩 Validando componentes...');

    const componentFiles = await this.findFiles('src/components', ['.tsx']);
    let componentsWithPrisma = 0;
    let componentsWithApiHooks = 0;

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Verificar se componente usa Prisma diretamente
      if (content.includes('prisma.') || content.includes('PrismaClient')) {
        componentsWithPrisma++;
        this.addIssue('error', 'Components',
          `Componente usa Prisma diretamente: ${file}`,
          file, undefined,
          'Migrar para usar hooks de API'
        );
      }

      // Verificar se usa hooks de API
      if (content.includes('useApiQuery') || content.includes('useApiMutation') || 
          content.includes('useUsersData') || content.includes('useGamificationData')) {
        componentsWithApiHooks++;
      }
    }

    console.log(`   ✓ ${componentFiles.length} componentes verificados`);
    console.log(`   ✓ ${componentsWithApiHooks} componentes usando hooks de API`);
    
    if (componentsWithPrisma > 0) {
      console.log(`   ⚠️  ${componentsWithPrisma} componentes ainda usam Prisma`);
    }
  }

  private async validateTests(): Promise<void> {
    console.log('🧪 Validando testes...');

    const testFiles = await this.findFiles('src', ['.test.ts', '.test.tsx']);
    this.summary.testsCount = testFiles.length;

    let testsWithMocks = 0;
    let testsWithApiPatterns = 0;

    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Verificar se usa mocks apropriados
      if (content.includes('jest.mock') || content.includes('mockResolvedValue')) {
        testsWithMocks++;
      }

      // Verificar se testa padrões de API
      if (content.includes('httpClient') || content.includes('useApiQuery') || 
          content.includes('ApiClient')) {
        testsWithApiPatterns++;
      }
    }

    // Estimar cobertura baseada na presença de testes
    this.summary.coverageEstimate = Math.min(90, (testsWithApiPatterns / Math.max(1, this.summary.serviceClientsCount + this.summary.hooksCount)) * 100);

    console.log(`   ✓ ${this.summary.testsCount} arquivos de teste encontrados`);
    console.log(`   ✓ ${testsWithMocks} testes com mocks`);
    console.log(`   ✓ ${testsWithApiPatterns} testes de padrões API`);
    console.log(`   ✓ Cobertura estimada: ${this.summary.coverageEstimate.toFixed(1)}%`);
  }

  private async validateDocumentation(): Promise<void> {
    console.log('📚 Validando documentação...');

    const requiredDocs = [
      'docs/api-client-patterns.md',
      'docs/migration-guide.md',
      'docs/error-handling-patterns.md',
      'docs/api-testing-guide.md'
    ];

    for (const doc of requiredDocs) {
      if (!fs.existsSync(doc)) {
        this.addIssue('warning', 'Documentation',
          `Documentação faltando: ${doc}`,
          undefined, undefined,
          'Criar documentação necessária'
        );
      } else {
        const content = fs.readFileSync(doc, 'utf-8');
        if (content.length < 1000) {
          this.addIssue('info', 'Documentation',
            `Documentação pode estar incompleta: ${doc}`,
            doc, undefined,
            'Expandir documentação com mais detalhes'
          );
        }
      }
    }

    console.log(`   ✓ Documentação verificada`);
  }

  private async validatePackageJson(): Promise<void> {
    console.log('📦 Validando package.json...');

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    
    // Verificar scripts de teste
    if (!packageJson.scripts?.test) {
      this.addIssue('warning', 'Package.json',
        'Script de teste não encontrado',
        'package.json', undefined,
        'Adicionar script "test": "jest"'
      );
    }

    // Verificar dependências importantes
    const requiredDeps = ['@prisma/client', 'next', 'react'];
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep]) {
        this.addIssue('error', 'Package.json',
          `Dependência obrigatória faltando: ${dep}`,
          'package.json', undefined,
          `Instalar dependência: npm install ${dep}`
        );
      }
    }

    console.log(`   ✓ package.json verificado`);
  }

  private async findFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await this.findFiles(fullPath, extensions));
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private addIssue(
    type: 'error' | 'warning' | 'info',
    category: string,
    message: string,
    file?: string,
    line?: number,
    suggestion?: string
  ): void {
    this.issues.push({
      type,
      category,
      message,
      file,
      line,
      suggestion
    });
  }

  private calculateScore(): number {
    const errorWeight = -10;
    const warningWeight = -3;
    const infoWeight = -1;

    let score = 100;
    
    for (const issue of this.issues) {
      switch (issue.type) {
        case 'error':
          score += errorWeight;
          break;
        case 'warning':
          score += warningWeight;
          break;
        case 'info':
          score += infoWeight;
          break;
      }
    }

    // Bonus por completude
    if (this.summary.serviceClientsCount >= 5) score += 10;
    if (this.summary.hooksCount >= 5) score += 10;
    if (this.summary.testsCount >= 20) score += 10;
    if (this.summary.coverageEstimate >= 70) score += 15;

    return Math.max(0, Math.min(100, score));
  }

  printReport(result: ValidationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE VALIDAÇÃO DA REFATORAÇÃO');
    console.log('='.repeat(60));

    // Score geral
    const scoreColor = result.score >= 80 ? '🟢' : result.score >= 60 ? '🟡' : '🔴';
    console.log(`\n${scoreColor} SCORE GERAL: ${result.score}/100`);
    console.log(`Status: ${result.success ? '✅ APROVADO' : '❌ PRECISA MELHORIAS'}\n`);

    // Resumo
    console.log('📈 RESUMO:');
    console.log(`   Arquivos totais: ${result.summary.totalFiles}`);
    console.log(`   API routes: ${result.summary.apiRoutesCount}`);
    console.log(`   Service clients: ${result.summary.serviceClientsCount}`);
    console.log(`   Hooks: ${result.summary.hooksCount}`);
    console.log(`   Testes: ${result.summary.testsCount}`);
    console.log(`   Cobertura estimada: ${result.summary.coverageEstimate.toFixed(1)}%`);
    console.log(`   Arquivos com Prisma fora de APIs: ${result.summary.filesWithPrismaImports}`);

    // Issues por categoria
    const issuesByCategory = this.groupIssuesByCategory(result.issues);
    
    if (Object.keys(issuesByCategory).length > 0) {
      console.log('\n🔍 ISSUES ENCONTRADAS:');
      
      for (const [category, issues] of Object.entries(issuesByCategory)) {
        console.log(`\n   ${category}:`);
        
        for (const issue of issues) {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`     ${icon} ${issue.message}`);
          
          if (issue.suggestion) {
            console.log(`        💡 ${issue.suggestion}`);
          }
        }
      }
    }

    // Recomendações
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    
    if (result.summary.filesWithPrismaImports > 0) {
      console.log('   1. Migrar services que ainda usam Prisma direto');
    }
    
    if (result.summary.coverageEstimate < 70) {
      console.log('   2. Melhorar cobertura de testes');
    }
    
    const errorCount = result.issues.filter(i => i.type === 'error').length;
    if (errorCount > 0) {
      console.log('   3. Corrigir erros críticos encontrados');
    }
    
    const warningCount = result.issues.filter(i => i.type === 'warning').length;
    if (warningCount > 5) {
      console.log('   4. Resolver warnings de qualidade');
    }

    console.log('\n' + '='.repeat(60));
  }

  private groupIssuesByCategory(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = [];
      }
      acc[issue.category].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>);
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  const validator = new RefactoringValidator();
  
  validator.validate().then(result => {
    validator.printReport(result);
    
    // Exit code baseado no resultado
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Erro durante a validação:', error);
    process.exit(1);
  });
}

export { RefactoringValidator };