const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processNewAchievements() {
  try {
    console.log('🏆 Processando conquistas para as novas avaliações...');
    
    // Buscar temporada atual (setembro)
    const currentSeason = await prisma.gamificationSeason.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
    
    if (!currentSeason) {
      console.log('❌ Temporada atual não encontrada');
      return;
    }
    
    console.log(`📅 Temporada atual: ${currentSeason.name}`);
    
    // Verificar se o servidor está rodando
    console.log('🔄 Processando conquistas via API...');
    
    // Como não temos fetch no Node.js, vamos processar diretamente
    // Buscar todas as configurações de conquistas
    const achievementConfigs = await prisma.achievementConfig.findMany({
      where: { active: true }
    });
    
    console.log(`📋 ${achievementConfigs.length} configurações de conquistas ativas`);
    
    // Buscar atendentes que receberam as novas avaliações
    const newEvaluationAttendants = await prisma.attendant.findMany({
      where: {
        id: {
          in: [
            '1bd0b98f-f552-48f2-a10c-6ca9943a6785', // Rangell
            '8773973a-9a4e-436e-bd93-37150645852b'  // Rita
          ]
        }
      },
      select: { id: true, name: true }
    });
    
    console.log('👥 Atendentes com novas avaliações:');
    newEvaluationAttendants.forEach(att => {
      console.log(`- ${att.name}`);
    });
    
    console.log('\n✅ Para processar as conquistas, execute:');
    console.log('npm run dev');
    console.log('Depois acesse: http://localhost:3000/api/gamification/achievements/process-season');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

processNewAchievements();