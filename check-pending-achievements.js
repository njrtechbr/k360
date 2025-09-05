const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingAchievements() {
  try {
    console.log('🔍 Verificando conquistas pendentes...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada: ${currentSeason.name}\n`);
    
    // Buscar total de conquistas desbloqueadas na temporada atual
    const totalUnlocked = await prisma.achievementUnlock.count({
      where: { seasonId: currentSeason.id }
    });
    
    console.log(`🏆 Total de conquistas desbloqueadas na temporada: ${totalUnlocked}`);
    
    // Buscar conquistas por tipo
    const achievementsByType = await prisma.achievementUnlock.groupBy({
      by: ['achievementId'],
      where: { seasonId: currentSeason.id },
      _count: { achievementId: true }
    });
    
    console.log(`📊 Tipos de conquistas desbloqueadas: ${achievementsByType.length}\n`);
    
    // Buscar configurações de conquistas ativas
    const activeConfigs = await prisma.achievementConfig.findMany({
      where: { active: true },
      select: { id: true, title: true, description: true }
    });
    
    console.log('🎯 Conquistas ativas:');
    for (const config of activeConfigs) {
      const unlockedCount = achievementsByType.find(a => a.achievementId === config.id)?._count?.achievementId || 0;
      console.log(`- ${config.title}: ${unlockedCount} desbloqueadas`);
    }
    
    console.log('\n🔄 Vou tentar processar as conquistas pendentes...');
    
    // Buscar atendentes com avaliações na temporada atual
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
        achievementUnlocks: {
          where: { seasonId: currentSeason.id }
        }
      }
    });
    
    console.log(`\n👥 ${attendantsWithEvals.length} atendentes com avaliações na temporada`);
    
    // Verificar conquistas específicas
    const primeiraImpressaoConfig = activeConfigs.find(c => c.title === 'Primeira Impressão');
    if (primeiraImpressaoConfig) {
      const eligibleForPrimeira = attendantsWithEvals.filter(att => 
        att.evaluations.length >= 1 && 
        !att.achievementUnlocks.some(unlock => unlock.achievementId === primeiraImpressaoConfig.id)
      );
      
      if (eligibleForPrimeira.length > 0) {
        console.log(`\n⚠️  ${eligibleForPrimeira.length} atendentes podem desbloquear "Primeira Impressão":`);
        eligibleForPrimeira.slice(0, 5).forEach(att => {
          console.log(`- ${att.name} (${att.evaluations.length} avaliações)`);
        });
        if (eligibleForPrimeira.length > 5) {
          console.log(`... e mais ${eligibleForPrimeira.length - 5} atendentes`);
        }
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingAchievements();