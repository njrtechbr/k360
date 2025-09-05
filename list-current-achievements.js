const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCurrentAchievements() {
  console.log('🏆 Conquistas configuradas no banco de dados:\n');
  
  const achievements = await prisma.achievementConfig.findMany({
    orderBy: { xp: 'asc' }
  });
  
  console.log(`📊 Total de conquistas: ${achievements.length}`);
  console.log('='.repeat(80));
  
  achievements.forEach((achievement, index) => {
    console.log(`${index + 1}. ${achievement.icon} ${achievement.title}`);
    console.log(`   Descrição: ${achievement.description}`);
    console.log(`   XP: +${achievement.xp}`);
    console.log(`   Status: ${achievement.active ? '✅ Ativo' : '❌ Inativo'}`);
    console.log(`   ID: ${achievement.id}`);
    console.log();
  });
  
  // Comparar com as conquistas da interface
  console.log('\n🔍 COMPARAÇÃO COM A INTERFACE:');
  console.log('='.repeat(80));
  
  const interfaceAchievements = [
    { title: 'Primeira Impressão', xp: 10, description: 'Receba sua primeira avaliação' },
    { title: 'Feedback Positivo (IA)', xp: 25, description: 'Receba um comentário analisado como \'Positivo\' pela IA.' },
    { title: 'Ganhando Ritmo', xp: 50, description: 'Receba 10 avaliações' },
    { title: 'Ouvinte Atento (IA)', xp: 75, description: 'Receba um comentário \'Negativo\', mostrando abertura a críticas.' },
    { title: 'Trinca Perfeita', xp: 100, description: 'Receba 3 avaliações de 5 estrelas consecutivas' },
    { title: 'Veterano', xp: 150, description: 'Receba 50 avaliações' },
    { title: 'Querido pela Crítica (IA)', xp: 200, description: 'Receba 10 comentários \'Positivos\' pela IA.' },
    { title: 'Centurião', xp: 300, description: 'Receba 100 avaliações' },
    { title: 'Satisfação Garantida', xp: 500, description: 'Atingir 90% de avaliações positivas (4-5 estrelas)' },
    { title: 'Mestre da Resiliência (IA)', xp: 500, description: 'Receba 5 comentários \'Negativos\' e continue melhorando.' },
    { title: 'Excelência Consistente', xp: 750, description: 'Manter nota média acima de 4.5 com 50+ avaliações' },
    { title: 'Imparável', xp: 1000, description: 'Receba 250 avaliações' },
    { title: 'Mestre da Qualidade', xp: 1200, description: 'Receba 50 avaliações de 5 estrelas' },
    { title: 'Busca pela Perfeição', xp: 1500, description: 'Mantenha nota média 5.0 com pelo menos 25 avaliações' },
    { title: 'Lenda do Atendimento', xp: 2500, description: 'Receba 500 avaliações' }
  ];
  
  console.log('📋 Conquistas que deveriam aparecer na interface:');
  interfaceAchievements.forEach((item, index) => {
    const dbMatch = achievements.find(a => a.title === item.title);
    const status = dbMatch ? '✅ Existe no DB' : '❌ Não existe no DB';
    console.log(`${index + 1}. ${item.title} (+${item.xp} XP) - ${status}`);
  });
  
  console.log('\n📋 Conquistas no DB que não estão na interface:');
  achievements.forEach(dbAchievement => {
    const interfaceMatch = interfaceAchievements.find(i => i.title === dbAchievement.title);
    if (!interfaceMatch) {
      console.log(`❗ ${dbAchievement.title} (+${dbAchievement.xp} XP) - Só existe no DB`);
    }
  });
  
  await prisma.$disconnect();
}

listCurrentAchievements().catch(console.error);