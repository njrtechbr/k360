// Script para forçar refresh dos dados no frontend
// Adicione este código temporariamente ao PrismaProvider para debug

console.log('🔄 Forçando refresh dos dados...');

// Adicionar timestamp para evitar cache
const timestamp = Date.now();
const xpEventsUrl = `/api/gamification/xp-events?limit=10000&t=${timestamp}`;

console.log('📡 URL da API:', xpEventsUrl);

// Fazer a chamada e logar os resultados
fetch(xpEventsUrl)
  .then(response => response.json())
  .then(data => {
    console.log('📊 Dados recebidos da API:');
    console.log('   Total de eventos:', data.events?.length || 0);
    console.log('   Total no banco:', data.totalCount || 0);
    
    if (data.events) {
      // Agrupar por temporada
      const eventsBySeason = {};
      data.events.forEach(event => {
        const seasonId = event.seasonId || 'sem-temporada';
        eventsBySeason[seasonId] = (eventsBySeason[seasonId] || 0) + 1;
      });
      
      console.log('🗓️ Eventos por temporada:');
      Object.entries(eventsBySeason).forEach(([seasonId, count]) => {
        console.log(`   ${seasonId}: ${count} eventos`);
      });
    }
  })
  .catch(error => {
    console.error('❌ Erro ao buscar dados:', error);
  });

console.log('\n💡 Instruções:');
console.log('1. Copie este código');
console.log('2. Cole no console do navegador na página de histórico');
console.log('3. Execute para verificar se os dados estão chegando');
console.log('4. Se os dados estiverem corretos, o problema pode ser no cache do React');