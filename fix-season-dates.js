const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSeasonDates() {
  try {
    // Verificar temporada ativa
    const activeSeason = await prisma.gamificationSeason.findFirst({
      where: {
        active: true
      }
    });

    console.log('Temporada ativa atual:', activeSeason);

    // Verificar datas dos eventos XP
    const xpEvents = await prisma.xpEvent.findMany({
      orderBy: {
        date: 'asc'
      },
      take: 5
    });

    const latestXpEvents = await prisma.xpEvent.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 5
    });

    console.log('Primeiros eventos XP (mais antigos):', xpEvents.map(e => ({ date: e.date, reason: e.reason })));
    console.log('Últimos eventos XP (mais recentes):', latestXpEvents.map(e => ({ date: e.date, reason: e.reason })));

    if (xpEvents.length > 0 && activeSeason) {
      // Encontrar o range de datas dos eventos XP
      const oldestEvent = xpEvents[0];
      const newestEvent = latestXpEvents[0];
      
      console.log('Range de eventos XP:', {
        oldest: oldestEvent.date,
        newest: newestEvent.date
      });

      // Ajustar a temporada para cobrir o período dos eventos XP
      const startDate = new Date(oldestEvent.date);
      startDate.setDate(startDate.getDate() - 7); // Começar 7 dias antes do primeiro evento
      
      const endDate = new Date(newestEvent.date);
      endDate.setDate(endDate.getDate() + 30); // Terminar 30 dias após o último evento

      console.log('Atualizando temporada para:', {
        startDate,
        endDate
      });

      const updatedSeason = await prisma.gamificationSeason.update({
        where: {
          id: activeSeason.id
        },
        data: {
          startDate: startDate,
          endDate: endDate
        }
      });

      console.log('Temporada atualizada:', updatedSeason);

      // Verificar quantos eventos XP agora se encaixam na temporada
      const eventsInSeason = await prisma.xpEvent.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      console.log(`Eventos XP que agora se encaixam na temporada: ${eventsInSeason.length}`);
    }

  } catch (error) {
    console.error('Erro ao ajustar datas da temporada:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSeasonDates();