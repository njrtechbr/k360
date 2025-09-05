#!/usr/bin/env tsx

/**
 * Script para inicializar o sistema de monitoramento de backup
 * Pode ser executado como um processo separado ou integrado ao servidor principal
 */

import { BackupMonitoring } from '../src/services/backupMonitoring';

async function startMonitoring() {
  console.log('🚀 Iniciando sistema de monitoramento de backup...');
  
  try {
    const monitoring = BackupMonitoring.getInstance();
    
    // Iniciar monitoramento
    await monitoring.startMonitoring();
    
    console.log('✅ Sistema de monitoramento iniciado com sucesso!');
    console.log('📊 Jobs configurados:');
    console.log('  - Limpeza automática: diariamente às 2:00 AM');
    console.log('  - Health check: a cada 30 minutos');
    
    // Executar verificação inicial
    console.log('🔍 Executando verificação inicial...');
    const healthCheck = await monitoring.performHealthCheck();
    console.log(`📋 Status do sistema: ${healthCheck.status}`);
    
    if (healthCheck.issues.length > 0) {
      console.log('⚠️  Problemas detectados:');
      healthCheck.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    // Coletar métricas iniciais
    const metrics = await monitoring.collectMetrics();
    console.log('📈 Métricas atuais:');
    console.log(`   - Total de backups: ${metrics.totalBackups}`);
    console.log(`   - Espaço utilizado: ${metrics.totalSizeGB} GB`);
    console.log(`   - Taxa de sucesso: ${metrics.successRate}%`);
    
    // Manter o processo ativo
    process.on('SIGINT', async () => {
      console.log('\n🛑 Parando sistema de monitoramento...');
      await monitoring.stopMonitoring();
      console.log('✅ Sistema de monitoramento parado');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Parando sistema de monitoramento...');
      await monitoring.stopMonitoring();
      console.log('✅ Sistema de monitoramento parado');
      process.exit(0);
    });
    
    console.log('🔄 Sistema de monitoramento ativo. Pressione Ctrl+C para parar.');
    
    // Manter o processo vivo
    setInterval(() => {
      // Heartbeat - apenas para manter o processo ativo
    }, 60000);
    
  } catch (error) {
    console.error('❌ Erro ao iniciar sistema de monitoramento:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { startMonitoring };