# Monitoramento e Logs - Sistema de XP Avulso

## Visão Geral

Este documento descreve as estratégias de monitoramento, logging e observabilidade para o sistema de XP avulso em produção.

## Métricas de Performance

### Métricas Principais

#### Latência
- **Concessão de XP**: < 200ms (P95)
- **Consulta de histórico**: < 100ms (P95)
- **Busca de tipos**: < 50ms (P95)
- **Cálculo de estatísticas**: < 500ms (P95)

#### Throughput
- **Concessões por minuto**: Monitorar picos e médias
- **Consultas por segundo**: Acompanhar carga de leitura
- **Operações de CRUD em tipos**: Frequência de configuração

#### Disponibilidade
- **Uptime do serviço**: > 99.9%
- **Taxa de erro**: < 0.1%
- **Tempo de recuperação**: < 5 minutos

### Métricas de Negócio

#### Uso do Sistema
- **Tipos de XP ativos**: Quantidade e distribuição
- **Concessões por administrador**: Identificar uso excessivo
- **XP concedido por período**: Tendências e sazonalidade
- **Atendentes beneficiados**: Cobertura do sistema

#### Qualidade dos Dados
- **Concessões com justificativa**: Percentual de preenchimento
- **Distribuição por categoria**: Balanceamento de tipos
- **Limites atingidos**: Frequência de bloqueios por limite

## Estrutura de Logs

### Níveis de Log

#### ERROR
```typescript
// Falhas críticas que impedem operação
{
  level: 'ERROR',
  timestamp: '2024-01-15T10:30:00Z',
  service: 'xp-avulso',
  operation: 'grantXp',
  error: {
    message: 'Falha ao conceder XP',
    code: 'XP_GRANT_FAILED',
    stack: '...',
    context: {
      attendantId: 'att_123',
      typeId: 'type_456',
      grantedBy: 'user_789'
    }
  }
}
```

#### WARN
```typescript
// Situações que requerem atenção
{
  level: 'WARN',
  timestamp: '2024-01-15T10:30:00Z',
  service: 'xp-avulso',
  operation: 'validateLimits',
  message: 'Limite diário próximo do máximo',
  context: {
    granterId: 'user_789',
    currentGrants: 45,
    dailyLimit: 50
  }
}
```

#### INFO
```typescript
// Operações normais importantes
{
  level: 'INFO',
  timestamp: '2024-01-15T10:30:00Z',
  service: 'xp-avulso',
  operation: 'grantXp',
  message: 'XP concedido com sucesso',
  context: {
    grantId: 'grant_123',
    attendantId: 'att_123',
    points: 100,
    finalPoints: 150, // Com multiplicador
    typeId: 'type_456',
    grantedBy: 'user_789'
  }
}
```

#### DEBUG
```typescript
// Informações detalhadas para desenvolvimento
{
  level: 'DEBUG',
  timestamp: '2024-01-15T10:30:00Z',
  service: 'xp-avulso',
  operation: 'findGrantHistory',
  message: 'Consulta de histórico executada',
  context: {
    filters: { attendantId: 'att_123', page: 1 },
    resultCount: 15,
    executionTime: 45
  }
}
```

### Eventos de Auditoria

#### Concessão de XP
```typescript
{
  eventType: 'XP_GRANTED',
  timestamp: '2024-01-15T10:30:00Z',
  actor: {
    userId: 'user_789',
    name: 'Admin Silva',
    role: 'ADMIN'
  },
  target: {
    attendantId: 'att_123',
    attendantName: 'João Santos'
  },
  details: {
    typeId: 'type_456',
    typeName: 'Excelência no Atendimento',
    basePoints: 100,
    finalPoints: 150,
    multiplier: 1.5,
    seasonId: 'season_2024_q1',
    justification: 'Atendimento excepcional ao cliente VIP'
  }
}
```

#### Configuração de Tipos
```typescript
{
  eventType: 'XP_TYPE_CREATED',
  timestamp: '2024-01-15T10:30:00Z',
  actor: {
    userId: 'user_789',
    name: 'Admin Silva',
    role: 'SUPERADMIN'
  },
  details: {
    typeId: 'type_new',
    typeName: 'Inovação',
    points: 200,
    category: 'innovation'
  }
}
```

## Alertas e Monitoramento

### Alertas Críticos

#### Falhas de Sistema
- **Taxa de erro > 1%**: Alerta imediato
- **Latência P95 > 500ms**: Investigação necessária
- **Falhas de transação**: Alerta crítico

#### Limites de Segurança
- **Concessões suspeitas**: > 100 concessões/hora por admin
- **XP excessivo**: > 5000 pontos em uma concessão
- **Tentativas de acesso negado**: > 10/minuto

#### Integridade de Dados
- **XpGrant sem XpEvent**: Inconsistência crítica
- **Temporada inativa com concessões**: Erro de validação
- **Tipos inativos sendo usados**: Falha de validação

### Alertas de Atenção

#### Performance
- **Consultas lentas**: > 1 segundo
- **Alto volume de consultas**: > 1000/minuto
- **Uso de memória elevado**: > 80%

#### Negócio
- **Queda no uso**: < 10 concessões/dia
- **Concentração em poucos admins**: 80% das concessões por 20% dos admins
- **Tipos não utilizados**: Sem uso por 30 dias

## Dashboards de Monitoramento

### Dashboard Operacional

#### Métricas em Tempo Real
- **Concessões por minuto**: Gráfico de linha
- **Latência média**: Gauge
- **Taxa de erro**: Percentual
- **Admins ativos**: Contador

#### Saúde do Sistema
- **Status dos serviços**: Verde/Amarelo/Vermelho
- **Conexões de banco**: Ativo/Total
- **Uso de recursos**: CPU, Memória, Disco

### Dashboard de Negócio

#### Análise de Uso
- **XP concedido por dia**: Gráfico de barras
- **Top 10 tipos mais usados**: Ranking
- **Distribuição por categoria**: Pizza
- **Admins mais ativos**: Tabela

#### Impacto na Gamificação
- **Conquistas desbloqueadas**: Contador
- **Mudanças de nível**: Gráfico
- **Ranking afetado**: Percentual

## Configuração de Logs

### Estrutura de Arquivos
```
logs/
├── xp-avulso/
│   ├── application.log      # Logs gerais da aplicação
│   ├── audit.log           # Logs de auditoria
│   ├── performance.log     # Métricas de performance
│   └── error.log           # Apenas erros e warnings
```

### Rotação de Logs
- **Frequência**: Diária
- **Retenção**: 30 dias para logs gerais, 1 ano para auditoria
- **Compressão**: Gzip para arquivos antigos
- **Backup**: Cópia para storage seguro

### Formato de Log
```json
{
  "@timestamp": "2024-01-15T10:30:00.123Z",
  "@version": "1",
  "level": "INFO",
  "logger": "xp-avulso",
  "thread": "http-nio-8080-exec-1",
  "message": "XP concedido com sucesso",
  "context": {
    "operation": "grantXp",
    "grantId": "grant_123",
    "attendantId": "att_123",
    "points": 100,
    "grantedBy": "user_789"
  },
  "performance": {
    "duration": 145,
    "dbQueries": 3,
    "cacheHits": 2
  },
  "request": {
    "id": "req_456",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

## Backup e Recuperação

### Estratégia de Backup

#### Dados Críticos
- **XpGrant**: Backup completo diário + incremental a cada hora
- **XpTypeConfig**: Backup após cada modificação
- **Logs de auditoria**: Backup diário com retenção de 7 anos

#### Procedimento de Backup
```sql
-- Backup de concessões (diário)
pg_dump -t xp_grant -t xp_event --data-only > xp_grants_$(date +%Y%m%d).sql

-- Backup de configurações (após mudanças)
pg_dump -t xp_type_config > xp_types_$(date +%Y%m%d_%H%M).sql
```

### Recuperação de Dados

#### Cenários de Recuperação

##### Perda de Dados Recente (< 1 hora)
1. Restaurar backup incremental mais recente
2. Aplicar logs de transação
3. Validar integridade dos dados
4. Verificar consistência com XpEvent

##### Corrupção de Dados
1. Identificar escopo da corrupção
2. Restaurar backup limpo anterior
3. Reprocessar transações válidas
4. Executar verificações de integridade

##### Falha Completa do Sistema
1. Provisionar nova infraestrutura
2. Restaurar backup completo mais recente
3. Aplicar backups incrementais
4. Validar funcionamento completo

### Validação de Integridade

#### Verificações Automáticas
```sql
-- Verificar consistência XpGrant <-> XpEvent
SELECT COUNT(*) FROM xp_grant g 
LEFT JOIN xp_event e ON g.xp_event_id = e.id 
WHERE e.id IS NULL;

-- Verificar multiplicadores aplicados
SELECT g.*, e.points, e.base_points, e.multiplier 
FROM xp_grant g 
JOIN xp_event e ON g.xp_event_id = e.id 
WHERE g.points != e.base_points;

-- Verificar temporadas ativas
SELECT COUNT(*) FROM gamification_season WHERE active = true;
```

#### Relatórios de Integridade
- **Execução**: Diária às 02:00
- **Alertas**: Automáticos em caso de inconsistência
- **Relatório**: Enviado para equipe técnica

## Métricas de SLA

### Disponibilidade
- **Objetivo**: 99.9% (8.76 horas de downtime/ano)
- **Medição**: Uptime do serviço de concessão
- **Exclusões**: Manutenções programadas

### Performance
- **Concessão de XP**: 95% das requisições < 200ms
- **Consultas**: 95% das requisições < 100ms
- **Relatórios**: 95% das requisições < 1s

### Recuperação
- **RTO (Recovery Time Objective)**: 15 minutos
- **RPO (Recovery Point Objective)**: 1 hora
- **MTTR (Mean Time To Recovery)**: 30 minutos

## Procedimentos de Emergência

### Escalação de Incidentes

#### Nível 1 - Automático
- Alertas de sistema
- Logs de erro
- Métricas fora do normal

#### Nível 2 - Equipe Técnica
- Falhas de serviço
- Inconsistências de dados
- Performance degradada

#### Nível 3 - Gestão
- Indisponibilidade prolongada
- Perda de dados
- Impacto no negócio

### Contatos de Emergência
- **Equipe Técnica**: +55 11 9999-0001
- **DBA**: +55 11 9999-0002
- **Gestor do Projeto**: +55 11 9999-0003

### Runbooks

#### Falha na Concessão de XP
1. Verificar logs de erro
2. Validar conexão com banco
3. Verificar temporada ativa
4. Testar concessão manual
5. Escalar se necessário

#### Performance Degradada
1. Verificar métricas de sistema
2. Analisar queries lentas
3. Verificar índices do banco
4. Considerar cache/otimizações
5. Implementar correções

#### Inconsistência de Dados
1. Parar concessões temporariamente
2. Executar verificações de integridade
3. Identificar escopo do problema
4. Restaurar backup se necessário
5. Validar correção antes de reativar