const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Implementação local dos critérios de conquista
async function checkAchievementCriteria(attendantId, achievementId) {
  try {
    // Calcular XP total
    const xpEvents = await prisma.xpEvent.findMany({
      where: { attendantId },
      select: { points: true }
    });
    const totalXp = xpEvents.reduce((sum, event) => sum + (event.points || 0), 0);
    
    // Contar avaliações
    const evaluationCount = await prisma.evaluation.count({
      where: { attendantId }
    });

    // Critérios baseados no ID da conquista
    switch (achievementId) {
      // Conquistas de Avaliações
      case 'first_evaluation':
        return evaluationCount >= 1;
      case 'ten_evaluations':
        return evaluationCount >= 10;
      case 'fifty_evaluations':
        return evaluationCount >= 50;
      case 'hundred_evaluations':
        return evaluationCount >= 100;
      
      // Conquistas de XP
      case 'hundred_xp':
        return totalXp >= 100;
      case 'thousand_xp':
        return totalXp >= 1000;
      case 'five_thousand_xp':
        return totalXp >= 5000;
      case 'ten_thousand_xp':
        return totalXp >= 10000;
      
      // Conquistas de Qualidade
      case 'five_star_streak_5':
        return await checkFiveStarStreak(attendantId, 5);
      case 'five_star_streak_10':
        return await checkFiveStarStreak(attendantId, 10);
      case 'high_average_50':
        return await checkHighAverage(attendantId, 4.5, 50);
      
      // Conquistas Temporais
      case 'monthly_champion':
        return await checkMonthlyChampion(attendantId);
      case 'season_winner':
        return await checkSeasonWinner(attendantId);
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Erro ao verificar critérios:', error);
    return false;
  }
}

// Verificar sequência de 5 estrelas
async function checkFiveStarStreak(attendantId, requiredStreak) {
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { attendantId },
      orderBy: { data: 'desc' },
      take: requiredStreak,
      select: { nota: true }
    });

    if (evaluations.length < requiredStreak) return false;
    return evaluations.every(eval => eval.nota === 5);
  } catch (error) {
    console.error('Erro ao verificar sequência 5 estrelas:', error);
    return false;
  }
}

// Verificar média alta
async function checkHighAverage(attendantId, requiredAverage, minEvaluations) {
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { attendantId },
      select: { nota: true }
    });

    if (evaluations.length < minEvaluations) return false;
    const average = evaluations.reduce((sum, eval) => sum + eval.nota, 0) / evaluations.length;
    return average >= requiredAverage;
  } catch (error) {
    console.error('Erro ao verificar média alta:', error);
    return false;
  }
}

// Verificar campeão mensal
async function checkMonthlyChampion(attendantId) {
  try {
    // Por enquanto retorna false - implementar quando houver sistema de ranking mensal
    return false;
  } catch (error) {
    console.error('Erro ao verificar campeão mensal:', error);
    return false;
  }
}

// Verificar vencedor de temporada
async function checkSeasonWinner(attendantId) {
  try {
    // Buscar temporadas finalizadas
    const now = new Date();
    const finishedSeasons = await prisma.gamificationSeason.findMany({
      where: {
        endDate: { lt: now }
      }
    });

    for (const season of finishedSeasons) {
      // Verificar se já tem a conquista desta temporada
      const existingAchievement = await prisma.unlockedAchievement.findFirst({
        where: {
          attendantId,
          achievementId: 'season_winner',
          seasonId: season.id
        }
      });

      if (existingAchievement) continue;

      // Calcular ranking da temporada
      const seasonRanking = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        where: {
          seasonId: season.id
        },
        _sum: {
          points: true
        },
        orderBy: {
          _sum: {
            points: 'desc'
          }
        }
      });

      // Verificar se este atendente foi o vencedor
      if (seasonRanking.length > 0 && seasonRanking[0].attendantId === attendantId) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar vencedor de temporada:', error);
    return false;
  }
}

// Desbloquear conquista
async function unlockAchievement(attendantId, achievementId) {
  try {
    // Verificar se já foi desbloqueada
    const existing = await prisma.unlockedAchievement.findFirst({
      where: {
        attendantId,
        achievementId
      }
    });

    if (existing) {
      return null; // Já desbloqueada
    }

    // Buscar configuração da conquista
    const achievement = await prisma.achievementConfig.findUnique({
      where: { id: achievementId }
    });

    if (!achievement) {
      throw new Error('Configuração de conquista não encontrada');
    }

    // Desbloquear conquista
    const unlockedAchievement = await prisma.unlockedAchievement.create({
      data: {
        attendantId,
        achievementId,
        xpGained: achievement.xp
      }
    });

    // Criar evento XP para a conquista
    if (achievement.xp > 0) {
      // Determinar temporada atual
      const now = new Date();
      const currentSeason = await prisma.gamificationSeason.findFirst({
        where: {
          startDate: { lte: now },
          endDate: { gte: now }
        }
      });

      await prisma.xpEvent.create({
        data: {
          attendantId,
          points: achievement.xp,
          basePoints: achievement.xp,
          multiplier: currentSeason?.xpMultiplier || 1,
          reason: `Conquista desbloqueada: ${achievement.title}`,
          date: now,
          type: 'ACHIEVEMENT',
          relatedId: unlockedAchievement.id,
          seasonId: currentSeason?.id
        }
      });
    }

    return unlockedAchievement;
  } catch (error) {
    console.error('Erro ao desbloquear conquista:', error);
    throw error;
  }
}

async function processAchievementsRetroactive() {
  console.log('🏆 Processando conquistas de forma retroativa...\n');
  
  try {
    // Buscar todos os atendentes
    const attendants = await prisma.attendant.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`👥 Processando ${attendants.length} atendentes...\n`);
    
    let totalUnlocked = 0;
    const results = [];
    
    for (const attendant of attendants) {
      console.log(`🔍 Verificando ${attendant.name}...`);
      
      try {
        // Buscar todas as conquistas ativas
        const achievements = await prisma.achievementConfig.findMany({
          where: { active: true }
        });

        // Buscar conquistas já desbloqueadas
        const unlockedIds = await prisma.unlockedAchievement.findMany({
          where: { attendantId: attendant.id },
          select: { achievementId: true }
        });

        const unlockedSet = new Set(unlockedIds.map(u => u.achievementId));
        const newUnlocked = [];

        // Verificar cada conquista
        for (const achievement of achievements) {
          if (unlockedSet.has(achievement.id)) {
            continue; // Já desbloqueada
          }

          const shouldUnlock = await checkAchievementCriteria(attendant.id, achievement.id);
          
          if (shouldUnlock) {
            try {
              const unlocked = await unlockAchievement(attendant.id, achievement.id);
              if (unlocked) {
                newUnlocked.push(unlocked);
              }
            } catch (error) {
              console.error(`      ❌ Erro ao desbloquear ${achievement.id}:`, error.message);
            }
          }
        }
        
        if (newUnlocked.length > 0) {
          console.log(`   🎉 ${newUnlocked.length} conquista(s) desbloqueada(s):`);
          
          for (const unlock of newUnlocked) {
            const achievement = await prisma.achievementConfig.findUnique({
              where: { id: unlock.achievementId }
            });
            
            console.log(`      🏅 ${achievement?.title || unlock.achievementId} (+${unlock.xpGained || 0} XP)`);
          }
          
          totalUnlocked += newUnlocked.length;
          results.push({
            attendant: attendant.name,
            unlocked: newUnlocked.length
          });
        } else {
          console.log(`   ⏭️ Nenhuma conquista nova`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao processar ${attendant.name}:`, error.message);
      }
      
      console.log();
    }
    
    // Resumo final
    console.log('📊 RESUMO DO PROCESSAMENTO');
    console.log('='.repeat(50));
    console.log(`🎯 Total de conquistas desbloqueadas: ${totalUnlocked}`);
    console.log(`👥 Atendentes processados: ${attendants.length}`);
    
    if (results.length > 0) {
      console.log('\n🏆 Top atendentes com mais conquistas:');
      results
        .sort((a, b) => b.unlocked - a.unlocked)
        .slice(0, 10)
        .forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.attendant}: ${result.unlocked} conquista(s)`);
        });
    }
    
    // Estatísticas finais
    const totalAchievements = await prisma.achievementConfig.count({ where: { active: true } });
    const totalUnlockedNow = await prisma.unlockedAchievement.count();
    
    console.log(`\n📈 Estatísticas do sistema:`);
    console.log(`   🎯 Conquistas disponíveis: ${totalAchievements}`);
    console.log(`   🔓 Total de conquistas desbloqueadas: ${totalUnlockedNow}`);
    console.log(`   📊 Taxa de desbloqueio: ${((totalUnlockedNow / (totalAchievements * attendants.length)) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Erro durante o processamento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  processAchievementsRetroactive().catch(console.error);
}

module.exports = { processAchievementsRetroactive };