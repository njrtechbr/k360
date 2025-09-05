/**
 * Exemplos de uso do BackupService
 * 
 * Este arquivo demonstra como utilizar o BackupService para diferentes cenários
 */

import { BackupService } from '../backupService';
import type { BackupOptions } from '@/types/backup';

/**
 * Exemplo 1: Criar backup básico com configurações padrão
 */
export async function exemploBackupBasico() {
  console.log('🔄 Criando backup básico...');
  
  try {
    const resultado = await BackupService.createBackup();
    
    if (resultado.success) {
      console.log('✅ Backup criado com sucesso!');
      console.log(`📁 Arquivo: ${resultado.filename}`);
      console.log(`📊 Tamanho: ${(resultado.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`⏱️ Duração: ${resultado.duration}ms`);
      console.log(`🔐 Checksum: ${resultado.checksum}`);
    } else {
      console.error('❌ Falha no backup:', resultado.error);
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

/**
 * Exemplo 2: Criar backup com opções personalizadas
 */
export async function exemploBackupPersonalizado() {
  console.log('🔄 Criando backup personalizado...');
  
  const opcoes: BackupOptions = {
    filename: 'backup_personalizado.sql',
    directory: './backups/files',
    includeData: true,
    includeSchema: true,
    compress: true
  };
  
  try {
    const resultado = await BackupService.createBackup(opcoes);
    
    if (resultado.success) {
      console.log('✅ Backup personalizado criado!');
      console.log(`📁 Arquivo: ${resultado.filename}`);
      console.log(`📍 Localização: ${resultado.filepath}`);
      console.log(`📊 Tamanho: ${(resultado.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.error('❌ Falha no backup:', resultado.error);
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

/**
 * Exemplo 3: Criar backup apenas com dados (sem estrutura)
 */
export async function exemploBackupApenasdados() {
  console.log('🔄 Criando backup apenas com dados...');
  
  const opcoes: BackupOptions = {
    filename: 'backup_dados_only.sql',
    includeData: true,
    includeSchema: false,
    compress: false
  };
  
  try {
    const resultado = await BackupService.createBackup(opcoes);
    
    if (resultado.success) {
      console.log('✅ Backup de dados criado!');
      console.log(`📁 Arquivo: ${resultado.filename}`);
    } else {
      console.error('❌ Falha no backup:', resultado.error);
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

/**
 * Exemplo 4: Criar backup apenas com estrutura (sem dados)
 */
export async function exemploBackupApenasEstrutura() {
  console.log('🔄 Criando backup apenas com estrutura...');
  
  const opcoes: BackupOptions = {
    filename: 'backup_schema_only.sql',
    includeData: false,
    includeSchema: true,
    compress: false
  };
  
  try {
    const resultado = await BackupService.createBackup(opcoes);
    
    if (resultado.success) {
      console.log('✅ Backup de estrutura criado!');
      console.log(`📁 Arquivo: ${resultado.filename}`);
    } else {
      console.error('❌ Falha no backup:', resultado.error);
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

/**
 * Exemplo 5: Listar todos os backups disponíveis
 */
export async function exemploListarBackups() {
  console.log('📋 Listando backups disponíveis...');
  
  try {
    const backups = await BackupService.listBackups();
    
    if (backups.length === 0) {
      console.log('📭 Nenhum backup encontrado.');
      return;
    }
    
    console.log(`📊 Total de backups: ${backups.length}`);
    console.log('');
    
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename}`);
      console.log(`   📅 Criado em: ${new Date(backup.createdAt).toLocaleString('pt-BR')}`);
      console.log(`   📊 Tamanho: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   ✅ Status: ${backup.status}`);
      console.log(`   ⏱️ Duração: ${backup.duration}ms`);
      console.log(`   🔐 Checksum: ${backup.checksum.substring(0, 8)}...`);
      console.log('');
    });
  } catch (error) {
    console.error('💥 Erro ao listar backups:', error);
  }
}

/**
 * Exemplo 6: Validar integridade de um backup
 */
export async function exemploValidarBackup(filepath: string) {
  console.log(`🔍 Validando backup: ${filepath}`);
  
  try {
    const isValid = await BackupService.validateBackup(filepath);
    
    if (isValid) {
      console.log('✅ Backup válido e íntegro!');
    } else {
      console.log('❌ Backup inválido ou corrompido!');
    }
  } catch (error) {
    console.error('💥 Erro ao validar backup:', error);
  }
}

/**
 * Exemplo 7: Obter informações detalhadas de um backup
 */
export async function exemploInfoBackup(backupId: string) {
  console.log(`ℹ️ Obtendo informações do backup: ${backupId}`);
  
  try {
    const info = await BackupService.getBackupInfo(backupId);
    
    if (info) {
      console.log('📋 Informações do backup:');
      console.log(`   🆔 ID: ${info.id}`);
      console.log(`   📁 Arquivo: ${info.filename}`);
      console.log(`   📍 Localização: ${info.filepath}`);
      console.log(`   📊 Tamanho: ${(info.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   📅 Criado em: ${new Date(info.createdAt).toLocaleString('pt-BR')}`);
      console.log(`   ✅ Status: ${info.status}`);
      console.log(`   ⏱️ Duração: ${info.duration}ms`);
      console.log(`   🔐 Checksum: ${info.checksum}`);
      console.log(`   🗄️ Versão do DB: ${info.databaseVersion}`);
      console.log(`   📋 Versão do Schema: ${info.schemaVersion}`);
      
      if (info.createdBy) {
        console.log(`   👤 Criado por: ${info.createdBy}`);
      }
    } else {
      console.log('❌ Backup não encontrado!');
    }
  } catch (error) {
    console.error('💥 Erro ao obter informações:', error);
  }
}

/**
 * Exemplo 8: Excluir um backup
 */
export async function exemploExcluirBackup(backupId: string) {
  console.log(`🗑️ Excluindo backup: ${backupId}`);
  
  try {
    const sucesso = await BackupService.deleteBackup(backupId);
    
    if (sucesso) {
      console.log('✅ Backup excluído com sucesso!');
    } else {
      console.log('❌ Falha ao excluir backup (não encontrado ou erro de sistema)');
    }
  } catch (error) {
    console.error('💥 Erro ao excluir backup:', error);
  }
}

/**
 * Exemplo 9: Fluxo completo de backup e validação
 */
export async function exemploFluxoCompleto() {
  console.log('🚀 Iniciando fluxo completo de backup...');
  
  try {
    // 1. Criar backup
    console.log('\n1️⃣ Criando backup...');
    const resultado = await BackupService.createBackup({
      compress: true,
      includeData: true,
      includeSchema: true
    });
    
    if (!resultado.success) {
      console.error('❌ Falha na criação do backup:', resultado.error);
      return;
    }
    
    console.log('✅ Backup criado:', resultado.filename);
    
    // 2. Validar backup
    console.log('\n2️⃣ Validando backup...');
    const isValid = await BackupService.validateBackup(resultado.filepath);
    console.log(isValid ? '✅ Backup válido' : '❌ Backup inválido');
    
    // 3. Listar backups
    console.log('\n3️⃣ Listando backups...');
    const backups = await BackupService.listBackups();
    console.log(`📊 Total de backups: ${backups.length}`);
    
    // 4. Mostrar informações do backup mais recente
    if (backups.length > 0) {
      console.log('\n4️⃣ Informações do backup mais recente:');
      const maisRecente = backups[0];
      console.log(`   📁 ${maisRecente.filename}`);
      console.log(`   📊 ${(maisRecente.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   📅 ${new Date(maisRecente.createdAt).toLocaleString('pt-BR')}`);
    }
    
    console.log('\n🎉 Fluxo completo finalizado com sucesso!');
    
  } catch (error) {
    console.error('💥 Erro no fluxo completo:', error);
  }
}

// Exportar todas as funções de exemplo
export const exemplosBackupService = {
  exemploBackupBasico,
  exemploBackupPersonalizado,
  exemploBackupApenasados,
  exemploBackupApenasEstrutura,
  exemploListarBackups,
  exemploValidarBackup,
  exemploInfoBackup,
  exemploExcluirBackup,
  exemploFluxoCompleto
};