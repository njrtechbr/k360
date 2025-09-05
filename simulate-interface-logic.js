const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateInterfaceLogic() {
  try {
    console.log('🔍 Simulando lógica da interface...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada: ${currentSeason.name}`);
    
    const seasonStart = new Date(currentSeason.startDate);
    const seasonEnd = new Date(currentSeason.endDate);
    
    // Buscar dados necessários
    const attendants = await prisma.attendant.findMany();
    const achievements = await prisma.achievementConfig.findMany({ where: { active: true } });
    const xpEvents = await prisma.xpEvent.findMany();
    const evaluations = await prisma.evaluation.findMany();
    const unlockedAchievements = await prisma.unlockedAchievement.findMany();
    
    console.log(`👥 ${attendants.length} atendentes`);
    console.log(`🏆 ${achievements.length} conquistas`);
    console.log(`📊 ${evaluations.length} avaliações`);
    console.log(`🎯 ${unlockedAchievements.length} conquistas desbloqueadas\n`);
    
    // Função para verificar critérios (copiada da interface)
    const checkAchievementCriteria = async (attendantId, achievementId, seasonStart, seasonEnd) => {
      const seasonXpEvents = xpEvents.filter(e => {
        const eventDate = new Date(e.date);
        return e.attendantId === attendantId && eventDate >= seasonStart && eventDate <= seasonEnd;
      });
      
      const seasonEvaluations = evaluations.filter(e => {
        const evalDate = new Date(e.data);
        return e.attendantId === attendantId && evalDate >= seasonStart && evalDate <= seasonEnd;
      });

      const seasonXp = seasonXpEvents.reduce((sum, e) => sum + (e.points || 0), 0);
      const evaluationCount = seasonEvaluations.length;

      switch (achievementId) {
        case 'first_evaluation':
          return evaluationCount >= 1;
        case 'ten_evaluations':
          return evaluationCount >= 10;
        case 'fifty_evaluations':
          return evaluationCount >= 50;
        case 'hundred_evaluations':
          return evaluationCount >= 100;
        case 'hundred_xp':
          return seasonXp >= 100;
        case 'thousand_xp':
          return seasonXp >= 1000;
        case 'five_thousand_xp':
          return seasonXp >= 5000;
        case 'ten_thousand_xp':
          return seasonXp >= 10000;
        case 'five_star_streak_5':
          return checkFiveStarStreak(seasonEvaluations, 5);
        case 'five_star_streak_10':
          return checkFiveStarStreak(seasonEvaluations, 10);
        case 'high_average_50':
          return checkHighAverage(seasonEvaluations, 4.5, 50);
        default:
          return false;
      }
    };

    const checkFiveStarStreak = (evaluations, requiredStreak) => {
      if (evaluations.length < requiredStreak) return false;
      
      const sorted = evaluations.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      let currentStreak = 0;
      let maxStreak = 0;
      
      for (const evaluation of sorted) {
        if (evaluation.nota === 5) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
      
      return maxStreak >= requiredStreak;
    };

    const checkHighAverage = (evaluations, requiredAverage, minEvaluations) => {
      if (evaluations.length < minEvaluations) return false;
      const average = evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
      return average >= requiredAverage;
    };
    
    // Analisar status dos atendentes
    const statuses = [];
    let totalCanUnlock = 0;

    for (const attendant of attendants) {
      // Conquistas já desbloqueadas na temporada atual
      const currentSeasonUnlocked = unlockedAchievements.filter(ua => {
        const unlockedDate = new Date(ua.unlockedAt);
        return ua.attendantId === attendant.id && 
               unlockedDate >= seasonStart && 
               unlockedDate <= seasonEnd;
      });

      // Verificar quais conquistas podem ser desbloqueadas
      const canUnlock = [];

      for (const achievement of achievements) {
        const alreadyUnlocked = currentSeasonUnlocked.some(ua => ua.achievementId === achievement.id);
        
        if (!alreadyUnlocked) {
          const shouldUnlock = await checkAchievementCriteria(attendant.id, achievement.id, seasonStart, seasonEnd);
          if (shouldUnlock) {
            canUnlock.push(achievement.id);
          }
        }
      }

      if (canUnlock.length > 0) {
        statuses.push({
          attendantId: attendant.id,
          attendantName: attendant.name,
          currentSeasonAchievements: currentSeasonUnlocked.length,
          canUnlock: canUnlock
        });
        totalCanUnlock += canUnlock.length;
      }
    }
    
    console.log(`🎯 RESULTADO: ${totalCanUnlock} conquistas podem ser desbloqueadas\n`);
    
    if (statuses.length > 0) {
      console.log('👤 Atendentes com conquistas pendentes:');
      statuses.forEach(status => {
        console.log(`- ${status.attendantName}: ${status.canUnlock.length} conquistas`);
        status.canUnlock.forEach(achievementId => {
          const achievement = achievements.find(a => a.id === achievementId);
          console.log(`  • ${achievement?.title || achievementId}`);
        });
      });
      
      console.log('\n🔧 Tentando processar essas conquistas...');
      
      for (const status of statuses) {
        for (const achievementId of status.canUnlock) {
          try {
            const achievement = achievements.find(a => a.id === achievementId);
            await prisma.unlockedAchievement.create({
              data: {
                attendantId: status.attendantId,
                achievementId: achievementId,
                seasonId: currentSeason.id,
                unlockedAt: new Date(),
                xpGained: achievement?.xp || 0
              }
            });
            console.log(`✅ ${status.attendantName} -> ${achievement?.title}`);
          } catch (error) {
            if (!error.message.includes('Unique constraint')) {
              console.log(`❌ ${status.attendantName} -> ${achievementId}: ${error.message}`);
            }
          }
        }
      }
    } else {
      console.log('✅ Nenhuma conquista pendente encontrada!');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simulateInterfaceLogic();