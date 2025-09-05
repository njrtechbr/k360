const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simpleAchievementCheck() {
  try {
    console.log('🔍 Verificação simples de conquistas...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    if (!currentSeason) {
      console.log('❌ Temporada não encontrada');
      return;
    }
    
    console.log(`📅 Temporada: ${currentSeason.name}`);
    console.log(`🆔 ID da temporada: ${currentSeason.id}\n`);
    
    // Contar conquistas desbloqueadas
    const unlockedCount = await prisma.unlockedAchievement.count({
      where: { seasonId: currentSeason.id }
    });
    
    console.log(`🏆 Conquistas desbloqueadas na temporada: ${unlockedCount}`);
    
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
        attendant: {
          select: { name: true }
        }
      },
      distinct: ['attendantId']
    });
    
    console.log(`👥 Atendentes com avaliações na temporada: ${attendantsWithEvals.length}`);
    
    // Buscar configuração da conquista "Primeira Impressão"
    const primeiraImpressao = await prisma.achievementConfig.findFirst({
      where: { 
        title: 'Primeira Impressão',
        active: true 
      }
    });
    
    if (primeiraImpressao) {
      console.log(`\n🎯 Conquista "Primeira Impressão" encontrada (ID: ${primeiraImpressao.id})`);
      
      // Contar quantos já desbloquearam
      const alreadyUnlocked = await prisma.unlockedAchievement.count({
        where: {
          achievementId: primeiraImpressao.id,
          seasonId: currentSeason.id
        }
      });
      
      console.log(`✅ Já desbloquearam: ${alreadyUnlocked}`);
      console.log(`⚠️  Podem desbloquear: ${attendantsWithEvals.length - alreadyUnlocked}`);
      
      if (attendantsWithEvals.length > alreadyUnlocked) {
        console.log('\n🔧 Vou tentar forçar o processamento...');
        
        // Buscar atendentes que ainda não desbloquearam
        const attendantIds = attendantsWithEvals.map(a => a.attendantId);
        const alreadyUnlockedIds = await prisma.unlockedAchievement.findMany({
          where: {
            achievementId: primeiraImpressao.id,
            seasonId: currentSeason.id
          },
          select: { attendantId: true }
        });
        
        const unlockedAttendantIds = alreadyUnlockedIds.map(u => u.attendantId);
        const pendingAttendantIds = attendantIds.filter(id => !unlockedAttendantIds.includes(id));
        
        console.log(`📋 ${pendingAttendantIds.length} atendentes pendentes para "Primeira Impressão"`);
        
        // Criar os desbloqueios pendentes
        let created = 0;
        for (const attendantId of pendingAttendantIds) {
          try {
            await prisma.unlockedAchievement.create({
              data: {
                attendantId,
                achievementId: primeiraImpressao.id,
                seasonId: currentSeason.id,
                unlockedAt: new Date()
              }
            });
            created++;
          } catch (error) {
            console.log(`❌ Erro ao criar desbloqueio para ${attendantId}: ${error.message}`);
          }
        }
        
        console.log(`✅ ${created} novos desbloqueios criados!`);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleAchievementCheck();