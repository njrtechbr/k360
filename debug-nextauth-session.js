// Script para debugar problemas de sessão do NextAuth

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugNextAuthSession() {
  console.log('🔍 Debugando sessão NextAuth...\n');
  
  try {
    // 1. Verificar usuários no banco
    console.log('1️⃣ Verificando usuários no banco de dados:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true // Para verificar se tem senha
      }
    });
    
    console.log(`   📊 Total de usuários: ${users.length}`);
    users.forEach(user => {
      console.log(`   👤 ${user.name} (${user.email})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Tem senha: ${user.password ? 'Sim' : 'Não'}`);
    });
    
    // 2. Verificar se há sessões ativas
    console.log('\n2️⃣ Verificando sessões ativas:');
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        userId: true,
        expires: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`   📊 Total de sessões: ${sessions.length}`);
    if (sessions.length > 0) {
      sessions.forEach(session => {
        const isExpired = new Date(session.expires) < new Date();
        console.log(`   🔑 Sessão: ${session.id}`);
        console.log(`      Usuário: ${session.user.name} (${session.user.email})`);
        console.log(`      Expira: ${session.expires}`);
        console.log(`      Status: ${isExpired ? '❌ Expirada' : '✅ Ativa'}`);
      });
    } else {
      console.log('   ⚠️  Nenhuma sessão ativa encontrada');
      console.log('   💡 Isso pode explicar por que a API retorna 401');
    }
    
    // 3. Verificar accounts (para OAuth)
    console.log('\n3️⃣ Verificando contas OAuth:');
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`   📊 Total de contas OAuth: ${accounts.length}`);
    if (accounts.length > 0) {
      accounts.forEach(account => {
        console.log(`   🔗 Conta: ${account.provider}`);
        console.log(`      Usuário: ${account.user.name} (${account.user.email})`);
      });
    } else {
      console.log('   ℹ️  Nenhuma conta OAuth (normal para credentials provider)');
    }
    
    console.log('\n📋 DIAGNÓSTICO:');
    
    if (users.length === 0) {
      console.log('❌ PROBLEMA: Nenhum usuário no banco de dados');
      console.log('💡 Execute: node fix-user-modules.js');
    } else {
      console.log('✅ Usuários existem no banco de dados');
    }
    
    if (sessions.length === 0) {
      console.log('⚠️  POSSÍVEL PROBLEMA: Nenhuma sessão ativa');
      console.log('💡 Isso pode ser normal se ninguém estiver logado');
      console.log('💡 Para testar:');
      console.log('   1. Acesse http://localhost:3000/login');
      console.log('   2. Faça login com superadmin@sistema.com');
      console.log('   3. Execute este script novamente');
    } else {
      const activeSessions = sessions.filter(s => new Date(s.expires) >= new Date());
      if (activeSessions.length > 0) {
        console.log('✅ Sessões ativas encontradas');
      } else {
        console.log('⚠️  Todas as sessões estão expiradas');
        console.log('💡 Faça login novamente');
      }
    }
    
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('1. Faça login no navegador: http://localhost:3000/login');
    console.log('2. Acesse a página de usuários: http://localhost:3000/dashboard/usuarios');
    console.log('3. Abra o console do navegador (F12) para ver os logs de debug');
    console.log('4. Verifique os logs do servidor no terminal onde está rodando npm run dev');
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNextAuthSession();