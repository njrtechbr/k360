// Script para testar a API de XP events
async function testXpEventsAPI() {
  try {
    console.log('🔍 Testando API de XP Events...\n');
    
    const response = await fetch('http://localhost:3000/api/gamification/xp-events');
    
    if (!response.ok) {
      console.error(`❌ Erro na API: ${response.status} - ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('📊 Resposta da API:');
    console.log('- Estrutura:', Object.keys(data));
    console.log('- Total de eventos:', data.events?.length || 0);
    console.log('- Paginação:', data.pagination);
    
    if (data.events && data.events.length > 0) {
      console.log('\n📋 Primeiros 3 eventos:');
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`${index + 1}. ID: ${event.id}`);
        console.log(`   Atendente: ${event.attendantId}`);
        console.log(`   Pontos: ${event.points}`);
        console.log(`   Tipo: ${event.type}`);
        console.log(`   Data: ${event.date}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhum evento encontrado na resposta da API');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

// Executar apenas se o servidor estiver rodando
if (typeof fetch !== 'undefined') {
  testXpEventsAPI();
} else {
  console.log('⚠️ Este script deve ser executado em um ambiente com fetch disponível');
  console.log('Execute: npm run dev e depois teste a URL http://localhost:3000/api/gamification/xp-events');
}