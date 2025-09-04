const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestSeason() {
  try {
    // Verificar se já existe uma temporada ativa
    const existingSeason = await prisma.gamificationSeason.findFirst({
      where: {
        active: true
      }
    });

    if (existingSeason) {
      console.log('Já existe uma temporada ativa:', existingSeason.name);
      return;
    }

    // Criar uma temporada de teste
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Começou há 30 dias
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Termina em 30 dias

    const testSeason = await prisma.gamificationSeason.create({
      data: {
        name: 'Temporada de Teste 2024',
        startDate: startDate,
        endDate: endDate,
        active: true,
        xpMultiplier: 1.0
      }
    });

    console.log('Temporada de teste criada com sucesso:', testSeason);
    
    // Verificar se há eventos XP para associar à temporada
    const xpEvents = await prisma.xpEvent.findMany({
      where: {
        seasonId: null
      },
      take: 10
    });

    if (xpEvents.length > 0) {
      // Associar alguns eventos XP à temporada
      await prisma.xpEvent.updateMany({
        where: {
          seasonId: null
        },
        data: {
          seasonId: testSeason.id
        }
      });
      
      console.log(`${xpEvents.length} eventos XP associados à temporada de teste`);
    } else {
      console.log('Nenhum evento XP encontrado para associar à temporada');
    }

  } catch (error) {
    console.error('Erro ao criar temporada de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSeason();