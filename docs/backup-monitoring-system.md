# Sistema de Monitoramento de Backup

## Visão Geral

O sistema de monitoramento de backup fornece supervisão automática, alertas e manutenção para o sistema de backup do banco de dados. Ele inclui jobs automatizados, health checks, coleta de métricas e um sistema de alertas.

## Funcionalidades Principais

### 1. Limpeza Automática
- **Agendamento**: Executa diariamente às 2:00 AM (configurável)
- **Critérios de Limpeza**:
  - Backups mais antigos que N dias (padrão: 30 dias)
  - Excesso de backups além do limite máximo (padrão: 50 backups)
- **Logs**: Todas as operações são registradas no audit log

### 2. Health Checks
- **Frequência**: A cada 30 minutos (configurável)
- **Verificações**:
  - Espaço em disco disponível
  - Integridade dos backups existentes
  - Conectividade com banco de dados
  - Permissões de sistema de arquivos
- **Status**: Healthy, Warning, Critical

### 3. Sistema de Alertas
- **Tipos**: Error, Warning, Info
- **Retenção**: Últimos 100 alertas (configurável)
- **Resolução**: Alertas podem ser marcados como resolvidos
- **Notificações**: Console logs (extensível para email/webhook)

### 4. Métricas de Performance
- **Coleta Automática**: Estatísticas de uso e performance
- **Métricas Disponíveis**:
  - Total de backups
  - Espaço utilizado (GB)
  - Taxa de sucesso (%)
  - Duração média dos backups
  - Backups corrompidos
  - Uso de disco

## Configuração

### Variáveis de Ambiente

```env
# Limpeza Automática
BACKUP_CLEANUP_ENABLED=true
BACKUP_CLEANUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_BACKUPS=50

# Health Check
BACKUP_HEALTH_CHECK_ENABLED=true
BACKUP_HEALTH_CHECK_SCHEDULE="*/30 * * * *"
BACKUP_DISK_SPACE_THRESHOLD=90

# Alertas
BACKUP_MAX_ALERTS=100
BACKUP_ALERT_RETENTION_DAYS=7
BACKUP_EMAIL_NOTIFICATIONS=false
BACKUP_WEBHOOK_URL=

# Métricas
BACKUP_METRICS_INTERVAL=5
BACKUP_METRICS_RETENTION_DAYS=30
BACKUP_DETAILED_METRICS=true
```

### Configuração Padrão

```typescript
const DEFAULT_CONFIG = {
  cleanup: {
    enabled: true,
    schedule: '0 2 * * *', // Diariamente às 2:00 AM
    retentionDays: 30,
    maxBackups: 50
  },
  healthCheck: {
    enabled: true,
    schedule: '*/30 * * * *', // A cada 30 minutos
    diskSpaceThreshold: 90, // Alerta quando uso > 90%
    alertOnFailure: true
  },
  alerts: {
    maxAlerts: 100,
    retentionDays: 7,
    emailNotifications: false
  },
  metrics: {
    collectInterval: 5, // A cada 5 minutos
    retentionDays: 30,
    enableDetailedMetrics: true
  }
};
```

## API Endpoints

### GET /api/backup/monitoring

Recupera dados de monitoramento baseado no parâmetro `action`:

- `?action=metrics` - Retorna métricas de performance
- `?action=alerts` - Retorna lista de alertas
- `?action=health` - Retorna resultado do health check

### POST /api/backup/monitoring

Executa ações de monitoramento:

```json
{
  "action": "start_monitoring" | "stop_monitoring" | "force_cleanup" | "force_health_check" | "resolve_alert",
  "alertId": "string" // Apenas para resolve_alert
}
```

## Interface Web

### Componente BackupMonitoring

Localizado em `src/components/backup/BackupMonitoring.tsx`, fornece:

- **Dashboard de Métricas**: Cards com estatísticas principais
- **Status do Sistema**: Indicadores de saúde em tempo real
- **Gerenciamento de Alertas**: Lista e resolução de alertas
- **Controles**: Iniciar/parar monitoramento, executar limpeza

### Hook useBackupMonitoring

Localizado em `src/hooks/useBackupMonitoring.ts`, fornece:

```typescript
const {
  metrics,
  alerts,
  healthCheck,
  loading,
  error,
  refreshData,
  resolveAlert,
  startMonitoring,
  stopMonitoring,
  forceCleanup,
  forceHealthCheck
} = useBackupMonitoring();
```

## CLI Commands

### Iniciar Monitoramento

```bash
npm run backup:monitoring:start
```

### Executar Testes

```bash
npm run backup:monitoring:test
```

## Arquitetura

### Classe BackupMonitoring

```typescript
class BackupMonitoring {
  // Singleton pattern
  static getInstance(): BackupMonitoring

  // Controle de jobs
  async startMonitoring(): Promise<void>
  async stopMonitoring(): Promise<void>

  // Operações principais
  async performAutomaticCleanup(): Promise<void>
  async performHealthCheck(): Promise<HealthCheckResult>
  async collectMetrics(): Promise<BackupMetrics>

  // Gerenciamento de alertas
  async createAlert(type, message, details?): Promise<void>
  async resolveAlert(alertId): Promise<boolean>
  getAlerts(includeResolved?): BackupAlert[]
}
```

### Dependências

- **BackupStorage**: Gerenciamento de metadados e limpeza
- **BackupValidator**: Validação de integridade
- **BackupAuditLog**: Registro de operações
- **node-cron**: Agendamento de jobs

## Monitoramento e Logs

### Audit Log

Todas as operações são registradas:

```typescript
await auditLog.log('system', 'monitoring_started', {
  message: 'Sistema de monitoramento iniciado'
});
```

### Console Alerts

```
[BACKUP ALERT] ERROR: Falha na conexão com banco de dados
[BACKUP ALERT] WARNING: Espaço em disco baixo (95% utilizado)
[BACKUP ALERT] INFO: Limpeza automática concluída: 5 backups removidos
```

## Health Check Detalhado

### Verificações Realizadas

1. **Espaço em Disco**
   - Verifica uso do diretório de backup
   - Alerta se uso > threshold configurado

2. **Integridade dos Backups**
   - Valida últimos 5 backups
   - Verifica checksums e estrutura

3. **Conexão com Banco**
   - Testa conectividade usando `pg_isready`
   - Timeout de 5 segundos

4. **Permissões**
   - Verifica acesso de leitura/escrita
   - Testa criação de arquivos temporários

### Status Resultantes

- **Healthy**: Todas as verificações passaram
- **Warning**: Problemas menores (espaço, permissões)
- **Critical**: Problemas graves (conectividade, integridade)

## Troubleshooting

### Problemas Comuns

1. **Jobs não executam**
   - Verificar se monitoramento foi iniciado
   - Validar expressões cron
   - Checar logs de erro

2. **Health check falha**
   - Verificar conectividade com banco
   - Validar permissões de arquivo
   - Checar espaço em disco

3. **Alertas não aparecem**
   - Verificar configuração de retenção
   - Validar filtros na interface
   - Checar logs do sistema

### Logs de Debug

```bash
# Verificar status do sistema
curl http://localhost:3000/api/backup/monitoring?action=health

# Forçar health check
curl -X POST http://localhost:3000/api/backup/monitoring \
  -H "Content-Type: application/json" \
  -d '{"action":"force_health_check"}'
```

## Extensibilidade

### Adicionando Novos Tipos de Alerta

```typescript
// Criar novo tipo de verificação
private async checkCustomMetric(): Promise<boolean> {
  // Implementar lógica personalizada
  return true;
}

// Adicionar ao health check
result.checks.customMetric = await this.checkCustomMetric();
```

### Integrações Externas

```typescript
// Webhook para alertas
if (this.config.alerts.webhookUrl) {
  await fetch(this.config.alerts.webhookUrl, {
    method: 'POST',
    body: JSON.stringify(alert)
  });
}
```

## Segurança

### Controle de Acesso

- Endpoints protegidos por middleware de autenticação
- Verificação de roles (ADMIN/SUPERADMIN)
- Rate limiting aplicado

### Dados Sensíveis

- Alertas não expõem informações sensíveis
- Logs sanitizados antes do armazenamento
- Configurações validadas antes do uso

## Performance

### Otimizações

- Jobs executam em background
- Métricas calculadas sob demanda
- Cache de configurações
- Cleanup automático de dados antigos

### Limites

- Máximo 100 alertas em memória
- Health check timeout de 5 segundos
- Validação limitada aos últimos 5 backups