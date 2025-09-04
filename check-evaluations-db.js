const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEvaluationsDatabase() {
  console.log('🔍 Verificando estado das avaliações no banco de dados...\n');
  
  try {
    // 1. Verificar avaliações
    console.log('1️⃣ AVALIAÇÕES:');
    const evaluations = await prisma.evaluation.findMany({
      select: {
        id: true,
        attendantId: true,
        nota: true,
        comentario: true,
        data: true,
        xpGained: true,
        importId: true,
        createdAt: true,
        attendant: {
          select: {
            name: true,
            email: true
          }
        },
        import: {
          select: {
            fileName: true,
            importedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Total de avaliações: ${evaluations.length}`);
    
    if (evaluations.length > 0) {
      console.log('\n📋 Avaliações encontradas:');
      evaluations.forEach((eval, index) => {
        console.log(`   ${index + 1}. ${eval.attendant.name} - Nota: ${eval.nota}`);
        console.log(`      Data: ${eval.data.toLocaleDateString('pt-BR')}`);
        console.log(`      Comentário: ${eval.comentario || 'Sem comentário'}`);
        console.log(`      XP: ${eval.xpGained}`);
        console.log(`      Import: ${eval.import?.fileName || 'Sem importação'}`);
        console.log(`      ID: ${eval.id}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma avaliação encontrada (como esperado)');
    }
    
    // 2. Verificar importações de avaliações
    console.log('2️⃣ IMPORTAÇÕES DE AVALIAÇÕES:');
    const evaluationImports = await prisma.evaluationImport.findMany({
      select: {
        id: true,
        fileName: true,
        importedAt: true,
        attendantMap: true,
        importedBy: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            evaluations: true
          }
        }
      },
      orderBy: {
        importedAt: 'desc'
      }
    });
    
    console.log(`📊 Total de importações: ${evaluationImports.length}`);
    
    if (evaluationImports.length > 0) {
      console.log('\n📋 Importações encontradas:');
      evaluationImports.forEach((imp, index) => {
        console.log(`   ${index + 1}. ${imp.fileName}`);
        console.log(`      Data: ${imp.importedAt.toLocaleString('pt-BR')}`);
        console.log(`      Por: ${imp.importedBy?.name || 'Usuário não encontrado'}`);
        console.log(`      Avaliações: ${imp._count.evaluations}`);
        console.log(`      ID: ${imp.id}`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma importação encontrada');
    }
    
    // 3. Verificar atendentes (necessários para avaliações)
    console.log('3️⃣ ATENDENTES:');
    const attendants = await prisma.attendant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        _count: {
          select: {
            evaluations: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`📊 Total de atendentes: ${attendants.length}`);
    
    if (attendants.length > 0) {
      console.log('\n📋 Atendentes (primeiros 10):');
      attendants.slice(0, 10).forEach((att, index) => {
        console.log(`   ${index + 1}. ${att.name} (${att.email})`);
        console.log(`      CPF: ${att.cpf}`);
        console.log(`      Avaliações: ${att._count.evaluations}`);
        console.log(`      ID: ${att.id}`);
        console.log('');
      });
      
      if (attendants.length > 10) {
        console.log(`   ... e mais ${attendants.length - 10} atendentes`);
      }
    } else {
      console.log('⚠️  Nenhum atendente encontrado');
      console.log('💡 Sem atendentes, não é possível importar avaliações');
    }
    
    // 4. Verificar possíveis dados órfãos
    console.log('4️⃣ VERIFICAÇÃO DE INTEGRIDADE:');
    
    // Avaliações sem atendente
    const orphanedEvaluations = await prisma.evaluation.findMany({
      where: {
        attendant: null
      },
      select: {
        id: true,
        attendantId: true
      }
    });
    
    if (orphanedEvaluations.length > 0) {
      console.log(`⚠️  ${orphanedEvaluations.length} avaliação(ões) órfã(s) encontrada(s):`);
      orphanedEvaluations.forEach(eval => {
        console.log(`   - ID: ${eval.id}, AttendantID: ${eval.attendantId}`);
      });
    } else {
      console.log('✅ Nenhuma avaliação órfã');
    }
    
    // Importações sem usuário
    const orphanedImports = await prisma.evaluationImport.findMany({
      where: {
        importedBy: null
      },
      select: {
        id: true,
        fileName: true,
        importedById: true
      }
    });
    
    if (orphanedImports.length > 0) {
      console.log(`⚠️  ${orphanedImports.length} importação(ões) órfã(s) encontrada(s):`);
      orphanedImports.forEach(imp => {
        console.log(`   - ${imp.fileName} (ID: ${imp.id}, UserID: ${imp.importedById})`);
      });
    } else {
      console.log('✅ Nenhuma importação órfã');
    }
    
    // 5. Resumo e recomendações
    console.log('\n📋 RESUMO:');
    console.log(`   Avaliações: ${evaluations.length}`);
    console.log(`   Importações: ${evaluationImports.length}`);
    console.log(`   Atendentes: ${attendants.length}`);
    console.log(`   Avaliações órfãs: ${orphanedEvaluations.length}`);
    console.log(`   Importações órfãs: ${orphanedImports.length}`);
    
    if (evaluations.length === 0 && evaluationImports.length === 0) {
      console.log('\n✅ ESTADO LIMPO: Banco está limpo para importação');
      console.log('💡 O erro de duplicação pode estar na lógica de verificação');
    } else if (evaluations.length === 0 && evaluationImports.length > 0) {
      console.log('\n⚠️  INCONSISTÊNCIA: Há importações mas sem avaliações');
      console.log('💡 Pode haver problema na relação entre importação e avaliações');
    } else {
      console.log('\n📊 DADOS EXISTENTES: Há avaliações no banco');
      console.log('💡 Verificar se realmente são duplicatas ou erro na lógica');
    }
    
    if (attendants.length === 0) {
      console.log('\n❌ PROBLEMA: Sem atendentes não é possível importar avaliações');
      console.log('💡 Importe atendentes primeiro');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvaluationsDatabase();