const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAugustEvents() {
  const augustSeasonId = 'cmf64x15u0000tatc46awu9wa';
  
  console.log('📊 Verificando eventos da temporada de agosto...\n');
  
  const totalEvents = await prisma.xpEvent.count({
    where: { seasonId: augustSeasonId }
  });
  
  console.log(`Total de eventos: ${totalEvents}`);
  
  const events = await prisma.xpEvent.findMany({
    where: { seasonId: augustSeasonId },
    take: 3,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n📋 Primeiros 3 eventos:');
  events.forEach((event, i) => {
    console.log(`${i + 1}. ID: ${event.id}`);
    console.log(`   AttendantId: ${event.attendantId}`);
    console.log(`   Points: ${event.points}`);
    console.log(`   SeasonId: ${event.seasonId}`);
    console.log(`   Date: ${event.date.toISOString()}`);
    console.log();
  });
  
  // Verificar se há atendentes com XP nesta temporada
  const attendantsWithXp = await prisma.xpEvent.groupBy({
    by: ['attendantId'],
    where: { seasonId: augustSeasonId },
    _sum: { points: true },
    _count: { id: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 5
  });
  
  console.log('🏆 Top 5 atendentes com XP:');
  for (let i = 0; i < attendantsWithXp.length; i++) {
    const entry = attendantsWithXp[i];
    const attendant = await prisma.attendant.findUnique({
      where: { id: entry.attendantId }
    });
    console.log(`${i + 1}. ${attendant?.name || 'N/A'}: ${entry._sum.points || 0} XP (${entry._count.id} eventos)`);
  }
  
  await prisma.$disconnect();
}

checkAugustEvents().catch(console.error);