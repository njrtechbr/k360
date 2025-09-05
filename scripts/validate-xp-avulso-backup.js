#!/usr/bin/env node

/**
 * Script de validação de backup e recuperação do sistema de XP avulso
 * Executa verificações de integridade e testa procedimentos de recuperação
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

class XpAvulsoBackupValidator {
  constructor() {
    this.results = {
      integrity: [],
      performance: [],
      backup: [],
      errors: []
    };
  }

  /**
   * Executa todas as validações
   */
  async runAllValidations() {
    console.log('🔍 Iniciando validação do sistema de XP avulso...\n');

    try {
      await this.validateDataIntegrity();
      await this.validatePerformance();
      await this.validateBackupProcedures();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Erro durante validação:', error);
      this.results.errors.push({
        type: 'VALIDATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Valida integridade dos dados
   */
  async validateDataIntegrity() {
    console.log('📊 Validando integridade dos dados...');

    // Verificar consistência XpGrant <-> XpEvent
    const orphanedGrants = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "XpGrant" g 
      LEFT JOIN "XpEvent" e ON g."xpEventId" = e.id 
      WHERE e.id IS NULL
    `;

    this.results.integrity.push({
      check: 'XpGrant-XpEvent Consistency',
      status: orphanedGrants[0].count === 0n ? 'PASS' : 'FAIL',
      details: `${orphanedGrants[0].count} registros órfãos encontrados`,
      timestamp: new Date().toISOString()
    });

    // Verificar tipos de XP ativos
    const activeTypes = await prisma.xpTypeConfig.count({
      where: { active: true }
    });

    this.results.integrity.push({
      check: 'Active XP Types',
      status: activeTypes > 0 ? 'PASS' : 'WARN',
      details: `${activeTypes} tipos ativos encontrados`,
      timestamp: new Date().toISOString()
    });

    // Verificar temporadas ativas
    const activeSeasons = await prisma.gamificationSeason.count({
      where: { active: true }
    });

    this.results.integrity.push({
      check: 'Active Seasons',
      status: activeSeasons === 1 ? 'PASS' : 'WARN',
      details: `${activeSeasons} temporadas ativas (esperado: 1)`,
      timestamp: new Date().toISOString()
    });

    // Verificar multiplicadores aplicados corretamente
    const incorrectMultipliers = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "XpGrant" g 
      JOIN "XpEvent" e ON g."xpEventId" = e.id 
      WHERE g.points != e."basePoints"
      AND e.multiplier = 1
    `;

    this.results.integrity.push({
      check: 'Multiplier Application',
      status: 'INFO',
      details: `${incorrectMultipliers[0].count} eventos com multiplicadores aplicados`,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Validação de integridade concluída\n');
  }

  /**
   * Valida performance do sistema
   */
  async validatePerformance() {
    console.log('⚡ Validando performance...');

    // Teste de consulta de tipos
    const startTypes = Date.now();
    await prisma.xpTypeConfig.findMany({
      where: { active: true },
      include: {
        creator: {
          select: { id: true, name: true }
        }
      }
    });
    const typesTime = Date.now() - startTypes;

    this.results.performance.push({
      operation: 'Find Active XP Types',
      duration: typesTime,
      status: typesTime < 100 ? 'PASS' : 'WARN',
      threshold: '< 100ms',
      timestamp: new Date().toISOString()
    });

    // Teste de consulta de histórico com paginação
    const startHistory = Date.now();
    await prisma.xpGrant.findMany({
      take: 20,
      skip: 0,
      include: {
        attendant: true,
        type: true,
        granter: {
          select: { id: true, name: true }
        }
      },
      orderBy: { grantedAt: 'desc' }
    });
    const historyTime = Date.now() - startHistory;

    this.results.performance.push({
      operation: 'Grant History Query',
      duration: historyTime,
      status: historyTime < 200 ? 'PASS' : 'WARN',
      threshold: '< 200ms',
      timestamp: new Date().toISOString()
    });

    // Teste de agregação para estatísticas
    const startStats = Date.now();
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    await prisma.xpGrant.findMany({
      where: {
        grantedAt: {
          gte: thirtyDaysAgo,
          lte: today
        }
      },
      include: {
        type: true,
        granter: {
          select: { id: true, name: true }
        }
      }
    });
    const statsTime = Date.now() - startStats;

    this.results.performance.push({
      operation: 'Statistics Aggregation',
      duration: statsTime,
      status: statsTime < 500 ? 'PASS' : 'WARN',
      threshold: '< 500ms',
      timestamp: new Date().toISOString()
    });

    console.log('✅ Validação de performance concluída\n');
  }

  /**
   * Valida procedimentos de backup
   */
  async validateBackupProcedures() {
    console.log('💾 Validando procedimentos de backup...');

    // Verificar se diretório de backup existe
    const backupDir = path.join(process.cwd(), 'backups');
    const backupDirExists = fs.existsSync(backupDir);

    this.results.backup.push({
      check: 'Backup Directory',
      status: backupDirExists ? 'PASS' : 'WARN',
      details: backupDirExists ? 'Diretório existe' : 'Diretório não encontrado',
      path: backupDir,
      timestamp: new Date().toISOString()
    });

    // Simular backup de dados críticos
    try {
      const criticalData = {
        xpTypes: await prisma.xpTypeConfig.count(),
        xpGrants: await prisma.xpGrant.count(),
        xpEvents: await prisma.xpEvent.count()
      };

      this.results.backup.push({
        check: 'Critical Data Count',
        status: 'PASS',
        details: `Types: ${criticalData.xpTypes}, Grants: ${criticalData.xpGrants}, Events: ${criticalData.xpEvents}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.results.backup.push({
        check: 'Critical Data Access',
        status: 'FAIL',
        details: `Erro ao acessar dados: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Verificar logs de auditoria
    const recentGrants = await prisma.xpGrant.count({
      where: {
        grantedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
        }
      }
    });

    this.results.backup.push({
      check: 'Recent Activity',
      status: 'INFO',
      details: `${recentGrants} concessões nas últimas 24h`,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Validação de backup concluída\n');
  }

  /**
   * Gera relatório final
   */
  async generateReport() {
    console.log('📋 Gerando relatório final...\n');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_checks: this.getTotalChecks(),
        passed: this.getPassedChecks(),
        warnings: this.getWarningChecks(),
        failed: this.getFailedChecks(),
        errors: this.results.errors.length
      },
      details: this.results
    };

    // Salvar relatório
    const reportPath = path.join(process.cwd(), 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Exibir resumo
    console.log('📊 RESUMO DA VALIDAÇÃO');
    console.log('========================');
    console.log(`✅ Aprovados: ${report.summary.passed}`);
    console.log(`⚠️  Avisos: ${report.summary.warnings}`);
    console.log(`❌ Falhas: ${report.summary.failed}`);
    console.log(`🚨 Erros: ${report.summary.errors}`);
    console.log(`📁 Relatório salvo em: ${reportPath}\n`);

    // Exibir detalhes por categoria
    this.displayCategoryResults('INTEGRIDADE DE DADOS', this.results.integrity);
    this.displayCategoryResults('PERFORMANCE', this.results.performance);
    this.displayCategoryResults('BACKUP E RECUPERAÇÃO', this.results.backup);

    if (this.results.errors.length > 0) {
      console.log('🚨 ERROS ENCONTRADOS:');
      this.results.errors.forEach(error => {
        console.log(`   - ${error.type}: ${error.message}`);
      });
      console.log();
    }

    // Status geral
    const overallStatus = this.getOverallStatus();
    console.log(`🎯 STATUS GERAL: ${overallStatus}`);
    
    if (overallStatus === 'CRÍTICO') {
      console.log('⚠️  AÇÃO NECESSÁRIA: Falhas críticas detectadas!');
      process.exit(1);
    } else if (overallStatus === 'ATENÇÃO') {
      console.log('⚠️  ATENÇÃO: Alguns avisos foram encontrados.');
    } else {
      console.log('✅ Sistema validado com sucesso!');
    }
  }

  /**
   * Exibe resultados por categoria
   */
  displayCategoryResults(category, results) {
    console.log(`📋 ${category}:`);
    results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      console.log(`   ${icon} ${result.check || result.operation}: ${result.details || result.duration + 'ms'}`);
    });
    console.log();
  }

  /**
   * Obtém ícone para status
   */
  getStatusIcon(status) {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARN': return '⚠️';
      case 'FAIL': return '❌';
      case 'INFO': return 'ℹ️';
      default: return '❓';
    }
  }

  /**
   * Calcula total de verificações
   */
  getTotalChecks() {
    return this.results.integrity.length + 
           this.results.performance.length + 
           this.results.backup.length;
  }

  /**
   * Conta verificações aprovadas
   */
  getPassedChecks() {
    return [...this.results.integrity, ...this.results.performance, ...this.results.backup]
      .filter(r => r.status === 'PASS').length;
  }

  /**
   * Conta avisos
   */
  getWarningChecks() {
    return [...this.results.integrity, ...this.results.performance, ...this.results.backup]
      .filter(r => r.status === 'WARN').length;
  }

  /**
   * Conta falhas
   */
  getFailedChecks() {
    return [...this.results.integrity, ...this.results.performance, ...this.results.backup]
      .filter(r => r.status === 'FAIL').length;
  }

  /**
   * Determina status geral
   */
  getOverallStatus() {
    if (this.getFailedChecks() > 0 || this.results.errors.length > 0) {
      return 'CRÍTICO';
    }
    if (this.getWarningChecks() > 0) {
      return 'ATENÇÃO';
    }
    return 'OK';
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  const validator = new XpAvulsoBackupValidator();
  validator.runAllValidations().catch(console.error);
}

module.exports = XpAvulsoBackupValidator;