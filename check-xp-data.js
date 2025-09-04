const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkXpData() {
  try {
    console.log('=== Verificando dados de XP ===');
    
    // Contar registros na tabela XpEvent
    const xpEventCount = await prisma.xpEvent.count();
    console.log(`Total de eventos XP: ${xpEventCount}`);
    
    // Buscar alguns eventos de exemplo
    const sampleEvents = await prisma.xpEvent.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nEventos de exemplo:');
    sampleEvents.forEach(event => {
      console.log(`- ID: ${event.id}, Attendant: ${event.attendantId}, Points: ${event.points}, Reason: ${event.reason}`);
    });
    
    // Verificar atendentes
    const attendantCount = await prisma.attendant.count();
    console.log(`\nTotal de atendentes: ${attendantCount}`);
    
    // Verificar avaliações
    const evaluationCount = await prisma.evaluation.count();
    console.log(`Total de avaliações: ${evaluationCount}`);
    
    // Verificar se há avaliações com XP
    const evaluationsWithXp = await prisma.evaluation.findMany({
      where: {
        xpGained: {
          gt: 0
        }
      },
      take: 5
    });
    
    console.log(`\nAvaliações com XP > 0: ${evaluationsWithXp.length}`);
    evaluationsWithXp.forEach(eval => {
      console.log(`- Avaliação ID: ${eval.id}, XP: ${eval.xpGained}, Nota: ${eval.nota}`);
    });
    
  } catch (error) {
    console.error('Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkXpData();