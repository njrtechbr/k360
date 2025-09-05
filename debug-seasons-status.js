const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSeasonsStatus() {
  console.log('🔍 Debugando status das temporadas...\n');
  
  const seasons = await prisma.gamificationSeason.findMany({
    orderBy: { startDate: 'asc' }
  });
  
  const now = new Date();
  console.log('📅 Data atual:', now.toLocaleDateString('pt-BR'));
  console.log('📊 Total de temporadas:', seasons.length);
  console.log();
  
  seasons.forEach(season => {
    const start = new Date(season.startDate);
    const end = new Date(season.endDate);
    const isActive = now >= start && now <= end;
    const isPast = now > end;
    const isFuture = now < start;
    
    let status = '';
    if (isActive) status = '🟢 ATIVA';
    else if (isPast) status = '🔴 FINALIZADA';
    else if (isFuture) status = '🟡 FUTURA';
    
    console.log(`${status} ${season.name}`);
    console.log(`   ID: ${season.id}`);
    console.log(`   Campo 'active': ${season.active}`);
    console.log(`   Período: ${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`);
    console.log(`   Multiplicador: ${season.xpMultiplier}x`);
    console.log();
  });
  
  // Verificar eventos XP por temporada
  console.log('🎯 Eventos XP por temporada:');
  for (const season of seasons) {
    const count = await prisma.xpEvent.count({
      where: { seasonId: season.id }
    });
    console.log(`   ${season.name}: ${count} eventos`);
  }
  
  await prisma.$disconnect();
}

debugSeasonsStatus().catch(console.error);