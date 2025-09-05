// Teste manual dos endpoints de XP avulso com ordenação
const baseUrl = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testando endpoints de XP avulso com ordenação...\n');

  // Teste 1: GET /api/gamification/xp-grants (histórico geral)
  console.log('1. Testando GET /api/gamification/xp-grants');
  try {
    const response = await fetch(`${baseUrl}/api/gamification/xp-grants?page=1&limit=5&sortBy=points&sortOrder=desc`);
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Sucesso - ${data.data?.grants?.length || 0} concessões encontradas`);
      console.log(`   📊 Paginação: página ${data.data?.pagination?.page}, total ${data.data?.pagination?.total}`);
      
      if (data.data?.grants?.length > 0) {
        console.log(`   🔄 Primeira concessão: ${data.data.grants[0].points} pontos`);
      }
    } else {
      const error = await response.json();
      console.log(`   ❌ Erro: ${error.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }

  console.log('');

  // Teste 2: GET /api/gamification/xp-grants com filtros
  console.log('2. Testando GET /api/gamification/xp-grants com filtros');
  try {
    const response = await fetch(`${baseUrl}/api/gamification/xp-grants?sortBy=grantedAt&sortOrder=asc&minPoints=50`);
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Sucesso - ${data.data?.grants?.length || 0} concessões filtradas`);
    } else {
      const error = await response.json();
      console.log(`   ❌ Erro: ${error.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }

  console.log('');

  // Teste 3: GET /api/gamification/xp-grants/attendant/[id]
  console.log('3. Testando GET /api/gamification/xp-grants/attendant/[id]');
  try {
    // Usar um ID de exemplo - em produção seria um ID real
    const attendantId = 'test-attendant-id';
    const response = await fetch(`${baseUrl}/api/gamification/xp-grants/attendant/${attendantId}?sortBy=points&sortOrder=desc`);
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Sucesso - ${data.data?.summary?.totalGrants || 0} concessões do atendente`);
      console.log(`   📈 Total de pontos: ${data.data?.summary?.totalPoints || 0}`);
    } else {
      const error = await response.json();
      console.log(`   ❌ Erro: ${error.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }

  console.log('');

  // Teste 4: Verificar parâmetros de ordenação inválidos
  console.log('4. Testando parâmetros de ordenação inválidos');
  try {
    const response = await fetch(`${baseUrl}/api/gamification/xp-grants?sortBy=invalid&sortOrder=wrong`);
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 400) {
      const error = await response.json();
      console.log(`   ✅ Validação funcionando - ${error.error}`);
    } else {
      console.log(`   ❌ Deveria retornar erro 400`);
    }
  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
  }

  console.log('\n🏁 Testes concluídos!');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testEndpoints().catch(console.error);
}

module.exports = { testEndpoints };