const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeasonWinners() {
  console.log('🏆 Verificando vencedores de temporada...\n');
  
  const seasonWinners = await prisma.unlockedAchievement.findMany({
    where: { achievementId: 'season_winner' },
    include: {
      attendant: { select: { name: true } },
      season: { select: { name: true } }
    },
    orderBy: { unlockedAt: 'asc' }
  });
  
  console.log(`🏆 Total de "Vencedores da Temporada": ${seasonWinners.length}`);
  
  if (seasonWinners.length > 0) {
    seasonWinners.forEach((winner, index) => {
      console.log(`   ${index + 1}. ${winner.attendant.name}`);
      console.log(`      Temporada: ${winner.season?.name || 'Desconhecida'}`);
      console.log(`      Data: ${winner.unlockedAt.toLocaleDateString()}`);
      console.log(`      XP Ganho: +${winner.xpGained || 0} XP`);
      console.log();
    });
  } else {
    console.log('   ❌ Nenhum vencedor de temporada encontrado');
  }
  
  await prisma.$disconnect();
}

checkSeasonWinners().catch(console.error);