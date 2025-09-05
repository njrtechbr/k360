const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processSeasonAchievements() {
  console.log('🏆 Processando conquistas de temporadas finalizadas...\n');
  
  try {
    // Buscar temporadas finalizadas
    const now = new Date();
    const finishedSeasons = await prisma.gamificationSeason.findMany({
      where: {
        endDate: { lt: now }
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`📅 Encontradas ${finishedSeasons.length} temporadas finalizadas:`);
    finishedSeasons.forEach(season => {
      console.log(`   ${season.name} (${season.startDate.toLocaleDateString()} - ${season.endDate.toLocaleDateString()})`);
    });
    console.log();
    
    let totalWinnersProcessed = 0;
    
    for (const season of finishedSeasons) {
      console.log(`🔍 Processando ${season.name}...`);
      
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
      
      if (seasonRanking.length === 0) {
        console.log(`   ⚠️ Nenhum evento XP encontrado para esta temporada`);
        continue;
      }
      
      // Buscar dados do vencedor
      const winnerId = seasonRanking[0].attendantId;
      const winnerXp = seasonRanking[0]._sum.points || 0;
      
      const winner = await prisma.attendant.findUnique({
        where: { id: winnerId },
        select: { name: true }
      });
      
      console.log(`   🥇 Vencedor: ${winner?.name || 'Desconhecido'} (${winnerXp} XP)`);
      
      // Verificar se já tem a conquista
      const existingAchievement = await prisma.unlockedAchievement.findFirst({
        where: {
          attendantId: winnerId,
          achievementId: 'season_winner',
          seasonId: season.id
        }
      });
      
      if (existingAchievement) {
        console.log(`   ✅ Conquista "Vencedor da Temporada" já concedida`);
      } else {
        // Conceder conquista
        try {
          const achievement = await prisma.achievementConfig.findUnique({
            where: { id: 'season_winner' }
          });
          
          if (!achievement) {
            console.log(`   ❌ Configuração da conquista "season_winner" não encontrada`);
            continue;
          }
          
          // Criar conquista desbloqueada
          const unlockedAchievement = await prisma.unlockedAchievement.create({
            data: {
              attendantId: winnerId,
              achievementId: 'season_winner',
              xpGained: achievement.xp,
              unlockedAt: season.endDate // Data do fim da temporada
            }
          });
          
          // Criar evento XP
          await prisma.xpEvent.create({
            data: {
              attendantId: winnerId,
              points: achievement.xp,
              basePoints: achievement.xp,
              multiplier: 1, // Sem multiplicador para conquistas
              reason: `Vencedor da Temporada: ${season.name}`,
              date: season.endDate,
              type: 'ACHIEVEMENT',
              relatedId: unlockedAchievement.id,
              seasonId: season.id
            }
          });
          
          console.log(`   🎉 Conquista "Vencedor da Temporada" concedida! (+${achievement.xp} XP)`);
          totalWinnersProcessed++;
          
        } catch (error) {
          console.log(`   ❌ Erro ao conceder conquista:`, error.message);
        }
      }
      
      // Mostrar top 3 da temporada
      console.log(`   📊 Top 3 da temporada:`);
      for (let i = 0; i < Math.min(3, seasonRanking.length); i++) {
        const attendant = await prisma.attendant.findUnique({
          where: { id: seasonRanking[i].attendantId },
          select: { name: true }
        });
        const position = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
        console.log(`      ${position} ${attendant?.name || 'Desconhecido'}: ${seasonRanking[i]._sum.points || 0} XP`);
      }
      
      console.log();
    }
    
    // Resumo final
    console.log('📊 RESUMO DO PROCESSAMENTO');
    console.log('='.repeat(50));
    console.log(`🏆 Temporadas processadas: ${finishedSeasons.length}`);
    console.log(`👑 Vencedores processados: ${totalWinnersProcessed}`);
    
    // Verificar conquistas de "Vencedor da Temporada" existentes
    const seasonWinners = await prisma.unlockedAchievement.findMany({
      where: { achievementId: 'season_winner' },
      include: {
        attendant: { select: { name: true } }
      },
      orderBy: { unlockedAt: 'asc' }
    });
    
    console.log(`\n🏆 Total de "Vencedores da Temporada": ${seasonWinners.length}`);
    seasonWinners.forEach((winner, index) => {
      console.log(`   ${index + 1}. ${winner.attendant.name} - ${winner.unlockedAt.toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.error('❌ Erro durante o processamento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  processSeasonAchievements().catch(console.error);
}

module.exports = { processSeasonAchievements };