const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAttendants() {
  try {
    const attendants = await prisma.attendant.findMany();
    console.log('Atendentes encontrados:', attendants.length);
    
    if (attendants.length > 0) {
      console.log('Primeiro atendente:', attendants[0].name, attendants[0].status);
      
      // Verificar XP events
      const xpEvents = await prisma.xpEvent.findMany({
        where: { attendantId: attendants[0].id }
      });
      console.log('XP Events para primeiro atendente:', xpEvents.length);
      
      // Verificar XP grants
      const xpGrants = await prisma.xpGrant.findMany({
        where: { attendantId: attendants[0].id }
      });
      console.log('XP Grants para primeiro atendente:', xpGrants.length);
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendants();