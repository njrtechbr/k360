const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDataIntegrity() {
  console.log('🔍 Iniciando verificação de integridade dos dados...\n');
  
  let issues = [];
  let warnings = [];
  
  try {
    // 1. Verificar usuários
    console.log('👤 Verificando usuários...');
    const users = await prisma.user.findMany();
    console.log(`   ✅ ${users.length} usuários encontrados`);
    
    const adminUsers = users.filter(u => u.role === 'SUPERADMIN' || u.role === 'ADMIN');
    if (adminUsers.length === 0) {
      issues.push('❌ Nenhum usuário administrador encontrado');
    } else {
      console.log(`   ✅ ${adminUsers.length} administradores encontrados`);
    }

    // 2. Verificar módulos
    console.log('\n📦 Verificando módulos...');
    const modules = await prisma.module.findMany();
    const expectedModules = ['rh', 'pesquisa-satisfacao', 'gamificacao'];
    
    for (const expectedModule of expectedModules) {
      const module = modules.find(m => m.id === expectedModule);
      if (!module) {
        issues.push(`❌ Módulo obrigatório não encontrado: ${expectedModule}`);
      } else if (!module.active) {
        warnings.push(`⚠️ Módulo inativo: ${expectedModule}`);
      }
    }
    console.log(`   ✅ ${modules.length} módulos verificados`);

    // 3. Verificar atendentes
    console.log('\n👥 Verificando atendentes...');
    const attendants = await prisma.attendant.findMany({
      include: {
        _count: {
          select: {
            evaluations: true,
            xpEvents: true,
            achievements: true
          }
        }
      }
    });
    
    console.log(`   ✅ ${attendants.length} atendentes encontrados`);
    
    if (attendants.length === 0) {
      warnings.push('⚠️ Nenhum atendente encontrado - importe os dados de atendentes');
    } else {
      // Verificar atendentes sem função ou setor
      const attendantsWithoutRole = attendants.filter(a => !a.role);
      const attendantsWithoutSector = attendants.filter(a => !a.sector);
      
      if (attendantsWithoutRole.length > 0) {
        warnings.push(`⚠️ ${attendantsWithoutRole.length} atendentes sem função definida`);
      }
      
      if (attendantsWithoutSector.length > 0) {
        warnings.push(`⚠️ ${attendantsWithoutSector.length} atendentes sem setor definido`);
      }
      
      console.log(`   📊 Estatísticas dos atendentes:`);
      console.log(`      - Com avaliações: ${attendants.filter(a => a._count.evaluations > 0).length}`);
      console.log(`      - Com eventos XP: ${attendants.filter(a => a._count.xpEvents > 0).length}`);
      console.log(`      - Com conquistas: ${attendants.filter(a => a._count.achievements > 0).length}`);
    }

    // 4. Verificar avaliações
    console.log('\n⭐ Verificando avaliações...');
    const evaluations = await prisma.evaluation.findMany({
      include: {
        attendant: true
      }
    });
    
    console.log(`   ✅ ${evaluations.length} avaliações encontradas`);
    
    if (evaluations.length === 0) {
      warnings.push('⚠️ Nenhuma avaliação encontrada - importe os dados de avaliações');
    } else {
      // Verificar distribuição de notas
      const ratingDistribution = {};
      evaluations.forEach(e => {
        ratingDistribution[e.rating] = (ratingDistribution[e.rating] || 0) + 1;
      });
      
      console.log(`   📊 Distribuição de notas:`);
      for (let i = 1; i <= 5; i++) {
        const count = ratingDistribution[i] || 0;
        const percentage = evaluations.length > 0 ? ((count / evaluations.length) * 100).toFixed(1) : 0;
        console.log(`      ${i}★: ${count} (${percentage}%)`);
      }
      
      // Verificar avaliações órfãs (sem atendente)
      const orphanEvaluations = evaluations.filter(e => !e.attendant);
      if (orphanEvaluations.length > 0) {
        issues.push(`❌ ${orphanEvaluations.length} avaliações órfãs (sem atendente válido)`);
      }
      
      // Verificar avaliações com notas inválidas
      const invalidRatings = evaluations.filter(e => e.rating < 1 || e.rating > 5);
      if (invalidRatings.length > 0) {
        issues.push(`❌ ${invalidRatings.length} avaliações com notas inválidas`);
      }
    }

    // 5. Verificar configurações de gamificação
    console.log('\n🎮 Verificando configurações de gamificação...');
    const gamificationConfig = await prisma.gamificationConfig.findUnique({
      where: { id: 'main' }
    });
    
    if (!gamificationConfig) {
      issues.push('❌ Configuração principal de gamificação não encontrada');
    } else {
      console.log(`   ✅ Configuração principal encontrada`);
      console.log(`   📊 Pontuações: 1★(${gamificationConfig.ratingScore1}), 2★(${gamificationConfig.ratingScore2}), 3★(${gamificationConfig.ratingScore3}), 4★(${gamificationConfig.ratingScore4}), 5★(${gamificationConfig.ratingScore5})`);
      console.log(`   🔢 Multiplicador global: ${gamificationConfig.globalXpMultiplier}`);
    }

    // 6. Verificar conquistas
    console.log('\n🏆 Verificando conquistas...');
    const achievementConfigs = await prisma.achievementConfig.findMany();
    console.log(`   ✅ ${achievementConfigs.length} configurações de conquistas encontradas`);
    
    if (achievementConfigs.length === 0) {
      issues.push('❌ Nenhuma configuração de conquista encontrada');
    } else {
      const inactiveAchievements = achievementConfigs.filter(a => !a.active);
      if (inactiveAchievements.length > 0) {
        warnings.push(`⚠️ ${inactiveAchievements.length} conquistas inativas`);
      }
    }

    // 7. Verificar níveis
    console.log('\n🎯 Verificando configurações de níveis...');
    const levelConfigs = await prisma.levelTrackConfig.findMany({
      orderBy: { level: 'asc' }
    });
    console.log(`   ✅ ${levelConfigs.length} configurações de níveis encontradas`);
    
    if (levelConfigs.length === 0) {
      issues.push('❌ Nenhuma configuração de nível encontrada');
    } else {
      console.log(`   📊 Níveis: ${levelConfigs[0].level} a ${levelConfigs[levelConfigs.length - 1].level}`);
    }

    // 8. Verificar temporadas
    console.log('\n⏰ Verificando temporadas...');
    const seasons = await prisma.gamificationSeason.findMany({
      orderBy: { startDate: 'desc' }
    });
    console.log(`   ✅ ${seasons.length} temporadas encontradas`);
    
    const activeSeasons = seasons.filter(s => s.active);
    if (activeSeasons.length === 0) {
      warnings.push('⚠️ Nenhuma temporada ativa encontrada');
    } else if (activeSeasons.length > 1) {
      issues.push(`❌ Múltiplas temporadas ativas encontradas (${activeSeasons.length})`);
    } else {
      console.log(`   ✅ Temporada ativa: ${activeSeasons[0].name}`);
    }

    // 9. Verificar eventos XP
    console.log('\n⚡ Verificando eventos XP...');
    const xpEvents = await prisma.xpEvent.findMany({
      include: {
        attendant: true,
        evaluation: true
      }
    });
    console.log(`   ✅ ${xpEvents.length} eventos XP encontrados`);
    
    if (xpEvents.length > 0) {
      const totalXp = xpEvents.reduce((sum, event) => sum + event.xp, 0);
      const avgXp = (totalXp / xpEvents.length).toFixed(2);
      console.log(`   📊 XP total distribuído: ${totalXp} (média: ${avgXp} por evento)`);
      
      // Verificar eventos XP órfãos
      const orphanXpEvents = xpEvents.filter(e => !e.attendant);
      if (orphanXpEvents.length > 0) {
        issues.push(`❌ ${orphanXpEvents.length} eventos XP órfãos (sem atendente válido)`);
      }
    }

    // 10. Verificar conquistas desbloqueadas
    console.log('\n🎖️ Verificando conquistas desbloqueadas...');
    const unlockedAchievements = await prisma.attendantAchievement.findMany({
      include: {
        attendant: true,
        achievement: true
      }
    });
    console.log(`   ✅ ${unlockedAchievements.length} conquistas desbloqueadas encontradas`);

    // 11. Verificar funções e setores
    console.log('\n🏢 Verificando funções e setores...');
    const roles = await prisma.role.findMany();
    const sectors = await prisma.sector.findMany();
    console.log(`   ✅ ${roles.length} funções e ${sectors.length} setores encontrados`);

    // 12. Verificar consistência de dados
    console.log('\n🔗 Verificando consistência de dados...');
    
    // Verificar se todos os atendentes com avaliações têm eventos XP correspondentes
    if (attendants.length > 0 && evaluations.length > 0) {
      const attendantsWithEvaluations = attendants.filter(a => a._count.evaluations > 0);
      const attendantsWithXp = attendants.filter(a => a._count.xpEvents > 0);
      
      if (attendantsWithEvaluations.length > attendantsWithXp.length) {
        warnings.push(`⚠️ ${attendantsWithEvaluations.length - attendantsWithXp.length} atendentes têm avaliações mas não têm eventos XP`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMO DA VERIFICAÇÃO DE INTEGRIDADE');
    console.log('='.repeat(60));
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('🎉 SISTEMA ÍNTEGRO - Nenhum problema encontrado!');
    } else {
      if (issues.length > 0) {
        console.log('\n❌ PROBLEMAS CRÍTICOS ENCONTRADOS:');
        issues.forEach(issue => console.log(`   ${issue}`));
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️ AVISOS:');
        warnings.forEach(warning => console.log(`   ${warning}`));
      }
    }
    
    console.log('\n📊 ESTATÍSTICAS GERAIS:');
    console.log(`   👤 Usuários: ${users.length}`);
    console.log(`   👥 Atendentes: ${attendants.length}`);
    console.log(`   ⭐ Avaliações: ${evaluations.length}`);
    console.log(`   ⚡ Eventos XP: ${xpEvents.length}`);
    console.log(`   🎖️ Conquistas desbloqueadas: ${unlockedAchievements.length}`);
    console.log(`   🏆 Configurações de conquistas: ${achievementConfigs.length}`);
    console.log(`   🎯 Configurações de níveis: ${levelConfigs.length}`);
    console.log(`   ⏰ Temporadas: ${seasons.length} (${activeSeasons.length} ativa)`);
    
    return {
      success: issues.length === 0,
      issues,
      warnings,
      stats: {
        users: users.length,
        attendants: attendants.length,
        evaluations: evaluations.length,
        xpEvents: xpEvents.length,
        achievements: unlockedAchievements.length,
        achievementConfigs: achievementConfigs.length,
        levelConfigs: levelConfigs.length,
        seasons: seasons.length,
        activeSeasons: activeSeasons.length
      }
    };
    
  } catch (error) {
    console.error('💥 Erro durante a verificação:', error);
    return {
      success: false,
      error: error.message,
      issues: ['❌ Erro fatal durante a verificação'],
      warnings: [],
      stats: {}
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  verifyDataIntegrity()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Verificação concluída com sucesso!');
        process.exit(0);
      } else {
        console.log('\n❌ Verificação concluída com problemas!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { verifyDataIntegrity };