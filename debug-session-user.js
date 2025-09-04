const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSessionUser() {
  console.log('🔍 Debugando problema de sessão de usuário...\n');
  
  try {
    // Simular uma chamada à API para ver o que acontece
    const response = await fetch('http://localhost:3000/api/attendants/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attendants: [],
        fileName: 'test.csv'
      })
    });

    const result = await response.json();
    
    console.log('📡 Resposta da API:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Dados:`, result);
    
    if (response.status === 401) {
      console.log('\n❌ Erro de autorização detectado!');
      console.log('💡 Possíveis causas:');
      console.log('   1. Usuário não está logado');
      console.log('   2. Sessão expirou');
      console.log('   3. ID do usuário na sessão não existe no banco');
      console.log('\n🔧 Soluções:');
      console.log('   1. Faça logout e login novamente');
      console.log('   2. Verifique se o servidor está rodando');
      console.log('   3. Limpe os cookies do navegador');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor não está rodando!');
      console.log('💡 Execute: npm run dev');
    } else {
      console.error('❌ Erro ao testar API:', error.message);
    }
  }
  
  // Listar todos os usuários disponíveis
  console.log('\n👥 Usuários disponíveis no sistema:');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  
  users.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    console.log(`      ID: ${user.id}`);
  });
  
  console.log('\n💡 Para resolver o problema:');
  console.log('   1. Certifique-se de estar logado com um dos usuários acima');
  console.log('   2. Se o problema persistir, faça logout e login novamente');
  console.log('   3. Verifique se o NextAuth está configurado corretamente');
  
} catch (error) {
  console.error('❌ Erro:', error);
} finally {
  await prisma.$disconnect();
}

debugSessionUser();