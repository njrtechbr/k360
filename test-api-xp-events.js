const fetch = require('node-fetch');

async function testXpEventsAPI() {
  console.log('🧪 Testando API de XP Events...\n');
  
  try {
    // Testar com limite padrão (50)
    console.log('📊 Testando com limite padrão...');
    const defaultResponse = await fetch('http://localhost:3000/api/gamification/xp-events');
    const defaultData = await defaultResponse.json();
    console.log(`   Eventos retornados: ${defaultData.events?.length || 0}`);
    console.log(`   Total no banco: ${defaultData.totalCount || 0}`);
    
    // Testar com limite alto
    console.log('\n📊 Testando com limite alto...');
    const highLimitResponse = await fetch('http://localhost:3000/api/gamification/xp-events?limit=10000');
    const highLimitData = await highLimitResponse.json();
    console.log(`   Eventos retornados: ${highLimitData.events?.length || 0}`);
    console.log(`   Total no banco: ${highLimitData.totalCount || 0}`);
    
    // Verificar eventos por temporada
    if (highLimitData.events) {
      console.log('\n🗓️ Eventos por temporada:');
      const eventsBySeason = {};
      
      highLimitData.events.forEach(event => {
        const seasonId = event.seasonId || 'sem-temporada';
        eventsBySeason[seasonId] = (eventsBySeason[seasonId] || 0) + 1;
      });
      
      Object.entries(eventsBySeason).forEach(([seasonId, count]) => {
        console.log(`   ${seasonId}: ${count} eventos`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
    console.log('\n💡 Certifique-se de que o servidor está rodando em localhost:3000');
  }
}

testXpEventsAPI();