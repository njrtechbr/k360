const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAchievements() {
  try {
    console.log('🔍 Verificando todas as conquistas...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada: ${currentSeason.name}\n`);
    
    // Buscar todas as configurações de conquistas ativas
    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { active: true },
      orderBy: { title: 'asc' }
    });
    
    console.log(`🏆 ${achievementConfigs.length} conquistas ativas:\n`);
    
    // Contar atendentes com avaliações na temporada
    const attendantsWithEvals = await prisma.evaluation.findMany({
      where: {
        data: {
          gte: currentSeason.startDate,
          lte: currentSeason.endDate
        }
      },
      select: {
        attendantId: true,
        nota: true,
        attendant: {
          select: { name: true }
        }
      }
    });
    
    const uniqueAttendants = [...new Set(attendantsWithEvals.map(e => e.attendantId))];
    console.log(`👥 ${uniqueAttendants.length} atendentes únicos com avaliações\n`);
    
    let totalPending = 0;
    
    for (const config of achievementConfigs) {
      // Contar quantos já desbloquearam
      const alreadyUnlocked = await prisma.unlockedAchievement.count({
        where: {
          achievementId: config.id,
          seasonId: currentSeason.id
        }
      });
      
      let eligible = 0;
      
      // Calcular elegíveis baseado no tipo de conquista
      if (config.title === 'Primeira Impressão') {
        eligible = uniqueAttendants.length; // Todos com pelo menos 1 avaliação
      } else if (config.title === 'Primeiros Passos') {
        // Atendentes com pelo menos 5 avaliações
        const evalCounts = {};
        attendantsWithEvals.forEach(e => {
          evalCounts[e.attendantId] = (evalCounts[e.attendantId] || 0) + 1;
        });
        eligible = Object.values(evalCounts).filter(count => count >= 5).length;
      } else if (config.title === 'Veterano') {
        // Atendentes com pelo menos 10 avaliações
        const evalCounts = {};
        attendantsWithEvals.forEach(e => {
          evalCounts[e.attendantId] = (evalCounts[e.attendantId] || 0) + 1;
        });
        eligible = Object.values(evalCounts).filter(count => count >= 10).length;
      } else if (config.title === 'Sequência Dourada') {
        // Atendentes com 5 avaliações 5 estrelas consecutivas
        // Simplificado: atendentes com pelo menos 5 avaliações 5 estrelas
        const fiveStarCounts = {};
        attendantsWithEvals.filter(e => e.nota === 5).forEach(e => {
          fiveStarCounts[e.attendantId] = (fiveStarCounts[e.attendantId] || 0) + 1;
        });
        eligible = Object.values(fiveStarCounts).filter(count => count >= 5).length;
      } else if (config.title === 'Perfeição Absoluta') {
        // Atendentes com 10 avaliações 5 estrelas
        const fiveStarCounts = {};
        attendantsWithEvals.filter(e => e.nota === 5).forEach(e => {
          fiveStarCounts[e.attendantId] = (fiveStarCounts[e.attendantId] || 0) + 1;
        });
        eligible = Object.values(fiveStarCounts).filter(count => count >= 10).length;
      } else {
        // Para outras conquistas, assumir que poucos são elegíveis
        eligible = Math.min(alreadyUnlocked + 2, uniqueAttendants.length);
      }
      
      const pending = Math.max(0, eligible - alreadyUnlocked);
      totalPending += pending;
      
      const status = pending > 0 ? '⚠️ ' : '✅';
      console.log(`${status} ${config.title}:`);
      console.log(`   Desbloqueadas: ${alreadyUnlocked} | Elegíveis: ${eligible} | Pendentes: ${pending}`);
      
      if (pending > 0) {
        console.log(`   🔧 Pode precisar de processamento manual`);
      }
      console.log('');
    }
    
    console.log(`📊 RESUMO: ${totalPending} conquistas pendentes no total`);
    
    if (totalPending > 0) {
      console.log('\n🚀 Executando processamento automático...');
      
      // Tentar processar conquistas básicas
      await processBasicAchievements(currentSeason, uniqueAttendants, attendantsWithEvals);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function processBasicAchievements(currentSeason, uniqueAttendants, attendantsWithEvals) {
  try {
    console.log('🔄 Processando conquistas básicas...\n');
    
    // Processar "Primeiros Passos" (5+ avaliações)
    const primeirosPasso = await prisma.achievementConfig.findFirst({
      where: { title: 'Primeiros Passos', active: true }
    });
    
    if (primeirosPasso) {
      const evalCounts = {};
      attendantsWithEvals.forEach(e => {
        evalCounts[e.attendantId] = (evalCounts[e.attendantId] || 0) + 1;
      });
      
      const eligibleAttendants = Object.entries(evalCounts)
        .filter(([_, count]) => count >= 5)
        .map(([attendantId, _]) => attendantId);
      
      // Verificar quem já desbloqueou
      const alreadyUnlocked = await prisma.unlockedAchievement.findMany({
        where: {
          achievementId: primeirosPasso.id,
          seasonId: currentSeason.id
        },
        select: { attendantId: true }
      });
      
      const unlockedIds = alreadyUnlocked.map(u => u.attendantId);
      const pendingIds = eligibleAttendants.filter(id => !unlockedIds.includes(id));
      
      console.log(`🎯 Primeiros Passos: ${pendingIds.length} pendentes`);
      
      for (const attendantId of pendingIds) {
        try {
          await prisma.unlockedAchievement.create({
            data: {
              attendantId,
              achievementId: primeirosPasso.id,
              seasonId: currentSeason.id,
              unlockedAt: new Date(),
              xpGained: primeirosPasso.xp
            }
          });
          console.log(`✅ Desbloqueado para atendente ${attendantId}`);
        } catch (error) {
          console.log(`❌ Erro: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Erro no processamento:', error.message);
  }
}

checkAllAchievements();