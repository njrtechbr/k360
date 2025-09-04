const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Conquistas iniciais
const INITIAL_ACHIEVEMENTS = [
  {
    id: 'primeira-impressao',
    title: 'Primeira Impressão',
    description: 'Receba sua primeira avaliação',
    xp: 50,
    active: true,
    icon: 'Star',
    color: '#10B981'
  },
  {
    id: 'ganhando-ritmo',
    title: 'Ganhando Ritmo',
    description: 'Receba 10 avaliações',
    xp: 100,
    active: true,
    icon: 'TrendingUp',
    color: '#3B82F6'
  },
  {
    id: 'veterano',
    title: 'Veterano',
    description: 'Receba 50 avaliações',
    xp: 200,
    active: true,
    icon: 'Shield',
    color: '#8B5CF6'
  },
  {
    id: 'centuriao',
    title: 'Centurião',
    description: 'Receba 100 avaliações',
    xp: 300,
    active: true,
    icon: 'Crown',
    color: '#F59E0B'
  },
  {
    id: 'imparavel',
    title: 'Imparável',
    description: 'Receba 250 avaliações',
    xp: 500,
    active: true,
    icon: 'Zap',
    color: '#EF4444'
  },
  {
    id: 'lenda',
    title: 'Lenda',
    description: 'Receba 500 avaliações',
    xp: 1000,
    active: true,
    icon: 'Trophy',
    color: '#DC2626'
  },
  {
    id: 'trinca-perfeita',
    title: 'Trinca Perfeita',
    description: 'Receba 3 avaliações de 5 estrelas consecutivas',
    xp: 150,
    active: true,
    icon: 'Target',
    color: '#059669'
  },
  {
    id: 'mestre-qualidade',
    title: 'Mestre da Qualidade',
    description: 'Receba 50 avaliações de 5 estrelas',
    xp: 400,
    active: true,
    icon: 'Award',
    color: '#7C3AED'
  },
  {
    id: 'satisfacao-garantida',
    title: 'Satisfação Garantida',
    description: 'Mantenha 90% de avaliações positivas (4-5 estrelas) com pelo menos 10 avaliações',
    xp: 300,
    active: true,
    icon: 'Heart',
    color: '#EC4899'
  },
  {
    id: 'excelencia',
    title: 'Excelência',
    description: 'Mantenha média acima de 4.5 com pelo menos 50 avaliações',
    xp: 600,
    active: true,
    icon: 'Gem',
    color: '#6366F1'
  },
  {
    id: 'perfeicao',
    title: 'Perfeição',
    description: 'Mantenha média 5.0 com pelo menos 25 avaliações',
    xp: 800,
    active: true,
    icon: 'Sparkles',
    color: '#F97316'
  }
];

// Recompensas de nível
const INITIAL_LEVEL_REWARDS = [
  {
    level: 1,
    title: 'Novato',
    description: 'Bem-vindo ao sistema!',
    active: true,
    icon: 'User',
    color: '#6B7280'
  },
  {
    level: 5,
    title: 'Aprendiz',
    description: 'Você está pegando o jeito!',
    active: true,
    icon: 'BookOpen',
    color: '#10B981'
  },
  {
    level: 10,
    title: 'Competente',
    description: 'Mostrando suas habilidades!',
    active: true,
    icon: 'CheckCircle',
    color: '#3B82F6'
  },
  {
    level: 20,
    title: 'Experiente',
    description: 'Um profissional de verdade!',
    active: true,
    icon: 'Star',
    color: '#8B5CF6'
  },
  {
    level: 35,
    title: 'Especialista',
    description: 'Conhecimento excepcional!',
    active: true,
    icon: 'Award',
    color: '#F59E0B'
  },
  {
    level: 50,
    title: 'Mestre',
    description: 'Domínio completo da arte!',
    active: true,
    icon: 'Crown',
    color: '#EF4444'
  },
  {
    level: 75,
    title: 'Lenda',
    description: 'Seu nome será lembrado!',
    active: true,
    icon: 'Trophy',
    color: '#DC2626'
  },
  {
    level: 100,
    title: 'Imortal',
    description: 'Você transcendeu os limites!',
    active: true,
    icon: 'Sparkles',
    color: '#7C2D12'
  }
];

async function restoreAchievements() {
  console.log('🔄 Restaurando configurações de conquistas e níveis...\n');

  try {
    // Criar configurações de conquistas
    console.log('🏆 Criando configurações de conquistas...');
    for (const achievement of INITIAL_ACHIEVEMENTS) {
      await prisma.achievementConfig.upsert({
        where: { id: achievement.id },
        update: {},
        create: achievement
      });
      console.log(`✅ Conquista: ${achievement.title}`);
    }

    // Criar configurações de níveis
    console.log('\n🎯 Criando configurações de níveis...');
    for (const levelReward of INITIAL_LEVEL_REWARDS) {
      await prisma.levelTrackConfig.upsert({
        where: { level: levelReward.level },
        update: {},
        create: levelReward
      });
      console.log(`✅ Nível ${levelReward.level}: ${levelReward.title}`);
    }

    console.log('\n🎉 Configurações restauradas com sucesso!');
    
    // Verificar resultado
    const achievementCount = await prisma.achievementConfig.count();
    const levelCount = await prisma.levelTrackConfig.count();
    
    console.log(`\n📊 Resultado:`);
    console.log(`   - ${achievementCount} configurações de conquistas`);
    console.log(`   - ${levelCount} configurações de níveis`);

  } catch (error) {
    console.error('❌ Erro ao restaurar configurações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreAchievements();