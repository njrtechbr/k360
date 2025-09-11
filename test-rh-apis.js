/**
 * Script de teste para verificar as APIs de RH (funcoes e setores)
 * Testa operações CRUD completas e operações em lote
 */

const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`\n${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Erro ao testar ${method} ${endpoint}:`, error.message);
    return { error: error.message };
  }
}

async function testRHAPIs() {
  console.log('=== Testando APIs de RH - Operações CRUD Completas ===');
  
  // ========== TESTES DE LEITURA ==========
  console.log('\n--- Testes de Leitura ---');
  
  // Teste 1: Listar funções (sem detalhes)
  await testAPI('/api/funcoes');
  
  // Teste 2: Listar funções (com detalhes)
  await testAPI('/api/funcoes?includeDetails=true');
  
  // Teste 3: Listar setores (sem detalhes)
  await testAPI('/api/setores');
  
  // Teste 4: Listar setores (com detalhes)
  await testAPI('/api/setores?includeDetails=true');
  
  // Teste 5: Buscar funções com filtro
  await testAPI('/api/funcoes?search=admin');
  
  // Teste 6: Buscar setores com filtro
  await testAPI('/api/setores?search=vendas');
  
  // ========== TESTES DE CRIAÇÃO ==========
  console.log('\n--- Testes de Criação (sem autenticação - devem falhar) ---');
  
  // Teste 7: Criar função individual (sem auth - deve falhar)
  await testAPI('/api/funcoes', 'POST', { name: 'Teste Função' });
  
  // Teste 8: Criar setor individual (sem auth - deve falhar)
  await testAPI('/api/setores', 'POST', { name: 'Teste Setor' });
  
  // Teste 9: Criar funções em lote (sem auth - deve falhar)
  await testAPI('/api/funcoes', 'POST', { 
    names: ['Função Lote 1', 'Função Lote 2'] 
  });
  
  // Teste 10: Criar setores em lote (sem auth - deve falhar)
  await testAPI('/api/setores', 'POST', { 
    names: ['Setor Lote 1', 'Setor Lote 2'] 
  });
  
  // ========== TESTES DE ATUALIZAÇÃO ==========
  console.log('\n--- Testes de Atualização (sem autenticação - devem falhar) ---');
  
  // Teste 11: Atualizar função (sem auth - deve falhar)
  await testAPI('/api/funcoes', 'PUT', { 
    oldName: 'Função Existente', 
    newName: 'Função Atualizada' 
  });
  
  // Teste 12: Atualizar setor (sem auth - deve falhar)
  await testAPI('/api/setores', 'PUT', { 
    oldName: 'Setor Existente', 
    newName: 'Setor Atualizado' 
  });
  
  // ========== TESTES DE DELEÇÃO ==========
  console.log('\n--- Testes de Deleção (sem autenticação - devem falhar) ---');
  
  // Teste 13: Deletar função individual (sem auth - deve falhar)
  await testAPI('/api/funcoes', 'DELETE', { name: 'Função Teste' });
  
  // Teste 14: Deletar setor individual (sem auth - deve falhar)
  await testAPI('/api/setores', 'DELETE', { name: 'Setor Teste' });
  
  // Teste 15: Deletar funções em lote (sem auth - deve falhar)
  await testAPI('/api/funcoes', 'DELETE', { 
    names: ['Função 1', 'Função 2'] 
  });
  
  // Teste 16: Deletar setores em lote (sem auth - deve falhar)
  await testAPI('/api/setores', 'DELETE', { 
    names: ['Setor 1', 'Setor 2'] 
  });
  
  // ========== TESTES DE ROTAS INDIVIDUAIS ==========
  console.log('\n--- Testes de Rotas Individuais (sem autenticação - devem falhar) ---');
  
  // Teste 17: Buscar função específica (sem auth - deve falhar)
  await testAPI('/api/funcoes/Administrador');
  
  // Teste 18: Buscar setor específico (sem auth - deve falhar)
  await testAPI('/api/setores/Vendas');
  
  // Teste 19: Atualizar função via rota individual (sem auth - deve falhar)
  await testAPI('/api/funcoes/TesteFunc', 'PUT', { newName: 'Nova Função' });
  
  // Teste 20: Deletar função via rota individual (sem auth - deve falhar)
  await testAPI('/api/funcoes/TesteFunc', 'DELETE');
  
  // ========== TESTES DE VALIDAÇÃO ==========
  console.log('\n--- Testes de Validação ---');
  
  // Teste 21: Criar função com dados inválidos
  await testAPI('/api/funcoes', 'POST', { name: '' });
  
  // Teste 22: Criar setor com dados inválidos
  await testAPI('/api/setores', 'POST', { name: '' });
  
  // Teste 23: Atualizar função com dados inválidos
  await testAPI('/api/funcoes', 'PUT', { oldName: '', newName: '' });
  
  // Teste 24: Operação em lote com array vazio
  await testAPI('/api/funcoes', 'POST', { names: [] });
  
  // ========== TESTES DE REDIRECIONAMENTO ==========
  console.log('\n--- Testes de APIs Depreciadas (redirecionamento) ---');
  
  // Teste 25: API depreciada de funções
  await testAPI('/api/rh/funcoes');
  
  // Teste 26: API depreciada de setores
  await testAPI('/api/rh/setores');
  
  console.log('\n=== Resumo dos Testes ===');
  console.log('✅ APIs de leitura devem funcionar sem autenticação');
  console.log('❌ APIs de criação/atualização/deleção devem falhar sem autenticação (401/403)');
  console.log('❌ Dados inválidos devem retornar erro de validação (400)');
  console.log('↩️  APIs depreciadas devem redirecionar (301)');
  console.log('\n=== Testes concluídos ===');
}

// Executar testes se o servidor estiver rodando
testRHAPIs().catch(console.error);