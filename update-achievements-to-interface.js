const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAchievementsToInterface() {
  console.log('🏆 Atualizando conquistas para corresponder à interface...\n');
  
  // Conquistas que deveriam aparecer na interface
  const interfaceAchievements = [
    {
      id: 'first_evaluation',
      title: 'Primeira Impressão',
      description: 'Receba sua primeira avaliação',
      xp: 10,
      icon: '🌟',
      color: '#10B981'
    },
    {
      id: 'feedback_positive_ai',
      title: 'Feedback Positivo (IA)',
      description: 'Receba um comentário analisado como \'Positivo\' pela IA.',
      xp: 25,
      icon: '🤖',
      color: '#3B82F6'
    },
    {
      id: 'ten_evaluations',
      title: 'Ganhando Ritmo',
      description: 'Receba 10 avaliações',
      xp: 50,
      icon: '⚡',
      color: '#8B5CF6'
    },
    {
      id: 'negative_feedback_ai',
      title: 'Ouvinte Atento (IA)',
      description: 'Receba um comentário \'Negativo\', mostrando abertura a críticas.',
      xp: 75,
      icon: '👂',
      color: '#F59E0B'
    },
    {
      id: 'three_star_streak',
      title: 'Trinca Perfeita',
      description: 'Receba 3 avaliações de 5 estrelas consecutivas',
      xp: 100,
      icon: '⭐',
      color: '#EF4444'
    },
    {
      id: 'fifty_evaluations',
      title: 'Veterano',
      description: 'Receba 50 avaliações',
      xp: 150,
      icon: '🎖️',
      color: '#3B82F6'
    },
    {
      id: 'ten_positive_ai',
      title: 'Querido pela Crítica (IA)',
      description: 'Receba 10 comentários \'Positivos\' pela IA.',
      xp: 200,
      icon: '💝',
      color: '#8B5CF6'
    },
    {
      id: 'hundred_evaluations',
      title: 'Centurião',
      description: 'Receba 100 avaliações',
      xp: 300,
      icon: '🏆',
      color: '#F59E0B'
    },
    {
      id: 'satisfaction_guaranteed',
      title: 'Satisfação Garantida',
      description: 'Atingir 90% de avaliações positivas (4-5 estrelas)',
      xp: 500,
      icon: '✅',
      color: '#10B981'
    },
    {
      id: 'resilience_master_ai',
      title: 'Mestre da Resiliência (IA)',
      description: 'Receba 5 comentários \'Negativos\' e continue melhorando.',
      xp: 500,
      icon: '💪',
      color: '#EF4444'
    },
    {
      id: 'high_average_50',
      title: 'Excelência Consistente',
      description: 'Manter nota média acima de 4.5 com 50+ avaliações',
      xp: 750,
      icon: '📈',
      color: '#8B5CF6'
    },
    {
      id: 'unstoppable',
      title: 'Imparável',
      description: 'Receba 250 avaliações',
      xp: 1000,
      icon: '🚀',
      color: '#EF4444'
    },
    {
      id: 'quality_master',
      title: 'Mestre da Qualidade',
      description: 'Receba 50 avaliações de 5 estrelas',
      xp: 1200,
      icon: '👑',
      color: '#F59E0B'
    },
    {
      id: 'perfection_seeker',
      title: 'Busca pela Perfeição',
      description: 'Mantenha nota média 5.0 com pelo menos 25 avaliações',
      xp: 1500,
      icon: '💎',
      color: '#8B5CF6'
    },
    {
      id: 'service_legend',
      title: 'Lenda do Atendimento',
      description: 'Receba 500 avaliações',
      xp: 2500,
      icon: '🌟',
      color: '#EF4444'
    }
  ];
  
  console.log('📝 Limpando conquistas antigas...');
  
  // Primeiro, vamos desativar todas as conquistas existentes
  await prisma.achievementConfig.updateMany({
    data: { active: false }
  });
  
  console.log('✅ Conquistas antigas desativadas');
  
  console.log('\n📝 Criando/atualizando conquistas da interface...');
  
  let created = 0;
  let updated = 0;
  
  for (const achievement of interfaceAchievements) {
    try {
      const result = await prisma.achievementConfig.upsert({
        where: { id: achievement.id },
        update: {
          ...achievement,
          active: true
        },
        create: {
          ...achievement,
          active: true
        }
      });
      
      const existing = await prisma.achievementConfig.findUnique({
        where: { id: achievement.id }
      });
      
      if (existing && existing.createdAt < new Date()) {
        updated++;
        console.log(`   ✏️ Atualizado: ${achievement.title}`);
      } else {
        created++;
        console.log(`   ✅ Criado: ${achievement.title}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao processar ${achievement.title}:`, error.message);
    }
  }
  
  console.log(`\n📊 RESUMO:`);
  console.log(`   ✅ Conquistas criadas: ${created}`);
  console.log(`   ✏️ Conquistas atualizadas: ${updated}`);
  console.log(`   🎯 Total de conquistas ativas: ${interfaceAchievements.length}`);
  
  // Verificar conquistas finais
  const finalAchievements = await prisma.achievementConfig.findMany({
    where: { active: true },
    orderBy: { xp: 'asc' }
  });
  
  console.log(`\n🏆 Conquistas ativas no banco:`);
  finalAchievements.forEach((achievement, index) => {
    console.log(`   ${index + 1}. ${achievement.icon} ${achievement.title} (+${achievement.xp} XP)`);
  });
  
  await prisma.$disconnect();
}

updateAchievementsToInterface().catch(console.error);