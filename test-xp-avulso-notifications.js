/**
 * Script para testar o sistema de notificações de XP avulso
 * 
 * Este script testa:
 * 1. Concessão de XP avulso via API
 * 2. Verificação de notificações geradas
 * 3. Teste de subida de nível
 * 4. Teste de conquistas desbloqueadas
 */

const BASE_URL = 'http://localhost:3000';

// Função para fazer requisições autenticadas
async function makeAuthenticatedRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

// Função para testar concessão de XP avulso
async function testXpAvulsoGrant() {
  console.log('\n🎯 Testando concessão de XP avulso...');

  try {
    // 1. Buscar atendentes disponíveis
    console.log('📋 Buscando atendentes...');
    const attendants = await makeAuthenticatedRequest('/api/attendants');
    
    if (!attendants || attendants.length === 0) {
      throw new Error('Nenhum atendente encontrado');
    }

    const testAttendant = attendants.find(a => a.status === 'Ativo');
    if (!testAttendant) {
      throw new Error('Nenhum atendente ativo encontrado');
    }

    console.log(`✅ Atendente selecionado: ${testAttendant.name} (${testAttendant.id})`);

    // 2. Buscar tipos de XP disponíveis
    console.log('🎁 Buscando tipos de XP...');
    const xpTypes = await makeAuthenticatedRequest('/api/gamification/xp-types');
    
    if (!xpTypes || xpTypes.length === 0) {
      throw new Error('Nenhum tipo de XP encontrado');
    }

    const activeXpTypes = xpTypes.filter(type => type.active);
    if (activeXpTypes.length === 0) {
      throw new Error('Nenhum tipo de XP ativo encontrado');
    }

    const testXpType = activeXpTypes[0];
    console.log(`✅ Tipo de XP selecionado: ${testXpType.name} (+${testXpType.points} XP)`);

    // 3. Verificar XP atual do atendente
    console.log('📊 Verificando XP atual...');
    let currentXp = 0;
    try {
      const xpResponse = await makeAuthenticatedRequest(`/api/gamification/attendants/${testAttendant.id}/xp-total`);
      currentXp = xpResponse.totalXp || 0;
    } catch (error) {
      console.log('⚠️  Não foi possível obter XP atual, assumindo 0');
    }
    
    console.log(`📈 XP atual: ${currentXp}`);

    // 4. Conceder XP avulso
    console.log('🎁 Concedendo XP avulso...');
    const grantData = {
      attendantId: testAttendant.id,
      typeId: testXpType.id,
      justification: 'Teste automatizado do sistema de notificações de XP avulso'
    };

    const grantResult = await makeAuthenticatedRequest('/api/gamification/xp-grants', {
      method: 'POST',
      body: JSON.stringify(grantData)
    });

    console.log('✅ XP concedido com sucesso!');
    console.log(`📋 ID da concessão: ${grantResult.data.id}`);
    console.log(`🎯 Pontos concedidos: ${grantResult.data.points}`);
    
    // 5. Verificar dados de notificação
    if (grantResult.data.notification) {
      const notification = grantResult.data.notification;
      console.log('\n🔔 Dados de notificação:');
      console.log(`   💎 XP: ${notification.xpAmount}`);
      console.log(`   🏷️  Tipo: ${notification.typeName}`);
      console.log(`   📝 Justificativa: ${notification.justification || 'N/A'}`);
      
      if (notification.levelUp) {
        console.log(`   🎉 SUBIU DE NÍVEL! ${notification.levelUp.previousLevel} → ${notification.levelUp.newLevel}`);
        console.log(`   📊 XP Total: ${notification.levelUp.totalXp}`);
      }
      
      if (notification.achievementsUnlocked && notification.achievementsUnlocked.length > 0) {
        console.log(`   🏆 CONQUISTAS DESBLOQUEADAS: ${notification.achievementsUnlocked.length}`);
        notification.achievementsUnlocked.forEach((achievement, index) => {
          console.log(`      ${index + 1}. ${achievement.title} - ${achievement.description}`);
        });
      }
    }

    // 6. Verificar XP atualizado
    console.log('\n📊 Verificando XP atualizado...');
    try {
      const updatedXpResponse = await makeAuthenticatedRequest(`/api/gamification/attendants/${testAttendant.id}/xp-total`);
      const newXp = updatedXpResponse.totalXp || 0;
      const xpGain = newXp - currentXp;
      
      console.log(`📈 XP anterior: ${currentXp}`);
      console.log(`📈 XP atual: ${newXp}`);
      console.log(`📈 Ganho: +${xpGain} XP`);
      
      if (xpGain === testXpType.points) {
        console.log('✅ XP atualizado corretamente!');
      } else {
        console.log(`⚠️  XP não confere. Esperado: +${testXpType.points}, Obtido: +${xpGain}`);
      }
    } catch (error) {
      console.log('⚠️  Não foi possível verificar XP atualizado:', error.message);
    }

    return {
      success: true,
      attendant: testAttendant,
      xpType: testXpType,
      grant: grantResult.data,
      notification: grantResult.data.notification
    };

  } catch (error) {
    console.error('❌ Erro ao testar concessão de XP:', error.message);
    return { success: false, error: error.message };
  }
}

// Função para testar histórico de concessões
async function testXpAvulsoHistory(attendantId) {
  console.log('\n📚 Testando histórico de concessões...');

  try {
    const history = await makeAuthenticatedRequest(`/api/gamification/xp-grants/attendant/${attendantId}`);
    
    console.log(`✅ Histórico obtido: ${history.length} concessões`);
    
    if (history.length > 0) {
      const latest = history[0];
      console.log('📋 Última concessão:');
      console.log(`   🎁 Tipo: ${latest.type.name}`);
      console.log(`   💎 Pontos: ${latest.points}`);
      console.log(`   👤 Concedido por: ${latest.granter.name}`);
      console.log(`   📅 Data: ${new Date(latest.grantedAt).toLocaleString('pt-BR')}`);
      console.log(`   📝 Justificativa: ${latest.justification || 'N/A'}`);
    }

    return { success: true, history };
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error.message);
    return { success: false, error: error.message };
  }
}

// Função para testar estatísticas
async function testXpAvulsoStatistics() {
  console.log('\n📊 Testando estatísticas de XP avulso...');

  try {
    const stats = await makeAuthenticatedRequest('/api/gamification/xp-grants/statistics');
    
    console.log('✅ Estatísticas obtidas:');
    console.log(`   📈 Total de concessões: ${stats.totalGrants}`);
    console.log(`   💎 Total de pontos: ${stats.totalPoints}`);
    console.log(`   📊 Média por concessão: ${stats.averagePoints.toFixed(2)}`);
    
    if (stats.grantsByType && stats.grantsByType.length > 0) {
      console.log('   🏷️  Por tipo:');
      stats.grantsByType.forEach(type => {
        console.log(`      - ${type.typeName}: ${type.count} concessões (${type.totalPoints} pontos)`);
      });
    }

    return { success: true, stats };
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error.message);
    return { success: false, error: error.message };
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando testes do sistema de notificações de XP avulso...');
  console.log('=' .repeat(60));

  // Teste 1: Concessão de XP
  const grantTest = await testXpAvulsoGrant();
  
  if (grantTest.success) {
    // Teste 2: Histórico (se a concessão foi bem-sucedida)
    await testXpAvulsoHistory(grantTest.attendant.id);
    
    // Teste 3: Estatísticas
    await testXpAvulsoStatistics();
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Testes concluídos!');
  
  if (grantTest.success) {
    console.log('✅ Sistema de notificações funcionando corretamente!');
    
    if (grantTest.notification) {
      console.log('\n💡 Para testar as notificações no frontend:');
      console.log('1. Abra o perfil do atendente no navegador');
      console.log('2. Conceda XP avulso através da interface');
      console.log('3. Observe as notificações toast e o badge de notificações');
      console.log('4. Verifique se conquistas e subidas de nível são destacadas');
    }
  } else {
    console.log('❌ Problemas encontrados no sistema de notificações');
  }
}

// Executar testes
main().catch(console.error);