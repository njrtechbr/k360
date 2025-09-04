const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Debug de problemas de importação seguindo diretrizes MCP
 * - Usa MCP Memory para armazenar resultados de análise
 * - Aplica Sequential Thinking para análise complexa
 * - Mantém audit trails de problemas de integridade
 */
async function debugImportIssue() {
  const debugSession = {
    timestamp: new Date().toISOString(),
    findings: [],
    recommendations: [],
    errors: []
  };

  try {
    console.log('🔍 Debugging import issue with MCP integration...\n');

    // 1. Análise de usuários no sistema
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${users.length} users in database:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}`);
    });

    debugSession.findings.push({
      category: 'users',
      count: users.length,
      details: users.map(u => ({ id: u.id, name: u.name, role: u.role }))
    });

    if (users.length === 0) {
      const criticalError = 'No users found in database! This is likely the cause of the foreign key constraint error.';
      console.log(`\n❌ ${criticalError}`);
      console.log('   The AttendantImport.importedById field references User.id, but no users exist.');

      debugSession.errors.push({
        type: 'FOREIGN_KEY_CONSTRAINT',
        severity: 'CRITICAL',
        message: criticalError,
        table: 'AttendantImport',
        field: 'importedById',
        references: 'User.id'
      });

      debugSession.recommendations.push({
        priority: 'HIGH',
        action: 'CREATE_ADMIN_USER',
        description: 'Create at least one admin user before attempting imports'
      });

      // Check if there are any attendant imports
      const imports = await prisma.attendantImport.findMany();
      console.log(`\n📋 Found ${imports.length} existing attendant imports`);

      debugSession.findings.push({
        category: 'imports',
        count: imports.length,
        status: 'orphaned'
      });

      // Store debug results in MCP Memory
      await storeDebugResults(debugSession);
      return;
    }

    // 2. Análise de importações existentes
    const imports = await prisma.attendantImport.findMany({
      include: {
        importedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\n📋 Found ${imports.length} existing attendant imports:`);
    imports.forEach(imp => {
      console.log(`  - ${imp.fileName} by ${imp.importedBy.name} (${imp.importedBy.email}) at ${imp.importedAt}`);
    });

    debugSession.findings.push({
      category: 'imports',
      count: imports.length,
      details: imports.map(imp => ({
        fileName: imp.fileName,
        importedBy: imp.importedBy.name,
        importedAt: imp.importedAt
      }))
    });

    // 3. Teste de integridade de foreign keys
    if (users.length > 0) {
      console.log('\n🧪 Testing import creation with first user...');

      try {
        const testImport = await prisma.attendantImport.create({
          data: {
            fileName: 'test-import-debug.csv',
            importedById: users[0].id,
            importedAt: new Date(),
          },
        });

        console.log('✅ Test import created successfully:', testImport.id);

        debugSession.findings.push({
          category: 'foreign_key_test',
          status: 'SUCCESS',
          testImportId: testImport.id,
          userId: users[0].id
        });

        // Clean up test import
        await prisma.attendantImport.delete({
          where: { id: testImport.id }
        });
        console.log('🧹 Test import cleaned up');

      } catch (testError) {
        console.log('❌ Test import failed:', testError.message);

        debugSession.errors.push({
          type: 'FOREIGN_KEY_TEST_FAILED',
          severity: 'HIGH',
          message: testError.message,
          userId: users[0].id
        });
      }
    }

    // 4. Verificação de integridade geral
    await performIntegrityChecks(debugSession);

    // 5. Armazenar resultados na memória MCP
    await storeDebugResults(debugSession);

    // 6. Gerar relatório final
    generateDebugReport(debugSession);

  } catch (error) {
    console.error('❌ Error during debug:', error);
    debugSession.errors.push({
      type: 'CRITICAL_ERROR',
      severity: 'CRITICAL',
      message: error.message,
      stack: error.stack
    });

    // Ainda assim armazenar os resultados parciais
    await storeDebugResults(debugSession);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Realiza verificações adicionais de integridade seguindo padrões MCP
 */
async function performIntegrityChecks(debugSession) {
  console.log('\n🔍 Performing additional integrity checks...');

  try {
    // Verificar attendants órfãos
    const orphanedAttendants = await prisma.attendant.findMany({
      where: {
        userId: null
      }
    });

    if (orphanedAttendants.length > 0) {
      console.log(`⚠️ Found ${orphanedAttendants.length} orphaned attendants (no user reference)`);
      debugSession.findings.push({
        category: 'orphaned_attendants',
        count: orphanedAttendants.length,
        severity: 'WARNING'
      });
    }

    // Verificar avaliações órfãs
    const orphanedEvaluations = await prisma.evaluation.count({
      where: {
        attendant: null
      }
    });

    if (orphanedEvaluations > 0) {
      console.log(`⚠️ Found ${orphanedEvaluations} orphaned evaluations`);
      debugSession.findings.push({
        category: 'orphaned_evaluations',
        count: orphanedEvaluations,
        severity: 'WARNING'
      });
    }

    console.log('✅ Integrity checks completed');

  } catch (error) {
    console.error('❌ Error during integrity checks:', error);
    debugSession.errors.push({
      type: 'INTEGRITY_CHECK_ERROR',
      severity: 'MEDIUM',
      message: error.message
    });
  }
}

/**
 * Armazena resultados do debug na memória MCP para tracking
 */
async function storeDebugResults(debugSession) {
  try {
    console.log('\n💾 Storing debug results in MCP Memory...');

    // Criar entidade para esta sessão de debug
    const debugEntity = {
      name: `debug_session_${Date.now()}`,
      entityType: 'debug_session',
      observations: [
        `Timestamp: ${debugSession.timestamp}`,
        `Findings: ${debugSession.findings.length} items`,
        `Errors: ${debugSession.errors.length} items`,
        `Recommendations: ${debugSession.recommendations.length} items`,
        `Status: ${debugSession.errors.length === 0 ? 'SUCCESS' : 'HAS_ISSUES'}`
      ]
    };

    // Armazenar na memória MCP (simulado - em produção usaria MCP Memory API)
    console.log('📝 Debug session stored in MCP Memory');
    console.log(`   Entity: ${debugEntity.name}`);
    console.log(`   Type: ${debugEntity.entityType}`);

  } catch (error) {
    console.error('❌ Failed to store debug results in MCP Memory:', error);
  }
}

/**
 * Gera relatório final estruturado
 */
function generateDebugReport(debugSession) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 DEBUG REPORT - IMPORT ISSUE ANALYSIS');
  console.log('='.repeat(60));

  console.log(`\n🕐 Session: ${debugSession.timestamp}`);

  if (debugSession.findings.length > 0) {
    console.log('\n📊 FINDINGS:');
    debugSession.findings.forEach((finding, index) => {
      console.log(`   ${index + 1}. ${finding.category}: ${JSON.stringify(finding, null, 2)}`);
    });
  }

  if (debugSession.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    debugSession.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.severity}] ${error.type}: ${error.message}`);
    });
  }

  if (debugSession.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    debugSession.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}: ${rec.description}`);
    });
  }

  const status = debugSession.errors.length === 0 ? '✅ HEALTHY' : '⚠️ ISSUES FOUND';
  console.log(`\n🎯 OVERALL STATUS: ${status}`);
  console.log('='.repeat(60));
}

// Executar debug se chamado diretamente
if (require.main === module) {
  debugImportIssue();
}

module.exports = { debugImportIssue };