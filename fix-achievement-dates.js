const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAchievementDates() {
  console.log('📅 Corrigindo datas das conquistas...\n');
  
  try {
    // Buscar todas as conquistas desbloqueadas
    const unlockedAchievements = await prisma.unlockedAchievement.findMany({
      include: {
        attendant: { select: { name: true } }
      },
      orderBy: { attendantId: 'asc' }
    });
    
    console.log(`🔍 Processando ${unlockedAchievements.length} conquistas...\n`);
    
    let correctedCount = 0;
    
    for (const unlock of unlockedAchievements) {
      console.log(`📋 ${unlock.attendant.name} - ${unlock.achievementId}`);
      
      try {
        const correctDate = await calculateCorrectAchievementDate(unlock.attendantId, unlock.achievementId);
        
        if (correctDate) {
          // Atualizar a data da conquista
          await prisma.unlockedAchievement.update({
            where: { id: unlock.id },
            data: { unlockedAt: correctDate }
          });
          
          // Atualizar também o evento XP relacionado
          const xpEvent = await prisma.xpEvent.findFirst({
            where: {
              attendantId: unlock.attendantId,
              type: 'ACHIEVEMENT',
              relatedId: unlock.id
            }
          });
          
          if (xpEvent) {
            await prisma.xpEvent.update({
              where: { id: xpEvent.id },
              data: { 
                date: correctDate,
                createdAt: correctDate
              }
            });
          }
          
          console.log(`   ✅ Corrigida para: ${correctDate.toLocaleDateString('pt-BR')}`);
          correctedCount++;
        } else {
          console.log(`   ⚠️ Não foi possível calcular data correta`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
    }
    
    console.log(`\n📊 RESUMO:`);
    console.log(`✅ Conquistas corrigidas: ${correctedCount}`);
    console.log(`📅 Todas as datas agora refletem quando foram realmente conquistadas`);
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function calculateCorrectAchievementDate(attendantId, achievementId) {
  try {
    switch (achievementId) {
      // Conquistas de Avaliações - baseadas na N-ésima avaliação
      case 'first_evaluation':
        return await getNthEvaluationDate(attendantId, 1);
      case 'ten_evaluations':
        return await getNthEvaluationDate(attendantId, 10);
      case 'fifty_evaluations':
        return await getNthEvaluationDate(attendantId, 50);
      case 'hundred_evaluations':
        return await getNthEvaluationDate(attendantId, 100);
      
      // Conquistas de XP - baseadas no momento que atingiu o XP
      case 'hundred_xp':
        return await getXpMilestoneDate(attendantId, 100);
      case 'thousand_xp':
        return await getXpMilestoneDate(attendantId, 1000);
      case 'five_thousand_xp':
        return await getXpMilestoneDate(attendantId, 5000);
      case 'ten_thousand_xp':
        return await getXpMilestoneDate(attendantId, 10000);
      
      // Conquistas de Qualidade - baseadas na última avaliação da sequência
      case 'five_star_streak_5':
        return await getFiveStarStreakDate(attendantId, 5);
      case 'five_star_streak_10':
        return await getFiveStarStreakDate(attendantId, 10);
      case 'high_average_50':
        return await getNthEvaluationDate(attendantId, 50); // Data da 50ª avaliação
      
      default:
        return null;
    }
  } catch (error) {
    console.error(`Erro ao calcular data para ${achievementId}:`, error);
    return null;
  }
}

async function getNthEvaluationDate(attendantId, n) {
  const evaluations = await prisma.evaluation.findMany({
    where: { attendantId },
    orderBy: { data: 'asc' },
    take: n,
    select: { data: true }
  });
  
  if (evaluations.length >= n) {
    return evaluations[n - 1].data; // N-ésima avaliação (índice n-1)
  }
  
  return null;
}

async function getXpMilestoneDate(attendantId, targetXp) {
  const xpEvents = await prisma.xpEvent.findMany({
    where: { 
      attendantId,
      type: { not: 'ACHIEVEMENT' } // Excluir XP de conquistas para evitar recursão
    },
    orderBy: { date: 'asc' },
    select: { points: true, date: true }
  });
  
  let accumulatedXp = 0;
  
  for (const event of xpEvents) {
    accumulatedXp += event.points || 0;
    
    if (accumulatedXp >= targetXp) {
      return event.date;
    }
  }
  
  return null;
}

async function getFiveStarStreakDate(attendantId, requiredStreak) {
  const evaluations = await prisma.evaluation.findMany({
    where: { attendantId },
    orderBy: { data: 'asc' },
    select: { nota: true, data: true }
  });
  
  let currentStreak = 0;
  
  for (const evaluation of evaluations) {
    if (evaluation.nota === 5) {
      currentStreak++;
      
      if (currentStreak >= requiredStreak) {
        return evaluation.data; // Data da avaliação que completou a sequência
      }
    } else {
      currentStreak = 0; // Reset da sequência
    }
  }
  
  return null;
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  fixAchievementDates().catch(console.error);
}

module.exports = { fixAchievementDates };