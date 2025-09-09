const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRecentActivities() {
  try {
    console.log('🔍 Testando conexão com o banco...');
    
    // Teste básico de conexão
    const userCount = await prisma.user.count();
    console.log(`✅ Conexão OK - ${userCount} usuários encontrados`);
    
    console.log('\n🔍 Testando consultas individuais...');
    
    // Testar avaliações recentes
    try {
      const recentEvaluations = await prisma.evaluation.findMany({
        take: 5,
        orderBy: { data: 'desc' },
        include: {
          attendant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });
      console.log(`✅ Avaliações recentes: ${recentEvaluations.length} encontradas`);
    } catch (error) {
      console.error('❌ Erro nas avaliações:', error.message);
    }
    
    // Testar conquistas recentes
    try {
      const recentAchievements = await prisma.unlockedAchievement.findMany({
        take: 5,
        orderBy: { unlockedAt: 'desc' },
        include: {
          attendant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });
      console.log(`✅ Conquistas recentes: ${recentAchievements.length} encontradas`);
      
      if (recentAchievements.length > 0) {
        const achievementIds = recentAchievements.map(ua => ua.achievementId);
        const achievementConfigs = await prisma.achievementConfig.findMany({
          where: { id: { in: achievementIds } },
          select: { id: true, title: true, xp: true }
        });
        console.log(`✅ Configs de conquistas: ${achievementConfigs.length} encontradas`);
      }
    } catch (error) {
      console.error('❌ Erro nas conquistas:', error.message);
    }
    
    // Testar eventos XP recentes
    try {
      const recentXpEvents = await prisma.xpEvent.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        where: {
          type: 'manual'
        },
        include: {
          attendant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });
      console.log(`✅ Eventos XP recentes: ${recentXpEvents.length} encontrados`);
    } catch (error) {
      console.error('❌ Erro nos eventos XP:', error.message);
    }
    
    // Testar atendentes recentes
    try {
      const { subDays } = require('date-fns');
      const recentAttendants = await prisma.attendant.findMany({
        take: 5,
        orderBy: { dataAdmissao: 'desc' },
        where: {
          dataAdmissao: {
            gte: subDays(new Date(), 30)
          }
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          dataAdmissao: true
        }
      });
      console.log(`✅ Atendentes recentes: ${recentAttendants.length} encontrados`);
    } catch (error) {
      console.error('❌ Erro nos atendentes:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRecentActivities();