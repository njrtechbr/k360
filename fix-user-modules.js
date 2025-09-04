const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserModules() {
  console.log('🔧 Corrigindo módulos dos usuários...\n');
  
  try {
    // 1. Buscar todos os módulos disponíveis
    const modules = await prisma.module.findMany({
      select: { id: true, name: true, active: true }
    });
    
    console.log(`📊 Módulos disponíveis: ${modules.length}`);
    modules.forEach(module => {
      const status = module.active ? '✅' : '❌';
      console.log(`   ${status} ${module.name} (${module.id})`);
    });
    
    // 2. Buscar usuários que precisam de correção
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        modules: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    console.log(`\n👥 Usuários encontrados: ${users.length}`);
    
    // 3. Corrigir módulos para cada usuário
    for (const user of users) {
      console.log(`\n🔄 Processando: ${user.name} (${user.role})`);
      
      // Para SUPERADMIN, dar acesso a todos os módulos ativos
      if (user.role === 'SUPERADMIN') {
        const activeModules = modules.filter(m => m.active);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            modules: {
              set: activeModules.map(m => ({ id: m.id }))
            }
          }
        });
        
        console.log(`   ✅ SUPERADMIN: ${activeModules.length} módulos atribuídos`);
        activeModules.forEach(m => console.log(`      - ${m.name}`));
      }
      // Para outros roles, dar acesso a todos os módulos ativos também (pode ser customizado)
      else {
        const activeModules = modules.filter(m => m.active);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            modules: {
              set: activeModules.map(m => ({ id: m.id }))
            }
          }
        });
        
        console.log(`   ✅ ${user.role}: ${activeModules.length} módulos atribuídos`);
        activeModules.forEach(m => console.log(`      - ${m.name}`));
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    console.log('\n📋 Verificando resultado...');
    
    // 4. Verificar resultado
    const updatedUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        modules: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    updatedUsers.forEach(user => {
      console.log(`\n👤 ${user.name} (${user.role}):`);
      user.modules.forEach(module => {
        console.log(`   ✅ ${module.name}`);
      });
    });
    
    console.log('\n✅ Todos os usuários agora têm módulos válidos!');
    console.log('💡 Faça logout e login novamente para aplicar as mudanças.');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir módulos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserModules();