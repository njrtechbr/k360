const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSpecificAttendants() {
  try {
    console.log('🔍 Investigando os 4 atendentes específicos com conquistas pendentes...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada: ${currentSeason.name}\n`);
    
    // Buscar os atendentes mencionados na imagem
    const targetNames = [
      'Alex Sandra Soares da Costa Silva',
      'Aliana Virginia Torres de Almeida', 
      'Ana Nery Conceição dos Santos',
      'Kaio Brenner Alencar da Silva'
    ];
    
    for (const name of targetNames) {
      console.log(`👤 Analisando: ${name}`);
      
      // Buscar atendente
      const attendant = await prisma.attendant.findFirst({
        where: { 
          name: { contains: name, mode: 'insensitive' }
        }
      });
      
      if (!attendant) {
        console.log(`   ❌ Atendente não encontrado\n`);
        continue;
      }
      
      console.log(`   🆔 ID: ${attendant.id}`);
      
      // Buscar avaliações na temporada
      const evaluations = await prisma.evaluation.findMany({
        where: {
          attendantId: attendant.id,
          data: {
            gte: currentSeason.startDate,
            lte: currentSeason.endDate
          }
        },
        orderBy: { data: 'asc' }
      });
      
      console.log(`   📊 Avaliações na temporada: ${evaluations.length}`);
      
      if (evaluations.length > 0) {
        const fiveStars = evaluations.filter(e => e.nota === 5).length;
        const avgRating = (evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length).toFixed(2);
        
        console.log(`   ⭐ Avaliações 5 estrelas: ${fiveStars}`);
        console.log(`   📈 Média: ${avgRating}`);
        
        // Primeira e última avaliação
        console.log(`   📅 Primeira: ${evaluations[0].data.toISOString().split('T')[0]}`);
        console.log(`   📅 Última: ${evaluations[evaluations.length - 1].data.toISOString().split('T')[0]}`);
      }
      
      // Buscar conquistas já desbloqueadas
      const unlockedAchievements = await prisma.unlockedAchievement.findMany({
        where: {
          attendantId: attendant.id,
          seasonId: currentSeason.id
        }
      });
      
      console.log(`   🏆 Conquistas desbloqueadas: ${unlockedAchievements.length}`);
      
      // Buscar detalhes das conquistas desbloqueadas
      if (unlockedAchievements.length > 0) {
        const achievementIds = unlockedAchievements.map(u => u.achievementId);
        const achievementDetails = await prisma.achievementConfig.findMany({
          where: { id: { in: achievementIds } },
          select: { id: true, title: true, xp: true }
        });
        
        achievementDetails.forEach(achievement => {
          console.log(`      - ${achievement.title} (${achievement.xp} XP)`);
        });
      }
      
      // Verificar quais conquistas podem ser desbloqueadas
      const allAchievements = await prisma.achievementConfig.findMany({
        where: { active: true }
      });
      
      const unlockedIds = unlockedAchievements.map(u => u.achievementId);
      const pendingAchievements = [];
      
      for (const achievement of allAchievements) {
        if (unlockedIds.includes(achievement.id)) continue;
        
        let canUnlock = false;
        
        switch (achievement.title) {
          case 'Primeira Impressão':
            canUnlock = evaluations.length >= 1;
            break;
          case 'Primeiros Passos':
            canUnlock = evaluations.length >= 5;
            break;
          case 'Veterano':
            canUnlock = evaluations.length >= 10;
            break;
          case 'Experiente':
            canUnlock = evaluations.length >= 20;
            break;
          case 'Centurião':
            canUnlock = evaluations.length >= 100;
            break;
          case 'Sequência Dourada':
            canUnlock = evaluations.filter(e => e.nota === 5).length >= 5;
            break;
          case 'Perfeição Absoluta':
            canUnlock = evaluations.filter(e => e.nota === 5).length >= 10;
            break;
          case 'Excelência Consistente':
            canUnlock = evaluations.filter(e => e.nota === 5).length >= 15;
            break;
          case 'Milionário de XP':
            canUnlock = evaluations.length >= 20; // Aproximação
            break;
        }
        
        if (canUnlock) {
          pendingAchievements.push(achievement);
        }
      }
      
      if (pendingAchievements.length > 0) {
        console.log(`   ⚠️  PODE DESBLOQUEAR (${pendingAchievements.length}):`);
        pendingAchievements.forEach(achievement => {
          console.log(`      - ${achievement.title} (${achievement.xp} XP)`);
        });
        
        // Tentar desbloquear automaticamente
        console.log(`   🔧 Desbloqueando automaticamente...`);
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
            console.log(`      ✅ ${achievement.title} desbloqueada!`);
          } catch (error) {
            if (!error.message.includes('Unique constraint')) {
              console.log(`      ❌ Erro: ${error.message}`);
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

debugSpecificAttendants();