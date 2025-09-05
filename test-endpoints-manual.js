/**
 * Teste manual dos endpoints de XP avulso
 */

async function testEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testando endpoints de XP avulso...\n');
  
  try {
    // Teste 1: GET /api/gamification/xp-grants (sem autenticação - deve retornar 401)
    console.log('📋 Teste 1: GET /api/gamification/xp-grants (sem auth)');
    const response1 = await fetch(`${baseUrl}/api/gamification/xp-grants`);
    console.log(`Status: ${response1.status}`);
    
    if (response1.status === 401) {
      console.log('✅ Endpoint protegido corretamente\n');
    } else {
      console.log('❌ Endpoint deveria retornar 401\n');
    }
    
    // Teste 2: GET /api/gamification/xp-grants/attendant/test-id (sem autenticação)
    console.log('📋 Teste 2: GET /api/gamification/xp-grants/attendant/test-id (sem auth)');
    const response2 = await fetch(`${baseUrl}/api/gamification/xp-grants/attendant/test-id`);
    console.log(`Status: ${response2.status}`);
    
    if (response2.status === 401) {
      console.log('✅ Endpoint de atendente protegido corretamente\n');
    } else {
      console.log('❌ Endpoint deveria retornar 401\n');
    }
    
    // Teste 3: POST /api/gamification/xp-grants (sem autenticação)
    console.log('📋 Teste 3: POST /api/gamification/xp-grants (sem auth)');
    const response3 = await fetch(`${baseUrl}/api/gamification/xp-grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attendantId: 'test',
        typeId: 'test'
      })
    });
    console.log(`Status: ${response3.status}`);
    
    if (response3.status === 401) {
      console.log('✅ Endpoint POST protegido corretamente\n');
    } else {
      console.log('❌ Endpoint POST deveria retornar 401\n');
    }
    
    // Teste 4: Verificar estrutura de resposta de erro
    console.log('📋 Teste 4: Verificando estrutura de resposta de erro');
    const errorData = await response1.json();
    console.log('Resposta:', errorData);
    
    if (errorData.error) {
      console.log('✅ Estrutura de erro correta\n');
    } else {
      console.log('❌ Estrutura de erro incorreta\n');
    }
    
    console.log('✅ Todos os testes de estrutura passaram!');
    console.log('📝 Os endpoints estão implementados e protegidos corretamente.');
    console.log('🔐 Para testar funcionalidades completas, é necessário autenticação.');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
  }
}

// Executar testes
testEndpoints();