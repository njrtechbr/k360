const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConfigData() {
  console.log('🔍 Verificando dados de configuração...\n');

  try {
    // Verificar módulos
    const modules = await prisma.module.findMany();
    console.log(`📦 Módulos: ${modules.length} encontrados`);
    modules.forEach(m => console.log(`   - ${m.name} (${m.id})`));

    // Verificar funções
    const funcoes = await prisma.funcao.findMany();
    console.log(`\n👥 Funções: ${funcoes.length} encontradas`);
    funcoes.forEach(f => console.log(`   - ${f.name}`));

    // Verificar setores
    const setores = await prisma.setor.findMany();
    console.log(`\n🏢 Setores: ${setores.length} encontrados`);
    setores.forEach(s => console.log(`   - ${s.name}`));

    // Verificar configuração de gamificação
    const gamificationConfig = await prisma.gamificationConfig.findUnique({
      where: { id: 'main' }
    });
    console.log(`\n🎮 Configuração de Gamificação: ${gamificationConfig ? 'EXISTE' : 'NÃO EXISTE'}`);
    if (gamificationConfig) {
      console.log(`   - Pontuação 1★: ${gamificationConfig.ratingScore1}`);
      console.log(`   - Pontuação 2★: ${gamificationConfig.ratingScore2}`);
      console.log(`   - Pontuação 3★: ${gamificationConfig.ratingScore3}`);
      console.log(`   - Pontuação 4★: ${gamificationConfig.ratingScore4}`);
      console.log(`   - Pontuação 5★: ${gamificationConfig.ratingScore5}`);
      console.log(`   - Multiplicador Global: ${gamificationConfig.globalXpMultiplier}`);
    }

    // Verificar configurações de conquistas
    const achievementConfigs = await prisma.achievementConfig.findMany();
    console.log(`\n🏆 Configurações de Conquistas: ${achievementConfigs.length} encontradas`);
    achievementConfigs.forEach(a => console.log(`   - ${a.title} (${a.xp} XP)`));

    // Verificar configurações de níveis
    const levelConfigs = await prisma.levelTrackConfig.findMany();
    console.log(`\n🎯 Configurações de Níveis: ${levelConfigs.length} encontradas`);
    levelConfigs.forEach(l => console.log(`   - Nível ${l.level}: ${l.title}`));

    // Verificar temporadas
    const seasons = await prisma.gamificationSeason.findMany();
    console.log(`\n⏰ Temporadas: ${seasons.length} encontradas`);
    seasons.forEach(s => console.log(`   - ${s.name} (${s.active ? 'ATIVA' : 'INATIVA'})`));

    // Verificar dados principais (que foram deletados)
    const attendants = await prisma.attendant.findMany();
    const evaluations = await prisma.evaluation.findMany();
    const xpEvents = await prisma.xpEvent.findMany();
    const unlockedAchievements = await prisma.unlockedAchievement.findMany();

    console.log(`\n📊 DADOS PRINCIPAIS:`);
    console.log(`   - Atendentes: ${attendants.length}`);
    console.log(`   - Avaliações: ${evaluations.length}`);
    console.log(`   - Eventos XP: ${xpEvents.length}`);
    console.log(`   - Conquistas Desbloqueadas: ${unlockedAchievements.length}`);

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfigData();