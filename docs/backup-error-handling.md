# Sistema de Tratamento de Erros Robusto - Backup

Este documento descreve o sistema de tratamento de erros implementado para o módulo de backup, que oferece retry automático, logging detalhado, estratégias de fallback e recuperação de falhas.

## Visão Geral

O sistema de tratamento de erros foi projetado para:
- **Aumentar a confiabilidade** das operações de backup
- **Reduzir falhas temporárias** através de retry inteligente
- **Fornecer diagnósticos detalhados** para troubleshooting
- **Implementar estratégias de recuperação** automática
- **Manter logs estruturados** para análise e monitoramento

## Arquitetura

### Componentes Principais

1. **BackupErrorHandler** - Classe principal para tratamento de erros
2. **Classes de Erro Específicas** - Erros tipados para diferentes cenários
3. **Sistema de Retry** - Retry automático com backoff exponencial
4. **Estratégias de Fallback** - Recuperação automática de falhas
5. **Sistema de Logging** - Logs estruturados e persistentes

## Classes de Erro

### Hierarquia de Erros

```typescript
BackupError (base)
├── DatabaseConnectionError
├── BackupCreationError
├── FileSystemError
├── ValidationError
├── PermissionError
├── DiskSpaceError
├── TimeoutError
├── RegistryError
├── CompressionError
└── NetworkError
```

### Propriedades dos Erros

Cada erro contém:
- **ID único** para rastreamento
- **Timestamp** de ocorrência
- **Tipo de erro** (enum BackupErrorType)
- **Severidade** (LOW, MEDIUM, HIGH, CRITICAL)
- **Contexto** com informações adicionais
- **Flag de retry** indicando se é retryable
- **Stack trace** para debugging

### Exemplo de Uso

```typescript
import { DatabaseConnectionError, BackupErrorHandler } from '@/services/backupErrorHandler';

// Criar erro específico
const erro = new DatabaseConnectionError(
  'Falha ao conectar com PostgreSQL',
  {
    host: 'localhost',
    port: 5432,
    tentativa: 3,
    timeout: 30000
  }
);

// Usar com retry automático
const resultado = await BackupErrorHandler.executeWithRetry(
  async () => {
    // Operação que pode falhar
    return await criarBackup();
  },
  'criar_backup',
  { usuario: 'admin' }
);
```

## Sistema de Retry

### Configuração Padrão

```typescript
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    BackupErrorType.DATABASE_CONNECTION,
    BackupErrorType.BACKUP_CREATION,
    BackupErrorType.FILE_SYSTEM,
    BackupErrorType.TIMEOUT,
    BackupErrorType.REGISTRY,
    BackupErrorType.COMPRESSION,
    BackupErrorType.NETWORK
  ]
};
```

### Algoritmo de Backoff

O delay entre tentativas é calculado como:
```
delay = min(baseDelay * (backoffMultiplier ^ (attempt - 1)), maxDelay)
```

Exemplo com configuração padrão:
- Tentativa 1: Imediata
- Tentativa 2: 1000ms de delay
- Tentativa 3: 2000ms de delay
- Tentativa 4: 4000ms de delay

### Erros Não Retryable

Alguns erros não são retryable por natureza:
- **ValidationError** - Dados inválidos não melhoram com retry
- **PermissionError** - Permissões não mudam automaticamente
- **DiskSpaceError** - Espaço em disco não aumenta sozinho
- **CorruptionError** - Arquivos corrompidos permanecem corrompidos

## Estratégias de Fallback

### Fallbacks Automáticos

O sistema implementa estratégias de recuperação automática:

#### 1. Limpeza de Espaço em Disco
```typescript
{
  errorType: BackupErrorType.DISK_SPACE,
  strategy: 'cleanup_old_backups',
  description: 'Limpar backups antigos para liberar espaço',
  action: async () => {
    return await BackupStorage.cleanupOldBackups();
  }
}
```

#### 2. Fallback de Compressão
```typescript
{
  errorType: BackupErrorType.COMPRESSION,
  strategy: 'fallback_uncompressed',
  description: 'Criar backup sem compressão',
  action: async () => {
    return { compress: false };
  }
}
```

#### 3. Diretório Alternativo
```typescript
{
  errorType: BackupErrorType.PERMISSION,
  strategy: 'alternative_directory',
  description: 'Tentar diretório alternativo',
  action: async () => {
    const tempDir = path.join(process.cwd(), 'temp-backups');
    await fs.mkdir(tempDir, { recursive: true });
    return { directory: tempDir };
  }
}
```

## Sistema de Logging

### Estrutura dos Logs

```typescript
interface ErrorLog {
  id: string;
  timestamp: Date;
  errorType: BackupErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: Record<string, any>;
  attemptNumber: number;
  resolved: boolean;
  resolutionStrategy?: string;
}
```

### Localização dos Logs

Os logs são armazenados em:
```
backups/error-logs.json
```

### Rotação de Logs

- **Máximo de entradas**: 1000
- **Limpeza automática**: Logs com mais de 30 dias
- **Formato**: JSON estruturado para fácil parsing

## API do BackupErrorHandler

### Métodos Principais

#### executeWithRetry()
```typescript
static async executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>,
  retryConfig?: Partial<RetryConfig>
): Promise<T>
```

#### normalizeError()
```typescript
static normalizeError(
  error: any, 
  context?: Record<string, any>
): BackupError
```

#### getErrorStats()
```typescript
static async getErrorStats(days: number = 7): Promise<{
  totalErrors: number;
  errorsByType: Record<BackupErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  resolvedErrors: number;
  unresolvedErrors: number;
  mostCommonErrors: Array<{ type: BackupErrorType; count: number }>;
}>
```

#### getErrorLogs()
```typescript
static async getErrorLogs(options?: {
  errorType?: BackupErrorType;
  severity?: ErrorSeverity;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<ErrorLog[]>
```

#### generateErrorReport()
```typescript
static async generateErrorReport(days: number = 7): Promise<string>
```

#### cleanupOldLogs()
```typescript
static async cleanupOldLogs(daysToKeep: number = 30): Promise<number>
```

## Integração com BackupService

### Métodos Atualizados

O BackupService foi atualizado para usar o sistema de erros:

```typescript
// Antes
static async createBackup(options: BackupOptions): Promise<BackupResult> {
  try {
    // lógica do backup
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Depois
static async createBackup(options: BackupOptions): Promise<BackupResult> {
  return await BackupErrorHandler.executeWithRetry(
    async () => {
      // lógica do backup com tratamento robusto
    },
    'createBackup',
    { options },
    { maxAttempts: 3, baseDelay: 2000 }
  );
}
```

### Métodos com Retry

Todos os métodos críticos agora têm versões com retry:
- `validateBackupOptionsWithRetry()`
- `ensureDirectoryExistsWithRetry()`
- `checkDiskSpaceWithRetry()`
- `executePgDumpWithRetry()`
- `compressBackupWithRetry()`
- `getDatabaseInfoWithRetry()`
- `saveBackupMetadataWithRetry()`

## Monitoramento e Análise

### Estatísticas de Erro

```typescript
const stats = await BackupErrorHandler.getErrorStats(7);
console.log(`Taxa de sucesso: ${((stats.resolvedErrors / stats.totalErrors) * 100).toFixed(1)}%`);
```

### Relatório Detalhado

```typescript
const relatorio = await BackupErrorHandler.generateErrorReport(30);
console.log(relatorio);
```

Exemplo de saída:
```
=== RELATÓRIO DE ERROS DE BACKUP (30 dias) ===

RESUMO GERAL:
Total de erros: 45
Erros resolvidos: 38
Erros não resolvidos: 7
Taxa de resolução: 84.4%

ERROS POR TIPO:
  DATABASE_CONNECTION: 15
  BACKUP_CREATION: 12
  FILE_SYSTEM: 8
  TIMEOUT: 5
  COMPRESSION: 3
  VALIDATION: 2

ERROS POR SEVERIDADE:
  HIGH: 20
  MEDIUM: 15
  CRITICAL: 7
  LOW: 3

ERROS MAIS COMUNS:
  DATABASE_CONNECTION: 15 ocorrências
  BACKUP_CREATION: 12 ocorrências
  FILE_SYSTEM: 8 ocorrências
```

### Filtros de Log

```typescript
// Erros críticos não resolvidos
const errosCriticos = await BackupErrorHandler.getErrorLogs({
  severity: ErrorSeverity.CRITICAL,
  resolved: false,
  limit: 10
});

// Erros de conexão da última semana
const errosConexao = await BackupErrorHandler.getErrorLogs({
  errorType: BackupErrorType.DATABASE_CONNECTION,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
});
```

## Configuração Personalizada

### Retry Agressivo para Operações Críticas

```typescript
const configCritica = {
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 60000,
  backoffMultiplier: 1.5
};

await BackupErrorHandler.executeWithRetry(
  operacaoCritica,
  'backup_producao',
  context,
  configCritica
);
```

### Retry Conservador para Operações Não Críticas

```typescript
const configConservadora = {
  maxAttempts: 2,
  baseDelay: 2000,
  maxDelay: 10000,
  retryableErrors: [BackupErrorType.DATABASE_CONNECTION]
};
```

## Melhores Práticas

### 1. Contexto Detalhado
Sempre forneça contexto rico nos erros:
```typescript
const context = {
  usuario: session.user.id,
  backupId: backup.id,
  tamanhoArquivo: stats.size,
  tentativa: attemptNumber
};
```

### 2. Severidade Apropriada
Use severidades corretas:
- **CRITICAL**: Falhas que impedem operação do sistema
- **HIGH**: Falhas importantes que afetam funcionalidade
- **MEDIUM**: Falhas que podem ser contornadas
- **LOW**: Avisos e problemas menores

### 3. Retry Inteligente
Configure retry baseado no tipo de operação:
- **Operações de rede**: Retry agressivo
- **Validações**: Sem retry
- **Operações de arquivo**: Retry moderado

### 4. Monitoramento Proativo
Implemente alertas baseados em:
- Taxa de erro acima de threshold
- Erros críticos não resolvidos
- Padrões de erro recorrentes

### 5. Limpeza Regular
Configure limpeza automática:
```typescript
// Limpar logs mensalmente
setInterval(async () => {
  await BackupErrorHandler.cleanupOldLogs(30);
}, 30 * 24 * 60 * 60 * 1000);
```

## Troubleshooting

### Problemas Comuns

#### 1. Muitos Erros de Conexão
**Sintomas**: Alta frequência de `DatabaseConnectionError`
**Soluções**:
- Verificar configuração de rede
- Aumentar timeout de conexão
- Verificar pool de conexões

#### 2. Falhas de Espaço em Disco
**Sintomas**: `DiskSpaceError` recorrentes
**Soluções**:
- Configurar limpeza automática mais agressiva
- Monitorar uso de disco
- Implementar compressão por padrão

#### 3. Timeouts Frequentes
**Sintomas**: `TimeoutError` em backups grandes
**Soluções**:
- Aumentar timeout do pg_dump
- Implementar backup incremental
- Otimizar queries do banco

### Debugging

#### Habilitar Logs Detalhados
```typescript
// Definir nível de log mais verboso
process.env.BACKUP_LOG_LEVEL = 'debug';
```

#### Analisar Contexto de Erro
```typescript
const erro = await BackupErrorHandler.getErrorLogs({ limit: 1 });
console.log('Contexto do último erro:', erro[0]?.context);
```

#### Testar Estratégias de Fallback
```typescript
// Simular erro para testar fallback
const erro = new DiskSpaceError('Teste de fallback');
const resultado = await BackupErrorHandler.tryFallbackStrategies(erro, 'teste', {});
```

## Extensibilidade

### Adicionar Novos Tipos de Erro

1. Adicionar ao enum `BackupErrorType`
2. Criar classe específica estendendo `BackupError`
3. Atualizar `normalizeError()` para detectar o novo tipo
4. Adicionar estratégia de fallback se aplicável

### Implementar Estratégias Customizadas

```typescript
BackupErrorHandler.addFallbackStrategy({
  errorType: BackupErrorType.CUSTOM_ERROR,
  strategy: 'custom_recovery',
  description: 'Estratégia customizada de recuperação',
  action: async () => {
    // Lógica de recuperação customizada
    return { customOption: true };
  }
});
```

### Integrar com Sistemas Externos

```typescript
// Integração com sistema de alertas
BackupErrorHandler.onError((error) => {
  if (error.severity === ErrorSeverity.CRITICAL) {
    alertingSystem.sendAlert({
      title: 'Erro Crítico de Backup',
      message: error.message,
      context: error.context
    });
  }
});
```

## Conclusão

O sistema de tratamento de erros robusto fornece uma base sólida para operações de backup confiáveis, com:

- **Recuperação automática** de falhas temporárias
- **Diagnósticos detalhados** para troubleshooting eficiente
- **Monitoramento proativo** para identificar padrões
- **Extensibilidade** para novos cenários de erro
- **Logging estruturado** para análise e auditoria

Este sistema reduz significativamente as falhas de backup e melhora a experiência do usuário através de recuperação automática e feedback detalhado sobre problemas.