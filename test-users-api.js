// Teste simples para verificar se a API de usuários está funcionando

async function testUsersAPI() {
  console.log('🧪 Testando API de usuários...\n');
  
  try {
    // Testar GET /api/users sem autenticação
    console.log('1️⃣ Testando GET /api/users (sem auth)');
    const response = await fetch('http://localhost:3000/api/users');
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('   ✅ API protegida corretamente (401 sem auth)');
    } else if (response.ok) {
      const users = await response.json();
      console.log(`   ✅ API funcionando - ${users.length} usuários encontrados`);
      users.forEach(user => {
        console.log(`      - ${user.name} (${user.email}) - ${user.role}`);
        console.log(`        Módulos: ${user.modules?.map(m => m.name).join(', ') || 'Nenhum'}`);
      });
    } else {
      console.log(`   ❌ Erro na API: ${response.status}`);
      const error = await response.text();
      console.log(`   Erro: ${error}`);
    }
    
    // Testar login para obter sessão
    console.log('\n2️⃣ Testando login para obter sessão');
    const loginResponse = await fetch('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'superadmin@sistema.com',
        password: 'admin123'
      })
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Login funcionando');
      console.log(`   👤 Usuário: ${loginData.user.name} (${loginData.user.role})`);
      
      // Nota: Para testar com autenticação, precisaríamos de cookies de sessão
      // que são gerenciados pelo NextAuth no navegador
      console.log('\n💡 Para testar com autenticação:');
      console.log('   1. Acesse http://localhost:3000/login no navegador');
      console.log('   2. Faça login com superadmin@sistema.com');
      console.log('   3. Acesse http://localhost:3000/dashboard/usuarios');
      console.log('   4. Abra o console do navegador para ver os logs de debug');
    } else {
      const loginError = await loginResponse.json();
      console.log(`   ❌ Erro no login: ${loginError.error}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 O servidor não está rodando!');
      console.log('   Execute: npm run dev');
    }
  }
}

testUsersAPI();