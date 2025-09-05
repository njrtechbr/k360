const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSimilarAttendants() {
  try {
    console.log('🔍 Buscando atendentes com nomes similares...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    // Buscar todos os atendentes com avaliações na temporada
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
      }
    });
    
    console.log(`👥 ${attendantsWithEvals.length} atendentes com avaliações na temporada\n`);
    
    // Buscar nomes que contenham partes dos nomes procurados
    const searchTerms = [
      'Alex',
      'Sandra', 
      'Aliana',
      'Virginia',
      'Ana Nery',
      'Kaio',
      'Brenner'
    ];
    
    const potentialMatches = [];
    
    for (const term of searchTerms) {
      const matches = attendantsWithEvals.filter(att => 
        att.name.toLowerCase().includes(term.toLowerCase())
      );
      
      if (matches.length > 0) {
        console.log(`🔍 Buscando por "${term}":`);
        matches.forEach(att => {
          console.log(`   - ${att.name} (${att.evaluations.length} avaliações, ${att.unlockedAchievements.length} conquistas)`);
          potentialMatches.push(att);
        });
        console.log('');
      }
    }
    
    // Remover duplicatas
    const uniqueMatches = potentialMatches.filter((att, index, self) => 
      index === self.findIndex(a => a.id === att.id)
    );
    
    console.log(`\n🎯 ${uniqueMatches.length} atendentes únicos encontrados\n`);
    
    // Analisar cada atendente encontrado
    for (const attendant of uniqueMatches) {
      console.log(`👤 ${attendant.name}`);
      console.log(`   📊 Avaliações: ${attendant.evaluations.length}`);
      console.log(`   🏆 Conquistas: ${attendant.unlockedAchievements.length}`);
      
      const fiveStars = attendant.evaluations.filter(e => e.nota === 5).length;
      console.log(`   ⭐ 5 estrelas: ${fiveStars}`);
      
      // Verificar conquistas que podem ser desbloqueadas
      const allAchievements = await prisma.achievementConfig.findMany({
        where: { active: true }
      });
      
      const unlockedIds = attendant.unlockedAchievements.map(u => u.achievementId);
      const pendingAchievements = [];
      
      for (const achievement of allAchievements) {
        if (unlockedIds.includes(achievement.id)) continue;
        
        let canUnlock = false;
        
        switch (achievement.title) {
          case 'Primeira Impressão':
            canUnlock = attendant.evaluations.length >= 1;
            break;
          case 'Primeiros Passos':
            canUnlock = attendant.evaluations.length >= 5;
            break;
          case 'Veterano':
            canUnlock = attendant.evaluations.length >= 10;
            break;
          case 'Experiente':
            canUnlock = attendant.evaluations.length >= 20;
            break;
          case 'Centurião':
            canUnlock = attendant.evaluations.length >= 100;
            break;
          case 'Sequência Dourada':
            canUnlock = fiveStars >= 5;
            break;
          case 'Perfeição Absoluta':
            canUnlock = fiveStars >= 10;
            break;
          case 'Excelência Consistente':
            canUnlock = fiveStars >= 15;
            break;
          case 'Milionário de XP':
            canUnlock = attendant.evaluations.length >= 20;
            break;
        }
        
        if (canUnlock) {
          pendingAchievements.push(achievement);
        }
      }
      
      if (pendingAchievements.length > 0) {
        console.log(`   ⚠️  PODE DESBLOQUEAR (${pendingAchievements.length}):`);
        pendingAchievements.forEach(achievement => {
          console.log(`      - ${achievement.title}`);
        });
        
        // Desbloquear automaticamente
        console.log(`   🔧 Desbloqueando...`);
        for (const achievement of pendingAchievements) {
          try {
            await prisma.unlockedAchievement.create({
              data: {
                attendantId: attendant.id,
                achievementId: achievement.id,
                seasonId: currentSeason.id,
                unlockedAt: new Date(),
                xpGained: achievement.xp
              }
            });
            console.log(`      ✅ ${achievement.title}`);
          } catch (error) {
            if (!error.message.includes('Unique constraint')) {
              console.log(`      ❌ ${achievement.title}: ${error.message}`);
            }
          }
        }
      } else {
        console.log(`   ✅ Nenhuma conquista pendente`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findSimilarAttendants();