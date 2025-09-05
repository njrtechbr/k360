const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupAchievements() {
  console.log('🏆 Configurando sistema de conquistas...\n');
  
  const achievements = [
    // Conquistas de Avaliações
    {
      id: 'first_evaluation',
      title: 'Primeira Impressão',
      description: 'Receba sua primeira avaliação',
      xp: 50,
      icon: '🌟',
      color: '#10B981'
    },
    {
      id: 'ten_evaluations',
      title: 'Veterano',
      description: 'Receba 10 avaliações',
      xp: 100,
      icon: '🎖️',
      color: '#3B82F6'
    },
    {
      id: 'fifty_evaluations',
      title: 'Experiente',
      description: 'Receba 50 avaliações',
      xp: 250,
      icon: '🏅',
      color: '#8B5CF6'
    },
    {
      id: 'hundred_evaluations',
      title: 'Centurião',
      description: 'Receba 100 avaliações',
      xp: 500,
      icon: '🏆',
      color: '#F59E0B'
    },
    
    // Conquistas de XP
    {
      id: 'hundred_xp',
      title: 'Primeiros Passos',
      description: 'Acumule 100 XP',
      xp: 25,
      icon: '⭐',
      color: '#10B981'
    },
    {
      id: 'thousand_xp',
      title: 'Milionário de XP',
      description: 'Acumule 1.000 XP',
      xp: 100,
      icon: '💎',
      color: '#3B82F6'
    },
    {
      id: 'five_thousand_xp',
      title: 'Lenda Viva',
      description: 'Acumule 5.000 XP',
      xp: 250,
      icon: '👑',
      color: '#8B5CF6'
    },
    {
      id: 'ten_thousand_xp',
      title: 'Mestre Supremo',
      description: 'Acumule 10.000 XP',
      xp: 500,
      icon: '🔥',
      color: '#EF4444'
    },
    
    // Conquistas de Qualidade
    {
      id: 'five_star_streak_5',
      title: 'Sequência Dourada',
      description: 'Receba 5 avaliações 5 estrelas consecutivas',
      xp: 200,
      icon: '✨',
      color: '#F59E0B'
    },
    {
      id: 'five_star_streak_10',
      title: 'Perfeição Absoluta',
      description: 'Receba 10 avaliações 5 estrelas consecutivas',
      xp: 500,
      icon: '🌟',
      color: '#EF4444'
    },
    {
      id: 'high_average_50',
      title: 'Excelência Consistente',
      description: 'Mantenha média 4.5+ com pelo menos 50 avaliações',
      xp: 300,
      icon: '📈',
      color: '#8B5CF6'
    },
    
    // Conquistas Temporais
    {
      id: 'monthly_champion',
      title: 'Campeão do Mês',
      description: 'Seja o #1 do ranking mensal',
      xp: 1000,
      icon: '🥇',
      color: '#F59E0B'
    },
    {
      id: 'season_winner',
      title: 'Vencedor da Temporada',
      description: 'Termine em 1º lugar em uma temporada',
      xp: 2000,
      icon: '👑',
      color: '#EF4444'
    }
  ];
  
  console.log('📝 Criando conquistas...');
  
  for (const achievement of achievements) {
    try {
      await prisma.achievementConfig.upsert({
        where: { id: achievement.id },
        update: achievement,
        create: achievement
      });
      console.log(`   ✅ ${achievement.title}`);
    } catch (error) {
      console.log(`   ❌ Erro ao criar ${achievement.title}:`, error.message);
    }
  }
  
  console.log(`\n🎯 Total de conquistas configuradas: ${achievements.length}`);
  
  await prisma.$disconnect();
}

setupAchievements().catch(console.error);