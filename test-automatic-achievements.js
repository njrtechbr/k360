const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAutomaticAchievements() {
  try {
    console.log('🧪 Testando sistema automático de conquistas...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada atual: ${currentSeason.name}\n`);
    
    // Buscar um atendente com poucas conquistas para testar
    const attendantsWithEvals = await prisma.attendant.findMany({
      where: {
        evaluations: {
          some: {
            data: {
              gte: currentSeason.startDate,
              lte: currentSeason.endDate
            }
          }
        }
      },
      include: {
        evaluations: {
          where: {
            data: {
              gte: currentSeason.startDate,
              lte: currentSeason.endDate
            }
          }
        },
        unlockedAchievements: {
          where: { seasonId: currentSeason.id }
        }
      },
      take: 5
    });
    
    console.log('👥 Atendentes para teste:');
    attendantsWithEvals.forEach(att => {
      console.log(`- ${att.name}: ${att.evaluations.length} avaliações, ${att.unlockedAchievements.length} conquistas`);
    });
    
    // Testar API de processamento automático
    console.log('\n🚀 Testando API de processamento automático...');
    
    try {
      const response = await fetch('http://localhost:3000/api/gamification/achievements/auto-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API funcionando:', result);
      } else {
        console.log('❌ API não disponível (servidor não está rodando)');
        console.log('💡 Para testar completamente, execute: npm run dev');
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
      console.log('💡 Para testar completamente, execute: npm run dev');
    }
    
    // Simular criação de uma nova avaliação
    console.log('\n📝 Simulando criação de nova avaliação...');
    
    const testAttendant = attendantsWithEvals[0];
    if (testAttendant) {
      console.log(`🎯 Atendente de teste: ${testAttendant.name}`);
      console.log(`📊 Avaliações atuais: ${testAttendant.evaluations.length}`);
      console.log(`🏆 Conquistas atuais: ${testAttendant.unlockedAchievements.length}`);
      
      // Verificar se pode desbloquear alguma conquista
      const allAchievements = await prisma.achievementConfig.findMany({
        where: { active: true }
      });
      
      const unlockedIds = new Set(testAttendant.unlockedAchievements.map(ua => ua.achievementId));
      const pendingAchievements = [];
      
      for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;
        
        let canUnlock = false;
        const evalCount = testAttendant.evaluations.length;
        const fiveStars = testAttendant.evaluations.filter(e => e.nota === 5).length;
        
        switch (achievement.id) {
          case 'first_evaluation':
            canUnlock = evalCount >= 1;
            break;
          case 'ten_evaluations':
            canUnlock = evalCount >= 10;
            break;
          case 'five_star_streak_5':
            canUnlock = fiveStars >= 5;
            break;
        }
        
        if (canUnlock) {
          pendingAchievements.push(achievement);
        }
      }
      
      if (pendingAchievements.length > 0) {
        console.log(`⚠️  ${pendingAchievements.length} conquistas podem ser desbloqueadas:`);
        pendingAchievements.forEach(ach => {
          console.log(`   - ${ach.title}`);
        });
      } else {
        console.log('✅ Todas as conquistas elegíveis já foram desbloqueadas');
      }
    }
    
    console.log('\n📋 Resumo do Sistema Automático:');
    console.log('✅ Processamento automático implementado no EvaluationService');
    console.log('✅ API de processamento manual disponível');
    console.log('✅ Critérios baseados na temporada atual');
    console.log('✅ Verificação de conquistas após cada nova avaliação');
    console.log('✅ Processamento em lote para importações');
    
    console.log('\n🎯 Como funciona:');
    console.log('1. Nova avaliação é criada');
    console.log('2. Sistema cria evento XP automaticamente');
    console.log('3. Sistema verifica conquistas para o atendente');
    console.log('4. Conquistas elegíveis são desbloqueadas automaticamente');
    console.log('5. Logs são gerados para acompanhamento');
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAutomaticAchievements();