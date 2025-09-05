const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPendingAchievements() {
  try {
    console.log('🔍 Investigando conquistas pendentes...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    if (!currentSeason) {
      console.log('❌ Temporada atual não encontrada');
      return;
    }
    
    console.log(`📅 Temporada atual: ${currentSeason.name}`);
    console.log(`📊 Período: ${currentSeason.startDate.toISOString().split('T')[0]} a ${currentSeason.endDate.toISOString().split('T')[0]}\n`);
    
    // Buscar todas as configurações de conquistas ativas
    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { active: true },
      orderBy: { title: 'asc' }
    });
    
    console.log(`🏆 ${achievementConfigs.length} configurações de conquistas ativas:\n`);
    
    // Para cada conquista, verificar quantos atendentes podem desbloqueá-la
    for (const config of achievementConfigs) {
      console.log(`🎯 ${config.title} (${config.xp} XP)`);
      console.log(`   Descrição: ${config.description}`);
      
      // Buscar conquistas já desbloqueadas nesta temporada
      const unlockedCount = await prisma.achievementUnlock.count({
        where: {
          achievementId: config.id,
          seasonId: currentSeason.id
        }
      });
      
      console.log(`   ✅ Já desbloqueadas: ${unlockedCount}`);
      
      // Verificar critérios específicos baseados no título da conquista
      let eligibleCount = 0;
      
      if (config.title === 'Primeira Impressão') {
        // Atendentes com pelo menos 1 avaliação na temporada
        eligibleCount = await prisma.attendant.count({
          where: {
            evaluations: {
              some: {
                data: {
                  gte: currentSeason.startDate,
                  lte: currentSeason.endDate
                }
              }
            }
          }
        });
      } else if (config.title === 'Primeiros Passos') {
        // Atendentes com pelo menos 5 avaliações na temporada
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
            }
          }
        });
        
        eligibleCount = attendantsWithEvals.filter(att => att.evaluations.length >= 5).length;
      } else if (config.title === 'Veterano') {
        // Atendentes com pelo menos 10 avaliações na temporada
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
            }
          }
        });
        
        eligibleCount = attendantsWithEvals.filter(att => att.evaluations.length >= 10).length;
      }
      
      const pendingCount = eligibleCount - unlockedCount;
      
      if (pendingCount > 0) {
        console.log(`   ⚠️  PENDENTES: ${pendingCount} atendentes podem desbloquear`);
      } else {
        console.log(`   ✅ Todas as conquistas elegíveis foram desbloqueadas`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPendingAchievements();