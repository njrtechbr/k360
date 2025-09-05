const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAchievements() {
  console.log('🏆 Verificando conquistas configuradas...\n');
  
  const achievements = await prisma.achievementConfig.findMany({
    where: { active: true },
    orderBy: { id: 'asc' }
  });
  
  console.log('📊 Total de conquistas ativas:', achievements.length);
  achievements.forEach(achievement => {
    console.log(`   🎯 ${achievement.id}: ${achievement.title} (+${achievement.xp} XP)`);
    console.log(`      ${achievement.description}`);
    console.log();
  });
  
  // Verificar conquistas já desbloqueadas
  const unlockedCount = await prisma.unlockedAchievement.count();
  console.log(`🔓 Conquistas já desbloqueadas: ${unlockedCount}`);
  
  if (unlockedCount > 0) {
    const unlockedSample = await prisma.unlockedAchievement.findMany({
      take: 5,
      include: {
        attendant: { select: { name: true } }
      },
      orderBy: { unlockedAt: 'desc' }
    });
    
    console.log('\n📋 Últimas conquistas desbloqueadas:');
    unlockedSample.forEach(unlock => {
      console.log(`   ${unlock.attendant.name}: ${unlock.achievementId} (+${unlock.xpGained || 0} XP)`);
    });
  }
  
  await prisma.$disconnect();
}

checkAchievements().catch(console.error);