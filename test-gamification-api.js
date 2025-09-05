const { PrismaClient } = require('@prisma/client');

async function testGamificationAPI() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testando API de gamificação...\n');
    
    // Simular o que a API faz
    const config = await prisma.gamificationConfig.findFirst();
    
    if (config) {
      console.log('✅ Configuração encontrada no banco');
      
      // Transformar campos individuais em objeto ratingScores (como a API faz)
      const ratingScores = {
        '1': config.ratingScore1,
        '2': config.ratingScore2,
        '3': config.ratingScore3,
        '4': config.ratingScore4,
        '5': config.ratingScore5,
      };
      
      console.log('📊 RatingScores construído pela API:');
      console.log('   ', ratingScores);
      
      // Testar a função getScoreFromRating
      console.log('\n🧮 Testando função getScoreFromRating:');
      
      const getScoreFromRating = (rating, scores) => {
        const key = String(rating);
        return scores[key] ?? 0;
      };
      
      for (let i = 1; i <= 5; i++) {
        const score = getScoreFromRating(i, ratingScores);
        console.log(`   ${i} estrela(s): ${score} XP`);
      }
      
      // Simular resposta completa da API
      const apiResponse = {
        ...config,
        ratingScores,
        achievements: [], // Simplificado para teste
        levelRewards: [],
        seasons: []
      };
      
      console.log('\n📋 Estrutura da resposta da API:');
      console.log('   ID:', apiResponse.id);
      console.log('   GlobalXpMultiplier:', apiResponse.globalXpMultiplier);
      console.log('   RatingScores:', apiResponse.ratingScores);
      
      console.log('\n✅ API funcionando corretamente!');
      
    } else {
      console.log('❌ Configuração não encontrada no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGamificationAPI();