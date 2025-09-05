const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detailedAchievementAnalysis() {
  try {
    console.log('🔍 Análise detalhada de conquistas...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada: ${currentSeason.name}\n`);
    
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
        }
      }
    });
    
    console.log(`👥 ${attendantsWithEvals.length} atendentes com avaliações\n`);
    
    // Buscar todas as conquistas ativas
    const allAchievements = await prisma.achievementConfig.findMany({
      where: { active: true },
      orderBy: { title: 'asc' }
    });
    
    console.log(`🏆 ${allAchievements.length} conquistas ativas\n`);
    
    // Para cada conquista, verificar quantos podem desbloquear
    for (const achievement of allAchievements) {
      console.log(`🎯 ${achievement.title}:`);
      
      // Contar quantos já desbloquearam
      const alreadyUnlocked = await prisma.unlockedAchievement.count({
        where: {
          achievementId: achievement.id,
          seasonId: currentSeason.id
        }
      });
      
      // Contar quantos são elegíveis
      let eligibleCount = 0;
      const eligibleAttendants = [];
      
      for (const attendant of attendantsWithEvals) {
        const evals = attendant.evaluations;
        const fiveStars = evals.filter(e => e.nota === 5).length;
        
        let isEligible = false;
        
        switch (achievement.title) {
          case 'Primeira Impressão':
            isEligible = evals.length >= 1;
            break;
          case 'Primeiros Passos':
            isEligible = evals.length >= 5;
            break;
          case 'Veterano':
            isEligible = evals.length >= 10;
            break;
          case 'Experiente':
            isEligible = evals.length >= 20;
            break;
          case 'Centurião':
            isEligible = evals.length >= 100;
            break;
          case 'Sequência Dourada':
            isEligible = fiveStars >= 5;
            break;
          case 'Perfeição Absoluta':
            isEligible = fiveStars >= 10;
            break;
          case 'Excelência Consistente':
            isEligible = fiveStars >= 15;
            break;
          case 'Milionário de XP':
            isEligible = evals.length >= 20;
            break;
        }
        
        if (isEligible) {
          eligibleCount++;
          eligibleAttendants.push({
            name: attendant.name,
            id: attendant.id,
            evals: evals.length,
            fiveStars: fiveStars
          });
        }
      }
      
      const pendingCount = eligibleCount - alreadyUnlocked;
      
      console.log(`   Elegíveis: ${eligibleCount} | Desbloqueadas: ${alreadyUnlocked} | Pendentes: ${pendingCount}`);
      
      if (pendingCount > 0) {
        console.log(`   ⚠️  ATENDENTES PENDENTES:`);
        
        // Buscar quem já desbloqueou para filtrar
        const unlockedAttendantIds = await prisma.unlockedAchievement.findMany({
          where: {
            achievementId: achievement.id,
            seasonId: currentSeason.id
          },
          select: { attendantId: true }
        });
        
        const unlockedIds = unlockedAttendantIds.map(u => u.attendantId);
        const pendingAttendants = eligibleAttendants.filter(att => !unlockedIds.includes(att.id));
        
        pendingAttendants.forEach(att => {
          console.log(`      - ${att.name} (${att.evals} avaliações, ${att.fiveStars} cinco estrelas)`);
        });
        
        // Tentar desbloquear
        console.log(`   🔧 Desbloqueando ${pendingAttendants.length} conquistas...`);
        let successCount = 0;
        
        for (const att of pendingAttendants) {
          try {
            await prisma.unlockedAchievement.create({
              data: {
                attendantId: att.id,
                achievementId: achievement.id,
                seasonId: currentSeason.id,
                unlockedAt: new Date(),
                xpGained: achievement.xp
              }
            });
            console.log(`      ✅ ${att.name}`);
            successCount++;
          } catch (error) {
            if (!error.message.includes('Unique constraint')) {
              console.log(`      ❌ ${att.name}: ${error.message}`);
            } else {
              console.log(`      ⚠️  ${att.name}: Já existe`);
            }
          }
        }
        
        if (successCount > 0) {
          console.log(`   🎉 ${successCount} conquistas desbloqueadas!`);
        }
      }
      
      console.log('');
    }
    
    // Verificar total final
    const finalCount = await prisma.unlockedAchievement.count({
      where: { seasonId: currentSeason.id }
    });
    
    console.log(`📊 Total final de conquistas desbloqueadas: ${finalCount}`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

detailedAchievementAnalysis();