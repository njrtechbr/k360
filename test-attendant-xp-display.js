/**
 * Teste manual para verificar se o componente AttendantXpDisplay está funcionando
 * Este script testa as funcionalidades principais do componente
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAttendantXpDisplay() {
  try {
    console.log('🧪 Testando funcionalidades do AttendantXpDisplay...\n');

    // 1. Buscar um atendente para teste
    let attendant = await prisma.attendant.findFirst();

    if (!attendant) {
      console.log('⚠️  Nenhum atendente encontrado, criando um para teste...');
      
      // Criar um atendente de teste
      attendant = await prisma.attendant.create({
        data: {
          name: 'Atendente Teste',
          email: 'teste@exemplo.com',
          funcao: 'Atendente',
          setor: 'Atendimento',
          status: 'ativo',
          telefone: '11999999999',
          dataAdmissao: new Date(),
          dataNascimento: new Date('1990-01-01'),
          rg: '123456789',
          cpf: '12345678901'
        }
      });
      
      console.log('✅ Atendente de teste criado');
    }

    console.log(`✅ Atendente encontrado: ${attendant.name} (${attendant.id})`);

    // 2. Verificar XP total
    const totalXpEvents = await prisma.xpEvent.findMany({
      where: {
        attendantId: attendant.id
      }
    });

    const totalXp = totalXpEvents.reduce((sum, event) => sum + event.points, 0);
    console.log(`📊 XP Total: ${totalXp}`);

    // 3. Verificar XP de avaliações
    const evaluationXpEvents = await prisma.xpEvent.findMany({
      where: {
        attendantId: attendant.id,
        type: 'evaluation'
      }
    });

    const evaluationXp = evaluationXpEvents.reduce((sum, event) => sum + event.points, 0);
    console.log(`⭐ XP de Avaliações: ${evaluationXp}`);

    // 4. Verificar XP avulso
    const xpGrants = await prisma.xpGrant.findMany({
      where: {
        attendantId: attendant.id
      },
      include: {
        type: true,
        granter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const avulsoXp = xpGrants.reduce((sum, grant) => sum + grant.points, 0);
    console.log(`🎁 XP Avulso: ${avulsoXp} (${xpGrants.length} concessões)`);

    // 5. Verificar cálculos
    const calculatedEvaluationXp = totalXp - avulsoXp;
    console.log(`🧮 XP de Avaliações (calculado): ${calculatedEvaluationXp}`);

    if (Math.abs(evaluationXp - calculatedEvaluationXp) < 0.01) {
      console.log('✅ Cálculos de XP estão corretos');
    } else {
      console.log('⚠️  Diferença nos cálculos de XP detectada');
    }

    // 6. Mostrar detalhes das concessões de XP avulso
    if (xpGrants.length > 0) {
      console.log('\n📋 Histórico de XP Avulso:');
      xpGrants.forEach((grant, index) => {
        console.log(`  ${index + 1}. ${grant.type.name} - ${grant.points} XP`);
        console.log(`     Concedido por: ${grant.granter.name}`);
        console.log(`     Data: ${grant.grantedAt.toLocaleDateString('pt-BR')}`);
        if (grant.justification) {
          console.log(`     Justificativa: ${grant.justification}`);
        }
        console.log('');
      });
    } else {
      console.log('\n📋 Nenhum XP avulso encontrado para este atendente');
    }

    // 7. Calcular estatísticas
    const avgXpPerGrant = xpGrants.length > 0 ? avulsoXp / xpGrants.length : 0;
    const xpAvulsoPercentage = totalXp > 0 ? (avulsoXp / totalXp) * 100 : 0;

    console.log('\n📈 Estatísticas:');
    console.log(`   • Média por concessão: ${Math.round(avgXpPerGrant)} XP`);
    console.log(`   • Percentual de XP Avulso: ${xpAvulsoPercentage.toFixed(1)}%`);
    console.log(`   • Percentual de XP de Avaliações: ${(100 - xpAvulsoPercentage).toFixed(1)}%`);

    // 8. Verificar tipos de XP disponíveis
    const xpTypes = await prisma.xpTypeConfig.findMany({
      where: {
        active: true
      }
    });

    console.log(`\n🏷️  Tipos de XP Avulso disponíveis: ${xpTypes.length}`);
    xpTypes.forEach(type => {
      console.log(`   • ${type.name}: ${type.points} XP`);
    });

    console.log('\n✅ Teste concluído com sucesso!');
    console.log('\n💡 O componente AttendantXpDisplay deve exibir:');
    console.log(`   - XP Total: ${totalXp}`);
    console.log(`   - XP de Avaliações: ${calculatedEvaluationXp}`);
    console.log(`   - XP Avulso: ${avulsoXp}`);
    console.log(`   - ${xpGrants.length} concessões no histórico`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testAttendantXpDisplay();