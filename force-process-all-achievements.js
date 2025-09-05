const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceProcessAllAchievements() {
  try {
    console.log('🚀 Processamento forçado de todas as conquistas pendentes...\n');
    
    // Buscar temporada atual
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    console.log(`📅 Temporada: ${currentSeason.name}\n`);
    
    // Buscar todas as avaliações da temporada com detalhes
    const seasonEvaluations = await prisma.evaluation.findMany({
      where: {
        data: {
          gte: currentSeason.startDate,
          lte: currentSeason.endDate
        }
      },
      include: {
        attendant: {
          select: { id: true, name: true }
        }
      },
      orderBy: { data: 'asc' }
    });
    
    console.log(`📊 ${seasonEvaluations.length} avaliações na temporada`);
    
    // Agrupar avaliações por atendente
    const attendantStats = {};
    seasonEvaluations.forEach(eval => {
      const id = eval.attendantId;
      if (!attendantStats[id]) {
        attendantStats[id] = {
          name: eval.attendant.name,
          totalEvals: 0,
          fiveStarEvals: 0,
          evaluations: []
        };
      }
      attendantStats[id].totalEvals++;
      if (eval.nota === 5) {
        attendantStats[id].fiveStarEvals++;
      }
      attendantStats[id].evaluations.push(eval);
    });
    
    console.log(`👥 ${Object.keys(attendantStats).length} atendentes únicos\n`);
    
    // Buscar todas as configurações de conquistas
    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { active: true }
    });
    
    let totalProcessed = 0;
    
    for (const config of achievementConfigs) {
      console.log(`🎯 Processando: ${config.title}`);
      
      // Buscar quem já desbloqueou
      const alreadyUnlocked = await prisma.unlockedAchievement.findMany({
        where: {
          achievementId: config.id,
          seasonId: currentSeason.id
        },
        select: { attendantId: true }
      });
      
      const unlockedIds = alreadyUnlocked.map(u => u.attendantId);
      
      // Determinar elegíveis baseado no tipo de conquista
      let eligibleIds = [];
      
      switch (config.title) {
        case 'Primeira Impressão':
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].totalEvals >= 1
          );
          break;
          
        case 'Primeiros Passos':
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].totalEvals >= 5
          );
          break;
          
        case 'Veterano':
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].totalEvals >= 10
          );
          break;
          
        case 'Experiente':
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].totalEvals >= 20
          );
          break;
          
        case 'Centurião':
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].totalEvals >= 100
          );
          break;
          
        case 'Sequência Dourada':
          // Atendentes com pelo menos 5 avaliações 5 estrelas
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].fiveStarEvals >= 5
          );
          break;
          
        case 'Perfeição Absoluta':
          // Atendentes com pelo menos 10 avaliações 5 estrelas
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].fiveStarEvals >= 10
          );
          break;
          
        case 'Excelência Consistente':
          // Atendentes com pelo menos 15 avaliações 5 estrelas
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].fiveStarEvals >= 15
          );
          break;
          
        case 'Milionário de XP':
          // Atendentes com muito XP (aproximação: 20+ avaliações)
          eligibleIds = Object.keys(attendantStats).filter(id => 
            attendantStats[id].totalEvals >= 20
          );
          break;
          
        default:
          // Para conquistas especiais, não processar automaticamente
          eligibleIds = [];
      }
      
      const pendingIds = eligibleIds.filter(id => !unlockedIds.includes(id));
      
      console.log(`   Elegíveis: ${eligibleIds.length} | Já desbloquearam: ${unlockedIds.length} | Pendentes: ${pendingIds.length}`);
      
      // Processar os pendentes
      for (const attendantId of pendingIds) {
        try {
          await prisma.unlockedAchievement.create({
            data: {
              attendantId,
              achievementId: config.id,
              seasonId: currentSeason.id,
              unlockedAt: new Date(),
              xpGained: config.xp
            }
          });
          
          console.log(`   ✅ ${attendantStats[attendantId].name}`);
          totalProcessed++;
        } catch (error) {
          if (!error.message.includes('Unique constraint')) {
            console.log(`   ❌ Erro para ${attendantStats[attendantId]?.name}: ${error.message}`);
          }
        }
      }
      
      console.log('');
    }
    
    console.log(`🎉 Processamento concluído! ${totalProcessed} novas conquistas desbloqueadas.`);
    
    // Verificar total final
    const finalCount = await prisma.unlockedAchievement.count({
      where: { seasonId: currentSeason.id }
    });
    
    console.log(`📊 Total de conquistas na temporada: ${finalCount}`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

forceProcessAllAchievements();