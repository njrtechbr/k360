const { PrismaClient } = require('@prisma/client');

async function checkSeasons() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗓️ Verificando temporadas de gamificação...\n');
    
    // 1. Verificar temporadas
    console.log('1️⃣ TEMPORADAS CONFIGURADAS:');
    console.log('=' .repeat(50));
    
    const seasons = await prisma.gamificationSeason.findMany({
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`📊 Total de temporadas: ${seasons.length}`);
    
    if (seasons.length === 0) {
      console.log('⚠️  Nenhuma temporada encontrada!');
      console.log('💡 Configure temporadas através do painel de gamificação\n');
      return;
    }
    
    const now = new Date();
    let activeSeason = null;
    let nextSeason = null;
    
    seasons.forEach((season, index) => {
      const start = season.startDate.toLocaleDateString('pt-BR');
      const end = season.endDate.toLocaleDateString('pt-BR');
      const isActive = season.active && now >= season.startDate && now <= season.endDate;
      const isPast = now > season.endDate;
      const isFuture = now < season.startDate;
      
      let status = '';
      if (isActive) {
        status = '🟢 ATIVA';
        activeSeason = season;
      } else if (isPast) {
        status = '🔴 FINALIZADA';
      } else if (isFuture) {
        status = '🟡 FUTURA';
        if (!nextSeason || season.startDate < nextSeason.startDate) {
          nextSeason = season;
        }
      } else {
        status = '⚪ INATIVA';
      }
      
      console.log(`   ${index + 1}. ${season.name}`);
      console.log(`      Status: ${status}`);
      console.log(`      Período: ${start} a ${end}`);
      console.log(`      Multiplicador: ${season.xpMultiplier}x`);
      console.log(`      Configurada como ativa: ${season.active ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
    // 2. Verificar eventos XP por temporada
    console.log('2️⃣ EVENTOS XP POR TEMPORADA:');
    console.log('=' .repeat(50));
    
    for (const season of seasons) {
      const xpEvents = await prisma.xpEvent.findMany({
        where: { seasonId: season.id },
        select: {
          id: true,
          points: true,
          attendantId: true,
          date: true
        }
      });
      
      const totalXp = xpEvents.reduce((sum, event) => sum + (event.points || 0), 0);
      const uniqueAttendants = new Set(xpEvents.map(e => e.attendantId)).size;
      
      console.log(`📅 ${season.name}:`);
      console.log(`   Eventos: ${xpEvents.length}`);
      console.log(`   XP Total: ${totalXp.toLocaleString()}`);
      console.log(`   Atendentes participantes: ${uniqueAttendants}`);
      console.log('');
    }
    
    // 3. Verificar temporada ativa
    console.log('3️⃣ TEMPORADA ATIVA:');
    console.log('=' .repeat(50));
    
    if (activeSeason) {
      console.log(`✅ Temporada ativa: ${activeSeason.name}`);
      console.log(`📅 Período: ${activeSeason.startDate.toLocaleDateString('pt-BR')} a ${activeSeason.endDate.toLocaleDateString('pt-BR')}`);
      console.log(`🔢 Multiplicador: ${activeSeason.xpMultiplier}x`);
      
      // Leaderboard da temporada ativa
      const leaderboard = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        where: { seasonId: activeSeason.id },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 10
      });
      
      if (leaderboard.length > 0) {
        console.log('\n🏆 Top 10 Leaderboard:');
        for (let i = 0; i < leaderboard.length; i++) {
          const entry = leaderboard[i];
          const attendant = await prisma.attendant.findUnique({
            where: { id: entry.attendantId },
            select: { name: true, setor: true }
          });
          
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
          console.log(`   ${medal} ${attendant?.name || 'N/A'} (${attendant?.setor || 'N/A'}): ${entry._sum.points || 0} XP`);
        }
      } else {
        console.log('\n⚠️  Nenhum evento XP na temporada ativa');
      }
    } else {
      console.log('❌ Nenhuma temporada ativa no momento');
      
      if (nextSeason) {
        console.log(`🔜 Próxima temporada: ${nextSeason.name}`);
        console.log(`📅 Início: ${nextSeason.startDate.toLocaleDateString('pt-BR')}`);
      }
    }
    
    // 4. Verificar integridade
    console.log('\n4️⃣ VERIFICAÇÃO DE INTEGRIDADE:');
    console.log('=' .repeat(50));
    
    // Eventos XP órfãos (sem temporada)
    const orphanedXpEvents = await prisma.xpEvent.findMany({
      where: { seasonId: null },
      select: { id: true, attendantId: true, points: true, date: true }
    });
    
    if (orphanedXpEvents.length > 0) {
      console.log(`⚠️  ${orphanedXpEvents.length} evento(s) XP sem temporada:`);
      orphanedXpEvents.slice(0, 5).forEach(event => {
        console.log(`   - ID: ${event.id}, XP: ${event.points}, Data: ${event.date.toLocaleDateString('pt-BR')}`);
      });
      if (orphanedXpEvents.length > 5) {
        console.log(`   ... e mais ${orphanedXpEvents.length - 5} eventos`);
      }
    } else {
      console.log('✅ Todos os eventos XP têm temporada associada');
    }
    
    // Eventos XP com temporada inválida
    const allSeasonIds = seasons.map(s => s.id);
    const invalidSeasonEvents = await prisma.xpEvent.findMany({
      where: {
        seasonId: { not: null },
        seasonId: { notIn: allSeasonIds }
      },
      select: { id: true, seasonId: true, points: true }
    });
    
    if (invalidSeasonEvents.length > 0) {
      console.log(`⚠️  ${invalidSeasonEvents.length} evento(s) XP com temporada inválida:`);
      invalidSeasonEvents.forEach(event => {
        console.log(`   - ID: ${event.id}, SeasonID inválido: ${event.seasonId}`);
      });
    } else {
      console.log('✅ Todos os eventos XP têm temporadas válidas');
    }
    
    // 5. Resumo
    console.log('\n📋 RESUMO:');
    console.log('=' .repeat(50));
    console.log(`   Temporadas configuradas: ${seasons.length}`);
    console.log(`   Temporada ativa: ${activeSeason ? activeSeason.name : 'Nenhuma'}`);
    console.log(`   Próxima temporada: ${nextSeason ? nextSeason.name : 'Nenhuma'}`);
    console.log(`   Eventos XP órfãos: ${orphanedXpEvents.length}`);
    console.log(`   Eventos XP inválidos: ${invalidSeasonEvents.length}`);
    
    const issues = [];
    if (seasons.length === 0) issues.push('Nenhuma temporada configurada');
    if (!activeSeason) issues.push('Nenhuma temporada ativa');
    if (orphanedXpEvents.length > 0) issues.push(`${orphanedXpEvents.length} eventos XP órfãos`);
    if (invalidSeasonEvents.length > 0) issues.push(`${invalidSeasonEvents.length} eventos XP inválidos`);
    
    if (issues.length === 0) {
      console.log('\n🎉 SISTEMA DE TEMPORADAS ÍNTEGRO!');
    } else {
      console.log(`\n⚠️  ${issues.length} PROBLEMA(S) ENCONTRADO(S):`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar temporadas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeasons();