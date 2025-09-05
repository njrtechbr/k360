// Teste do endpoint de configuração
const fetch = require('node-fetch');

async function testEndpoint() {
  try {
    console.log('Testando endpoint...');
    
    const response = await fetch('http://localhost:3000/api/gamification/xp-avulso-config');
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

testEndpoint();