#!/usr/bin/env tsx

/**
 * Script de validação da documentação do sistema de backup
 * Verifica se todos os arquivos de documentação estão presentes e corretos
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

interface DocumentationFile {
  path: string;
  name: string;
  required: boolean;
  minSize: number; // bytes
  description: string;
}

interface ValidationResult {
  file: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

class BackupDocumentationValidator {
  private projectRoot: string;
  private results: ValidationResult[] = [];

  private documentationFiles: DocumentationFile[] = [
    {
      path: 'docs/sistema-backup-completo.md',
      name: 'Documentação Principal',
      required: true,
      minSize: 5000,
      description: 'Visão geral completa do sistema'
    },
    {
      path: 'docs/guia-usuario.md',
      name: 'Guia do Usuário',
      required: true,
      minSize: 3000,
      description: 'Como usar a interface web'
    },
    {
      path: 'docs/guia-cli.md',
      name: 'Guia da CLI',
      required: true,
      minSize: 4000,
      description: 'Comandos de linha de comando'
    },
    {
      path: 'docs/troubleshooting.md',
      name: 'Troubleshooting',
      required: true,
      minSize: 3000,
      description: 'Solução de problemas comuns'
    },
    {
      path: 'docs/faq.md',
      name: 'FAQ',
      required: true,
      minSize: 2000,
      description: 'Perguntas frequentes'
    },
    {
      path: 'docs/instalacao.md',
      name: 'Guia de Instalação',
      required: true,
      minSize: 3000,
      description: 'Instalação passo a passo'
    },
    {
      path: 'docs/README-backup.md',
      name: 'README do Sistema',
      required: true,
      minSize: 2000,
      description: 'Visão geral e início rápido'
    },
    {
      path: 'scripts/setup-backup-system.ts',
      name: 'Script de Setup',
      required: true,
      minSize: 1000,
      description: 'Configuração inicial automatizada'
    },
    {
      path: 'scripts/validate-backup-environment.ts',
      name: 'Script de Validação',
      required: true,
      minSize: 1000,
      description: 'Validação do ambiente'
    },
    {
      path: 'scripts/deploy-backup-system.sh',
      name: 'Script de Deploy',
      required: true,
      minSize: 1000,
      description: 'Deploy automatizado'
    }
  ];

  constructor() {
    this.projectRoot = process.cwd();
  }

  async validate(): Promise<void> {
    console.log('📚 Validando documentação do sistema de backup...\n');

    this.validateDocumentationFiles();
    this.validatePackageJsonScripts();
    this.validateDocumentationContent();
    this.validateCrossReferences();

    this.printResults();
    this.printSummary();
  }

  private validateDocumentationFiles(): void {
    console.log('📄 Verificando arquivos de documentação...');

    for (const doc of this.documentationFiles) {
      const fullPath = join(this.projectRoot, doc.path);
      
      if (!existsSync(fullPath)) {
        this.addResult(doc.name, 'error', 'Arquivo não encontrado', `Crie o arquivo: ${doc.path}`);
        continue;
      }

      const stats = statSync(fullPath);
      
      if (stats.size < doc.minSize) {
        this.addResult(doc.name, 'warning', `Arquivo muito pequeno (${stats.size} bytes)`, `Expanda o conteúdo (mínimo: ${doc.minSize} bytes)`);
      } else {
        this.addResult(doc.name, 'success', `Arquivo OK (${stats.size} bytes)`);
      }

      // Verificar se é legível
      try {
        readFileSync(fullPath, 'utf8');
        this.addResult(doc.name + ' (Legibilidade)', 'success', 'Arquivo legível');
      } catch {
        this.addResult(doc.name + ' (Legibilidade)', 'error', 'Arquivo corrompido', 'Verifique a codificação do arquivo');
      }
    }
  }

  private validatePackageJsonScripts(): void {
    console.log('📦 Verificando scripts do package.json...');

    const packageJsonPath = join(this.projectRoot, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      this.addResult('package.json', 'error', 'Arquivo não encontrado');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      const requiredScripts = [
        'backup:create',
        'backup:list', 
        'backup:validate',
        'backup:cleanup',
        'backup:info',
        'backup:setup',
        'backup:validate-env',
        'backup:deploy'
      ];

      for (const script of requiredScripts) {
        if (scripts[script]) {
          this.addResult(`Script ${script}`, 'success', 'Configurado');
        } else {
          this.addResult(`Script ${script}`, 'error', 'Não encontrado', `Adicione ao package.json: "${script}": "..."`);
        }
      }

    } catch (error) {
      this.addResult('package.json', 'error', 'Arquivo inválido', 'Corrija a sintaxe JSON');
    }
  }

  private validateDocumentationContent(): void {
    console.log('📝 Verificando conteúdo da documentação...');

    // Verificar se documentos contêm seções essenciais
    const contentChecks = [
      {
        file: 'docs/sistema-backup-completo.md',
        requiredSections: ['Visão Geral', 'Funcionalidades', 'Arquitetura', 'Requisitos'],
        name: 'Documentação Principal'
      },
      {
        file: 'docs/guia-usuario.md',
        requiredSections: ['Introdução', 'Acessando o Sistema', 'Criando um Backup', 'Gerenciando Backups'],
        name: 'Guia do Usuário'
      },
      {
        file: 'docs/guia-cli.md',
        requiredSections: ['Introdução', 'Comandos Disponíveis', 'Criando Backups', 'Automação'],
        name: 'Guia da CLI'
      },
      {
        file: 'docs/troubleshooting.md',
        requiredSections: ['Problemas Comuns', 'Instalação', 'Banco de Dados', 'Sistema de Arquivos'],
        name: 'Troubleshooting'
      }
    ];

    for (const check of contentChecks) {
      const filePath = join(this.projectRoot, check.file);
      
      if (!existsSync(filePath)) {
        continue; // Já reportado na validação de arquivos
      }

      try {
        const content = readFileSync(filePath, 'utf8');
        let sectionsFound = 0;

        for (const section of check.requiredSections) {
          if (content.includes(section)) {
            sectionsFound++;
          }
        }

        const percentage = (sectionsFound / check.requiredSections.length) * 100;
        
        if (percentage >= 100) {
          this.addResult(`${check.name} (Conteúdo)`, 'success', 'Todas as seções presentes');
        } else if (percentage >= 75) {
          this.addResult(`${check.name} (Conteúdo)`, 'warning', `${sectionsFound}/${check.requiredSections.length} seções encontradas`);
        } else {
          this.addResult(`${check.name} (Conteúdo)`, 'error', `Apenas ${sectionsFound}/${check.requiredSections.length} seções encontradas`, 'Adicione seções faltantes');
        }

      } catch {
        this.addResult(`${check.name} (Conteúdo)`, 'error', 'Não foi possível ler o arquivo');
      }
    }
  }

  private validateCrossReferences(): void {
    console.log('🔗 Verificando referências cruzadas...');

    // Verificar se links internos existem
    const docsToCheck = [
      'docs/README-backup.md',
      'docs/sistema-backup-completo.md'
    ];

    for (const docPath of docsToCheck) {
      const fullPath = join(this.projectRoot, docPath);
      
      if (!existsSync(fullPath)) {
        continue;
      }

      try {
        const content = readFileSync(fullPath, 'utf8');
        
        // Procurar por links para outros documentos
        const linkPattern = /\[.*?\]\((.*?\.md)\)/g;
        const links = [...content.matchAll(linkPattern)];
        
        let validLinks = 0;
        let totalLinks = 0;

        for (const link of links) {
          const linkedFile = link[1];
          totalLinks++;
          
          // Verificar se é um link relativo para documentação
          if (!linkedFile.startsWith('http') && linkedFile.endsWith('.md')) {
            const linkedPath = join(this.projectRoot, 'docs', linkedFile);
            if (existsSync(linkedPath)) {
              validLinks++;
            }
          } else {
            validLinks++; // Links externos assumidos como válidos
          }
        }

        if (totalLinks === 0) {
          this.addResult(`${docPath} (Links)`, 'warning', 'Nenhum link encontrado');
        } else if (validLinks === totalLinks) {
          this.addResult(`${docPath} (Links)`, 'success', `${validLinks}/${totalLinks} links válidos`);
        } else {
          this.addResult(`${docPath} (Links)`, 'error', `${validLinks}/${totalLinks} links válidos`, 'Corrija links quebrados');
        }

      } catch {
        this.addResult(`${docPath} (Links)`, 'error', 'Não foi possível verificar links');
      }
    }
  }

  private addResult(file: string, status: 'success' | 'warning' | 'error', message: string, suggestion?: string): void {
    this.results.push({ file, status, message, suggestion });
  }

  private printResults(): void {
    console.log('\n📊 Resultados da validação:\n');

    for (const result of this.results) {
      const icon = this.getStatusIcon(result.status);
      console.log(`${icon} ${result.file}: ${result.message}`);
      
      if (result.suggestion) {
        console.log(`    💡 ${result.suggestion}`);
      }
    }
  }

  private printSummary(): void {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const totalCount = this.results.length;

    console.log('\n📋 Resumo da Validação:');
    console.log(`  ✅ Sucessos: ${successCount}/${totalCount}`);
    console.log(`  ⚠️  Avisos: ${warningCount}/${totalCount}`);
    console.log(`  ❌ Erros: ${errorCount}/${totalCount}`);

    const successRate = (successCount / totalCount) * 100;

    if (errorCount === 0 && warningCount === 0) {
      console.log('\n🎉 Documentação completa e perfeita!');
    } else if (errorCount === 0) {
      console.log('\n✅ Documentação funcional com algumas melhorias possíveis.');
    } else if (successRate >= 80) {
      console.log('\n⚠️  Documentação quase completa. Corrija os erros restantes.');
    } else {
      console.log('\n❌ Documentação incompleta. Vários itens precisam ser corrigidos.');
    }

    console.log('\n📚 Checklist de Documentação:');
    console.log('  - [ ] Todos os arquivos de documentação criados');
    console.log('  - [ ] Scripts de setup e deploy funcionais');
    console.log('  - [ ] Package.json com todos os scripts necessários');
    console.log('  - [ ] Conteúdo completo em cada documento');
    console.log('  - [ ] Links internos funcionando');
    console.log('  - [ ] Exemplos de código testados');
    console.log('  - [ ] Troubleshooting abrangente');

    console.log('\n🚀 Próximos passos:');
    console.log('  1. Corrija os erros identificados');
    console.log('  2. Execute: npm run backup:setup');
    console.log('  3. Teste a documentação seguindo os guias');
    console.log('  4. Valide o ambiente: npm run backup:validate-env');

    if (errorCount > 0) {
      process.exit(1);
    }
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
  const validator = new BackupDocumentationValidator();
  validator.validate().catch(console.error);
}

export default BackupDocumentationValidator;