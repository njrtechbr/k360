/**
 * Exemplo de uso do RealtimeDashboardService
 * 
 * Este arquivo demonstra como usar o serviço de dashboard em tempo real
 * para buscar métricas de gamificação, satisfação e alertas.
 */

import { RealtimeDashboardService } from '../realtimeDashboardService';

export async function exemploUsoCompleto() {
  try {
    console.log('🚀 Buscando todas as métricas do dashboard...');
    
    // Buscar todas as métricas de uma vez
    const allMetrics = await RealtimeDashboardService.getAllDashboardMetrics({
      satisfactionPeriod: '7d',
      alertThresholds: {
        lowSatisfactionThreshold: 3.0,
        inactivityHours: 48
      }
    });
    
    console.log('📊 Métricas consolidadas:', {
      totalXp: allMetrics.gamification.totalXp,
      activeUsers: allMetrics.gamification.activeUsers,
      averageRating: allMetrics.satisfaction.averageRating,
      lowRatingAlerts: allMetrics.satisfaction.lowRatingAlerts,
      systemAlerts: allMetrics.alerts.systemAlerts.length,
      lastUpdated: allMetrics.lastUpdated
    });
    
    return allMetrics;
  } catch (error) {
    console.error('❌ Erro ao buscar métricas:', error);
    throw error;
  }
}

export async function exemploMetricasGamificacao() {
  try {
    console.log('🎮 Buscando métricas de gamificação...');
    
    // Buscar métricas de gamificação específicas
    const gamificationMetrics = await RealtimeDashboardService.getGamificationMetrics();
    
    console.log('🏆 Top 5 Ranking:');
    gamificationMetrics.topRanking.slice(0, 5).forEach(player => {
      console.log(`${player.position}º - ${player.name}: ${player.totalXp} XP`);
    });
    
    console.log('🎯 Conquistas Recentes:');
    gamificationMetrics.recentAchievements.slice(0, 3).forEach(achievement => {
      console.log(`- ${achievement.attendantName}: ${achievement.title}`);
    });
    
    return gamificationMetrics;
  } catch (error) {
    console.error('❌ Erro ao buscar métricas de gamificação:', error);
    throw error;
  }
}

export async function exemploMetricasSatisfacao() {
  try {
    console.log('😊 Buscando métricas de satisfação...');
    
    // Buscar métricas de satisfação dos últimos 30 dias
    const satisfactionMetrics = await RealtimeDashboardService.getSatisfactionMetrics('30d');
    
    console.log('📈 Resumo de Satisfação:');
    console.log(`- Média Geral: ${satisfactionMetrics.averageRating.toFixed(2)}`);
    console.log(`- Média 24h: ${satisfactionMetrics.averageRating24h.toFixed(2)}`);
    console.log(`- Avaliações Hoje: ${satisfactionMetrics.totalEvaluations.today}`);
    console.log(`- Alertas de Baixa Satisfação: ${satisfactionMetrics.lowRatingAlerts}`);
    
    console.log('📊 Distribuição de Notas:');
    const dist = satisfactionMetrics.ratingDistribution;
    console.log(`⭐ 1: ${dist.rating1} | ⭐⭐ 2: ${dist.rating2} | ⭐⭐⭐ 3: ${dist.rating3} | ⭐⭐⭐⭐ 4: ${dist.rating4} | ⭐⭐⭐⭐⭐ 5: ${dist.rating5}`);
    
    return satisfactionMetrics;
  } catch (error) {
    console.error('❌ Erro ao buscar métricas de satisfação:', error);
    throw error;
  }
}

export async function exemploUsuariosAtivos() {
  try {
    console.log('👥 Buscando usuários ativos...');
    
    // Buscar usuários ativos nas últimas 24 horas
    const activeUsers = await RealtimeDashboardService.getActiveUsers(24);
    
    console.log(`🔥 ${activeUsers.count} usuários ativos nas últimas 24h:`);
    activeUsers.users.slice(0, 10).forEach(user => {
      const hoursAgo = Math.floor((Date.now() - user.lastActivity.getTime()) / (1000 * 60 * 60));
      console.log(`- ${user.name}: ${user.currentXp} XP (ativo há ${hoursAgo}h)`);
    });
    
    return activeUsers;
  } catch (error) {
    console.error('❌ Erro ao buscar usuários ativos:', error);
    throw error;
  }
}

export async function exemploAlertas() {
  try {
    console.log('🚨 Verificando alertas do sistema...');
    
    // Buscar alertas com thresholds personalizados
    const alertMetrics = await RealtimeDashboardService.getAlertMetrics({
      lowSatisfactionThreshold: 2.5,
      inactivityHours: 72
    });
    
    console.log('⚠️ Resumo de Alertas:');
    console.log(`- Satisfação Baixa: ${alertMetrics.lowSatisfactionCount} casos`);
    console.log(`- Usuários Inativos: ${alertMetrics.inactiveUsersCount} usuários`);
    console.log(`- Alertas do Sistema: ${alertMetrics.systemAlerts.length} alertas`);
    
    if (alertMetrics.systemAlerts.length > 0) {
      console.log('\n🔔 Alertas Ativos:');
      alertMetrics.systemAlerts.forEach(alert => {
        const severity = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${severity} ${alert.message} (${alert.type})`);
      });
    }
    
    return alertMetrics;
  } catch (error) {
    console.error('❌ Erro ao buscar alertas:', error);
    throw error;
  }
}

// Exemplo de uso em uma API route ou componente
export async function exemploParaAPIRoute() {
  try {
    // Este seria o padrão típico em uma API route do Next.js
    const metrics = await RealtimeDashboardService.getAllDashboardMetrics({
      satisfactionPeriod: '7d',
      alertThresholds: {
        lowSatisfactionThreshold: 3.0,
        inactivityHours: 48
      }
    });
    
    // Retornar dados formatados para o frontend
    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro na API:', error);
    return {
      success: false,
      error: 'Falha ao buscar métricas do dashboard',
      timestamp: new Date().toISOString()
    };
  }
}

// Exemplo de uso com cache simples
let cachedMetrics: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 30 * 1000; // 30 segundos

export async function exemploComCache() {
  const now = Date.now();
  
  // Verificar se o cache ainda é válido
  if (cachedMetrics && (now - lastFetch) < CACHE_DURATION) {
    console.log('📦 Retornando dados do cache');
    return cachedMetrics;
  }
  
  console.log('🔄 Buscando dados atualizados...');
  
  try {
    cachedMetrics = await RealtimeDashboardService.getAllDashboardMetrics();
    lastFetch = now;
    
    console.log('✅ Cache atualizado');
    return cachedMetrics;
  } catch (error) {
    console.error('❌ Erro ao atualizar cache:', error);
    
    // Retornar cache antigo se disponível
    if (cachedMetrics) {
      console.log('⚠️ Retornando cache antigo devido ao erro');
      return cachedMetrics;
    }
    
    throw error;
  }
}