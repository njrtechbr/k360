const { PrismaClient } = require('@prisma/client');

async function verifyUpdatedXp() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando os novos valores de XP...\n');
    
    // Buscar alguns exemplos
    const sampleEvents = await prisma.xpEvent.findMany({
      where: { type: 'EVALUATION' },
      include: { season: true },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📋 Exemplos de eventos atualizados:');
    sampleEvents.forEach(event => {
      console.log(`   ${event.basePoints} base × ${event.multiplier} = ${event.points} XP (${event.season?.name || 'Sem temporada'})`);
    });
    
    // Estatísticas por temporada
    console.log('\n📊 Estatísticas por temporada:');
    
    const seasons = await prisma.gamificationSeason.findMany({
      orderBy: { startDate: 'asc' }
    });
    
    for (const season of seasons) {
      const seasonStats = await prisma.xpEvent.aggregate({
        where: {
          seasonId: season.id,
          type: 'EVALUATION'
        },
        _sum: { points: true },
        _count: true,
        _avg: { points: true }
      });
      
      if (seasonStats._count > 0) {
        console.log(`   ${season.name}:`);
        console.log(`     Eventos: ${seasonStats._count}`);
        console.log(`     XP total: ${seasonStats._sum.points || 0}`);
        console.log(`     XP médio: ${Math.round(seasonStats._avg.points || 0)}`);
      }
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUpdatedXp();