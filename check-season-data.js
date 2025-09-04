const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSeasonData() {
  try {
    // Verificar temporada ativa
    const activeSeason = await prisma.gamificationSeason.findFirst({
      where: {
        active: true
      }
    });

    console.log('Temporada ativa:', activeSeason);

    if (activeSeason) {
      // Verificar eventos XP da temporada
      const xpEvents = await prisma.xpEvent.findMany({
        where: {
          seasonId: activeSeason.id
        },
        take: 10
      });

      console.log(`Eventos XP na temporada ativa: ${xpEvents.length}`);
      if (xpEvents.length > 0) {
        console.log('Primeiros eventos XP:', xpEvents.slice(0, 3));
      }

      // Verificar eventos XP sem temporada
      const xpEventsWithoutSeason = await prisma.xpEvent.findMany({
        where: {
          seasonId: null
        },
        take: 10
      });

      console.log(`Eventos XP sem temporada: ${xpEventsWithoutSeason.length}`);
      
      if (xpEventsWithoutSeason.length > 0) {
        console.log('Associando eventos XP à temporada ativa...');
        
        const updateResult = await prisma.xpEvent.updateMany({
          where: {
            seasonId: null
          },
          data: {
            seasonId: activeSeason.id
          }
        });
        
        console.log(`${updateResult.count} eventos XP associados à temporada ativa`);
      }
    }

    // Verificar total de eventos XP
    const totalXpEvents = await prisma.xpEvent.count();
    console.log(`Total de eventos XP no banco: ${totalXpEvents}`);

    // Verificar attendants
    const totalAttendants = await prisma.attendant.count();
    console.log(`Total de attendants no banco: ${totalAttendants}`);

  } catch (error) {
    console.error('Erro ao verificar dados da temporada:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeasonData();