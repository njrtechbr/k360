const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAchievementIds() {
  try {
    console.log('🔍 Verificando IDs das conquistas...\n');
    
    const achievements = await prisma.achievementConfig.findMany({
      where: { active: true },
      orderBy: { title: 'asc' }
    });
    
    console.log('🏆 Conquistas ativas e seus IDs:');
    achievements.forEach(achievement => {
      console.log(`- ${achievement.title}: "${achievement.id}"`);
    });
    
    console.log('\n🔧 IDs usados no código da interface:');
    const codeIds = [
      'first_evaluation',
      'ten_evaluations', 
      'fifty_evaluations',
      'hundred_evaluations',
      'hundred_xp',
      'thousand_xp',
      'five_thousand_xp',
      'ten_thousand_xp',
      'five_star_streak_5',
      'five_star_streak_10',
      'high_average_50'
    ];
    
    codeIds.forEach(id => {
      const match = achievements.find(a => a.id === id);
      if (match) {
        console.log(`✅ ${id} -> ${match.title}`);
      } else {
        console.log(`❌ ${id} -> NÃO ENCONTRADO`);
      }
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAchievementIds();