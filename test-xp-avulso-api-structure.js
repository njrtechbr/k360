/**
 * Script para testar a estrutura da API de XP avulso
 * Verifica se os endpoints estão respondendo corretamente
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? await response.json() : await response.text()
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 Testando estrutura da API de XP avulso...');
  console.log('=' .repeat(50));

  // Teste 1: Endpoint de tipos de XP
  console.log('\n1. 🎁 Testando /api/gamification/xp-types');
  const xpTypesTest = await testEndpoint('/api/gamification/xp-types');
  console.log(`   Status: ${xpTypesTest.status} ${xpTypesTest.ok ? '✅' : '❌'}`);
  
  if (xpTypesTest.ok && Array.isArray(xpTypesTest.data)) {
    console.log(`   Tipos encontrados: ${xpTypesTest.data.length}`);
    if (xpTypesTest.data.length > 0) {
      const firstType = xpTypesTest.data[0];
      console.log(`   Exemplo: ${firstType.name} (+${firstType.points} XP)`);
    }
  }

  // Teste 2: Endpoint de concessões (GET)
  console.log('\n2. 📚 Testando /api/gamification/xp-grants');
  const grantsTest = await testEndpoint('/api/gamification/xp-grants');
  console.log(`   Status: ${grantsTest.status} ${grantsTest.ok ? '✅' : '❌'}`);
  
  if (grantsTest.ok) {
    console.log('   Endpoint de histórico funcionando');
  }

  // Teste 3: Endpoint de estatísticas
  console.log('\n3. 📊 Testando /api/gamification/xp-grants/statistics');
  const statsTest = await testEndpoint('/api/gamification/xp-grants/statistics');
  console.log(`   Status: ${statsTest.status} ${statsTest.ok ? '✅' : '❌'}`);
  
  if (statsTest.ok) {
    console.log('   Endpoint de estatísticas funcionando');
  }

  // Teste 4: Endpoint de atendentes
  console.log('\n4. 👥 Testando /api/attendants');
  const attendantsTest = await testEndpoint('/api/attendants');
  console.log(`   Status: ${attendantsTest.status} ${attendantsTest.ok ? '✅' : '❌'}`);
  
  if (attendantsTest.ok && Array.isArray(attendantsTest.data)) {
    console.log(`   Atendentes encontrados: ${attendantsTest.data.length}`);
    const activeAttendants = attendantsTest.data.filter(a => a.status === 'Ativo');
    console.log(`   Atendentes ativos: ${activeAttendants.length}`);
  }

  // Teste 5: Verificar se há temporada ativa
  console.log('\n5. 🏆 Testando temporadas ativas');
  const seasonsTest = await testEndpoint('/api/gamification/seasons');
  console.log(`   Status: ${seasonsTest.status} ${seasonsTest.ok ? '✅' : '❌'}`);
  
  if (seasonsTest.ok && Array.isArray(seasonsTest.data)) {
    const activeSeasons = seasonsTest.data.filter(s => s.active);
    console.log(`   Temporadas ativas: ${activeSeasons.length}`);
    if (activeSeasons.length > 0) {
      console.log(`   Temporada atual: ${activeSeasons[0].name}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📋 Resumo dos testes:');
  
  const tests = [
    { name: 'Tipos de XP', result: xpTypesTest.ok },
    { name: 'Histórico de concessões', result: grantsTest.ok },
    { name: 'Estatísticas', result: statsTest.ok },
    { name: 'Atendentes', result: attendantsTest.ok },
    { name: 'Temporadas', result: seasonsTest.ok }
  ];

  tests.forEach(test => {
    console.log(`   ${test.result ? '✅' : '❌'} ${test.name}`);
  });

  const allPassed = tests.every(test => test.result);
  console.log(`\n${allPassed ? '🎉' : '⚠️'} ${allPassed ? 'Todos os testes passaram!' : 'Alguns testes falharam'}`);

  if (allPassed) {
    console.log('\n💡 Sistema de XP avulso está estruturalmente correto!');
    console.log('   Para testar completamente:');
    console.log('   1. Certifique-se de ter atendentes ativos');
    console.log('   2. Certifique-se de ter uma temporada ativa');
    console.log('   3. Teste a concessão através da interface web');
  }
}

main().catch(console.error);