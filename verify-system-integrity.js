const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySystemIntegrity() {
  console.log('🔍 Verificando integridade completa do sistema...\n');
  
  try {
    // 1. Verificar usuários
    console.log('👥 VERIFICAÇÃO DE USUÁRIOS');
    console.log('=' .repeat(50));
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        modules: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        _count: {
          select: {
            attendantImports: true,
            evaluationImports: true
          }
        }
      }
    });

    console.log(`📊 Total de usuários: ${users.length}`);
    
    if (users.length === 0) {
      console.log('⚠️  PROBLEMA: Nenhum usuário encontrado!');
      console.log('💡 Execute: node verify-user-integrity.js --create-test-user\n');
      return;
    }

    // Verificar SUPERADMIN
    const superAdmins = users.filter(u => u.role === 'SUPERADMIN');
    console.log(`🔑 SUPERADMIN: ${superAdmins.length} encontrado(s)`);
    
    if (superAdmins.length === 0) {
      console.log('❌ PROBLEMA CRÍTICO: Nenhum SUPERADMIN encontrado!');
      console.log('💡 O sistema precisa de pelo menos um SUPERADMIN\n');
    } else {
      superAdmins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
    }

    // Verificar outros roles
    const admins = users.filter(u => u.role === 'ADMIN');
    const supervisors = users.filter(u => u.role === 'SUPERVISOR');
    const regularUsers = users.filter(u => u.role === 'USUARIO');
    
    console.log(`👨‍💼 ADMIN: ${admins.length}`);
    console.log(`👀 SUPERVISOR: ${supervisors.length}`);
    console.log(`👤 USUARIO: ${regularUsers.length}\n`);

    // 2. Verificar módulos
    console.log('🧩 VERIFICAÇÃO DE MÓDULOS');
    console.log('=' .repeat(50));
    
    const modules = await prisma.module.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    console.log(`📊 Total de módulos: ${modules.length}`);
    const activeModules = modules.filter(m => m.active);
    console.log(`✅ Módulos ativos: ${activeModules.length}`);
    
    if (modules.length === 0) {
      console.log('⚠️  AVISO: Nenhum módulo encontrado');
      console.log('💡 Usuários podem não ter acesso a funcionalidades\n');
    } else {
      modules.forEach(module => {
        const status = module.active ? '✅' : '❌';
        console.log(`   ${status} ${module.name} (${module._count.users} usuários)`);
      });
    }

    // 3. Verificar integridade de dados
    console.log('\n🔗 VERIFICAÇÃO DE INTEGRIDADE');
    console.log('=' .repeat(50));
    
    // Verificar usuários com módulos inválidos
    const allModuleIds = modules.map(m => m.id);
    const usersWithInvalidModules = users.filter(user => {
      if (!user.modules || user.modules.length === 0) return false;
      // user.modules agora é um array de objetos com id e name
      return user.modules.some(module => !allModuleIds.includes(module.id));
    });

    if (usersWithInvalidModules.length > 0) {
      console.log(`⚠️  ${usersWithInvalidModules.length} usuário(s) com módulos inválidos:`);
      usersWithInvalidModules.forEach(user => {
        const invalidModules = user.modules.filter(module => !allModuleIds.includes(module.id));
        console.log(`   - ${user.name}: ${invalidModules.map(m => m.name).join(', ')}`);
      });
    } else {
      console.log('✅ Todos os usuários têm módulos válidos');
    }

    // Verificar usuários sem módulos
    const usersWithoutModules = users.filter(user => !user.modules || user.modules.length === 0);
    if (usersWithoutModules.length > 0) {
      console.log(`⚠️  ${usersWithoutModules.length} usuário(s) sem módulos atribuídos:`);
      usersWithoutModules.forEach(user => {
        console.log(`   - ${user.name} (${user.role})`);
      });
    } else {
      console.log('✅ Todos os usuários têm módulos atribuídos');
    }

    // 4. Verificar importações órfãs
    console.log('\n📥 VERIFICAÇÃO DE IMPORTAÇÕES');
    console.log('=' .repeat(50));
    
    const attendantImports = await prisma.attendantImport.findMany({
      select: {
        id: true,
        fileName: true,
        importedById: true,
        importedAt: true,
        importedBy: {
          select: {
            name: true
          }
        }
      }
    });

    const evaluationImports = await prisma.evaluationImport.findMany({
      select: {
        id: true,
        fileName: true,
        importedById: true,
        importedAt: true,
        importedBy: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📊 Importações de atendentes: ${attendantImports.length}`);
    console.log(`📊 Importações de avaliações: ${evaluationImports.length}`);

    const orphanedAttendantImports = attendantImports.filter(imp => !imp.importedBy);
    const orphanedEvaluationImports = evaluationImports.filter(imp => !imp.importedBy);

    if (orphanedAttendantImports.length > 0) {
      console.log(`⚠️  ${orphanedAttendantImports.length} importação(ões) de atendentes órfãs`);
    }

    if (orphanedEvaluationImports.length > 0) {
      console.log(`⚠️  ${orphanedEvaluationImports.length} importação(ões) de avaliações órfãs`);
    }

    if (orphanedAttendantImports.length === 0 && orphanedEvaluationImports.length === 0) {
      console.log('✅ Todas as importações têm usuários válidos');
    }

    // 5. Resumo final
    console.log('\n📋 RESUMO DA VERIFICAÇÃO');
    console.log('=' .repeat(50));
    
    const issues = [];
    
    if (users.length === 0) issues.push('Nenhum usuário no sistema');
    if (superAdmins.length === 0) issues.push('Nenhum SUPERADMIN');
    if (modules.length === 0) issues.push('Nenhum módulo configurado');
    if (usersWithInvalidModules.length > 0) issues.push(`${usersWithInvalidModules.length} usuário(s) com módulos inválidos`);
    if (usersWithoutModules.length > 0) issues.push(`${usersWithoutModules.length} usuário(s) sem módulos`);
    if (orphanedAttendantImports.length > 0) issues.push(`${orphanedAttendantImports.length} importação(ões) órfãs`);

    if (issues.length === 0) {
      console.log('🎉 SISTEMA ÍNTEGRO!');
      console.log('✅ Todos os componentes estão funcionando corretamente');
    } else {
      console.log(`⚠️  ${issues.length} PROBLEMA(S) ENCONTRADO(S):`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n🔧 AÇÕES RECOMENDADAS:');
      if (users.length === 0 || superAdmins.length === 0) {
        console.log('   - Execute: node verify-user-integrity.js --create-test-user');
      }
      if (modules.length === 0) {
        console.log('   - Configure módulos através do painel administrativo');
      }
      if (usersWithInvalidModules.length > 0) {
        console.log('   - Atualize os módulos dos usuários afetados');
      }
    }

    console.log('\n💡 Para resolver problemas de sessão:');
    console.log('   1. Faça logout e login novamente');
    console.log('   2. Limpe cookies do navegador');
    console.log('   3. Reinicie o servidor de desenvolvimento');
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para corrigir problemas automaticamente
async function fixCommonIssues() {
  console.log('🔧 Corrigindo problemas comuns...\n');
  
  try {
    // Remover módulos inválidos dos usuários
    const modules = await prisma.module.findMany({ select: { id: true } });
    const validModuleIds = modules.map(m => m.id);
    
    const users = await prisma.user.findMany({
      select: { id: true, modules: true, name: true }
    });

    let fixedUsers = 0;
    
    for (const user of users) {
      if (user.modules && user.modules.length > 0) {
        const validModules = user.modules.filter(moduleId => validModuleIds.includes(moduleId));
        
        if (validModules.length !== user.modules.length) {
          await prisma.user.update({
            where: { id: user.id },
            data: { modules: validModules }
          });
          
          console.log(`✅ Corrigidos módulos do usuário: ${user.name}`);
          fixedUsers++;
        }
      }
    }
    
    if (fixedUsers > 0) {
      console.log(`\n🎉 ${fixedUsers} usuário(s) corrigido(s)!`);
    } else {
      console.log('✅ Nenhuma correção necessária');
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir problemas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar verificação
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--fix')) {
    await fixCommonIssues();
  } else {
    await verifySystemIntegrity();
  }
}

main().catch(console.error);