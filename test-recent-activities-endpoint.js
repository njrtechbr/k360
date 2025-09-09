const fetch = require('node-fetch');

async function testRecentActivitiesEndpoint() {
  try {
    console.log('🔍 Testando endpoint /api/dashboard/recent-activities...');
    
    const response = await fetch('http://localhost:3000/api/dashboard/recent-activities?limit=20');
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta recebida com sucesso:');
      console.log(`Total de atividades: ${data.length}`);
      
      if (data.length > 0) {
        console.log('\nPrimeiras atividades:');
        data.slice(0, 3).forEach((activity, index) => {
          console.log(`${index + 1}. ${activity.type}: ${activity.title}`);
          console.log(`   ${activity.description}`);
          console.log(`   Timestamp: ${activity.timestamp}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:');
      console.error(errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar endpoint:', error.message);
  }
}

testRecentActivitiesEndpoint();