/**
 * Exemplos de uso do sistema de tratamento de erros robusto
 * Este arquivo demonstra como usar o BackupErrorHandler em diferentes cenários
 */

import { 
  BackupErrorHandler,
  BackupError,
  DatabaseConnectionError,
  BackupCreationError,
  FileSystemError,
  ValidationError,
  PermissionError,
  DiskSpaceError,
  TimeoutError,
  RegistryError,
  CompressionError,
  BackupErrorType,
  ErrorSeverity
} from '../backupErrorHandler';

/**
 * Exemplo 1: Operação simples com retry automático
 */
export async function exemploOperacaoComRetry() {
  try {
    const resultado = await BackupErrorHandler.executeWithRetry(
      async () => {
        // Simular operação que pode falhar
        if (Math.random() < 0.7) {
          throw new DatabaseConnectionError('Conexão temporariamente indisponível');
        }
        return 'Operação bem-sucedida!';
      },
      'exemploOperacao',
      { usuario: 'admin', operacao: 'backup' },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      }
    );
    
    console.log('Resultado:', resultado);
  } catch (error) {
    console.error('Operação falhou após todas as tentativas:', error);
  }
}

/**
 * Exemplo 2: Tratamento de diferentes tipos de erro
 */
export async function exemploTratamentoDiferentesErros() {
  const operacoes = [
    () => { throw new Error('ECONNREFUSED'); },
    () => { throw new Error('ENOENT file not found'); },
    () => { throw new Error('EACCES permission denied'); },
    () => { throw new Error('ENOSPC no space left'); },
    () => { throw new Error('timeout exceeded'); },
    () => { throw new Error('validation failed'); }
  ];

  for (const [index, operacao] of operacoes.entries()) {
    try {
      await BackupErrorHandler.executeWithRetry(
        operacao,
        `operacao_${index}`,
        { index }
      );
    } catch (error) {
      if (error instanceof BackupError) {
        console.log(`Erro ${index}: Tipo=${error.errorType}, Severidade=${error.severity}, Retryable=${error.isRetryable}`);
      }
    }
  }
}

/**
 * Exemplo 3: Criação manual de erros específicos
 */
export function exemploCriacaoErrosEspecificos() {
  // Erro de conexão com contexto detalhado
  const erroConexao = new DatabaseConnectionError(
    'Falha ao conectar com PostgreSQL',
    {
      host: 'localhost',
      port: 5432,
      database: 'gamification',
      tentativa: 3
    }
  );

  // Erro de espaço em disco
  const erroEspaco = new DiskSpaceError(
    'Espaço insuficiente para backup',
    {
      espacoDisponivel: '1.2GB',
      espacoNecessario: '5.0GB',
      diretorio: '/backups'
    }
  );

  // Erro de validação
  const erroValidacao = new ValidationError(
    'Checksum não confere',
    {
      checksumEsperado: 'abc123',
      checksumCalculado: 'def456',
      arquivo: 'backup_2025-01-09.sql'
    }
  );

  console.log('Erros criados:', {
    conexao: erroConexao.toJSON(),
    espaco: erroEspaco.toJSON(),
    validacao: erroValidacao.toJSON()
  });
}

/**
 * Exemplo 4: Monitoramento de erros
 */
export async function exemploMonitoramentoErros() {
  // Obter estatísticas dos últimos 7 dias
  const stats = await BackupErrorHandler.getErrorStats(7);
  
  console.log('Estatísticas de Erros:');
  console.log(`- Total: ${stats.totalErrors}`);
  console.log(`- Resolvidos: ${stats.resolvedErrors}`);
  console.log(`- Não resolvidos: ${stats.unresolvedErrors}`);
  console.log(`- Taxa de resolução: ${((stats.resolvedErrors / stats.totalErrors) * 100).toFixed(1)}%`);
  
  console.log('\nErros mais comuns:');
  stats.mostCommonErrors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.type}: ${error.count} ocorrências`);
  });

  // Gerar relatório detalhado
  const relatorio = await BackupErrorHandler.generateErrorReport(7);
  console.log('\n' + relatorio);
}

/**
 * Exemplo 5: Limpeza de logs antigos
 */
export async function exemploLimpezaLogs() {
  // Limpar logs com mais de 30 dias
  const removidos = await BackupErrorHandler.cleanupOldLogs(30);
  console.log(`Removidos ${removidos} logs antigos`);

  // Obter logs filtrados
  const logsRecentes = await BackupErrorHandler.getErrorLogs({
    errorType: BackupErrorType.DATABASE_CONNECTION,
    severity: ErrorSeverity.HIGH,
    resolved: false,
    limit: 10
  });

  console.log(`Encontrados ${logsRecentes.length} erros de conexão não resolvidos`);
}

/**
 * Exemplo 6: Operação complexa com múltiplas etapas e tratamento de erro
 */
export async function exemploOperacaoComplexa() {
  const contexto = {
    operacao: 'backup_completo',
    usuario: 'admin',
    timestamp: new Date().toISOString()
  };

  try {
    // Etapa 1: Validar parâmetros
    await BackupErrorHandler.executeWithRetry(
      async () => {
        // Simular validação que pode falhar
        if (Math.random() < 0.2) {
          throw new ValidationError('Parâmetros inválidos', contexto);
        }
        console.log('✓ Parâmetros validados');
      },
      'validar_parametros',
      contexto,
      { maxAttempts: 1 } // Validação não precisa de retry
    );

    // Etapa 2: Conectar ao banco
    await BackupErrorHandler.executeWithRetry(
      async () => {
        if (Math.random() < 0.3) {
          throw new DatabaseConnectionError('Falha na conexão', contexto);
        }
        console.log('✓ Conectado ao banco');
      },
      'conectar_banco',
      contexto
    );

    // Etapa 3: Verificar espaço em disco
    await BackupErrorHandler.executeWithRetry(
      async () => {
        if (Math.random() < 0.1) {
          throw new DiskSpaceError('Espaço insuficiente', contexto);
        }
        console.log('✓ Espaço em disco verificado');
      },
      'verificar_espaco',
      contexto,
      { maxAttempts: 1 } // Espaço em disco não melhora com retry
    );

    // Etapa 4: Criar backup
    await BackupErrorHandler.executeWithRetry(
      async () => {
        if (Math.random() < 0.2) {
          throw new BackupCreationError('Falha na criação do backup', contexto);
        }
        console.log('✓ Backup criado');
      },
      'criar_backup',
      contexto
    );

    // Etapa 5: Comprimir arquivo
    await BackupErrorHandler.executeWithRetry(
      async () => {
        if (Math.random() < 0.15) {
          throw new CompressionError('Falha na compressão', contexto);
        }
        console.log('✓ Arquivo comprimido');
      },
      'comprimir_arquivo',
      contexto
    );

    console.log('🎉 Operação complexa concluída com sucesso!');

  } catch (error) {
    console.error('❌ Operação complexa falhou:', error);
    
    if (error instanceof BackupError) {
      console.error(`Detalhes: Tipo=${error.errorType}, Severidade=${error.severity}, ID=${error.id}`);
    }
  }
}

/**
 * Exemplo 7: Configuração personalizada de retry
 */
export async function exemploConfiguracaoPersonalizada() {
  // Configuração agressiva para operações críticas
  const configCritica = {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    retryableErrors: [
      BackupErrorType.DATABASE_CONNECTION,
      BackupErrorType.NETWORK,
      BackupErrorType.TIMEOUT
    ]
  };

  // Configuração conservadora para operações não críticas
  const configConservadora = {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      BackupErrorType.DATABASE_CONNECTION
    ]
  };

  try {
    // Operação crítica
    await BackupErrorHandler.executeWithRetry(
      async () => {
        if (Math.random() < 0.8) {
          throw new DatabaseConnectionError('Conexão instável');
        }
        return 'Operação crítica concluída';
      },
      'operacao_critica',
      {},
      configCritica
    );

    // Operação não crítica
    await BackupErrorHandler.executeWithRetry(
      async () => {
        if (Math.random() < 0.5) {
          throw new RegistryError('Falha no registry');
        }
        return 'Operação não crítica concluída';
      },
      'operacao_nao_critica',
      {},
      configConservadora
    );

  } catch (error) {
    console.error('Falha na configuração personalizada:', error);
  }
}

// Função para executar todos os exemplos
export async function executarTodosExemplos() {
  console.log('=== Exemplos do Sistema de Tratamento de Erros ===\n');

  console.log('1. Operação com Retry Automático:');
  await exemploOperacaoComRetry();

  console.log('\n2. Tratamento de Diferentes Tipos de Erro:');
  await exemploTratamentoDiferentesErros();

  console.log('\n3. Criação de Erros Específicos:');
  exemploCriacaoErrosEspecificos();

  console.log('\n4. Monitoramento de Erros:');
  await exemploMonitoramentoErros();

  console.log('\n5. Limpeza de Logs:');
  await exemploLimpezaLogs();

  console.log('\n6. Operação Complexa:');
  await exemploOperacaoComplexa();

  console.log('\n7. Configuração Personalizada:');
  await exemploConfiguracaoPersonalizada();

  console.log('\n=== Exemplos Concluídos ===');
}

// Executar exemplos se este arquivo for executado diretamente
if (require.main === module) {
  executarTodosExemplos().catch(console.error);
}