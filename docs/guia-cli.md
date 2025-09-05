# Guia da CLI - Sistema de Backup

## Introdução

A interface de linha de comando (CLI) do sistema de backup permite automatizar operações de backup, integrar com scripts e pipelines de CI/CD, e executar operações em lote.

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL com pg_dump disponível
- Variáveis de ambiente configuradas
- Permissões adequadas no sistema de arquivos

### Verificação da Instalação
```bash
# Verificar se os comandos estão disponíveis
npm run backup:help

# Testar conectividade com banco
npm run backup:test-connection
```

## Comandos Disponíveis

### Visão Geral
```bash
npm run backup:create [options]    # Criar novo backup
npm run backup:list [options]      # Listar backups existentes
npm run backup:validate <file>     # Validar integridade de backup
npm run backup:cleanup <days>      # Limpar backups antigos
npm run backup:info <id>           # Informações detalhadas
npm run backup:help                # Ajuda e documentação
```

## Criando Backups

### Comando Básico
```bash
# Criar backup com configurações padrão
npm run backup:create
```

### Opções Disponíveis

#### Diretório de Saída
```bash
# Especificar diretório personalizado
npm run backup:create --output /caminho/para/backups
npm run backup:create -o /caminho/para/backups
```

#### Nome Personalizado
```bash
# Nome específico (sem extensão)
npm run backup:create --name "backup-producao-v2"
npm run backup:create -n "backup-producao-v2"
```

#### Compressão
```bash
# Ativar compressão (recomendado)
npm run backup:create --compress
npm run backup:create -c
```

#### Backup Parcial
```bash
# Apenas estrutura (sem dados)
npm run backup:create --schema-only

# Apenas dados (sem estrutura)
npm run backup:create --data-only
```

#### Modo Verbose
```bash
# Saída detalhada para debugging
npm run backup:create --verbose
npm run backup:create -v
```

### Exemplos Práticos

#### Backup Completo Comprimido
```bash
npm run backup:create --compress --verbose --name "backup-completo-$(date +%Y%m%d)"
```

#### Backup para Migração
```bash
# Apenas estrutura para ambiente novo
npm run backup:create --schema-only --name "schema-migration"

# Apenas dados para sincronização
npm run backup:create --data-only --name "data-sync"
```

#### Backup Automatizado
```bash
#!/bin/bash
# Script para backup diário
BACKUP_DIR="/backups/$(date +%Y/%m)"
mkdir -p "$BACKUP_DIR"
npm run backup:create --output "$BACKUP_DIR" --compress --verbose
```

## Listando Backups

### Comando Básico
```bash
# Listar todos os backups
npm run backup:list
```

### Opções de Filtro

#### Por Data
```bash
# Backups dos últimos 7 dias
npm run backup:list --days 7

# Backups de data específica
npm run backup:list --date 2025-01-09
```

#### Por Status
```bash
# Apenas backups bem-sucedidos
npm run backup:list --status success

# Apenas falhas
npm run backup:list --status failed
```

#### Formato de Saída
```bash
# Formato JSON para scripts
npm run backup:list --format json

# Formato tabular (padrão)
npm run backup:list --format table

# Formato CSV para exportação
npm run backup:list --format csv
```

### Exemplos de Saída

#### Formato Tabular
```
ID       | Data/Hora           | Nome                    | Tamanho | Status
---------|---------------------|-------------------------|---------|--------
abc123   | 2025-01-09 14:30:00 | backup_2025-01-09...   | 45.2 MB | success
def456   | 2025-01-09 10:15:00 | backup_2025-01-09...   | 44.8 MB | success
ghi789   | 2025-01-08 22:00:00 | backup_2025-01-08...   | 44.1 MB | success
```

#### Formato JSON
```json
{
  "backups": [
    {
      "id": "abc123",
      "filename": "backup_2025-01-09_14-30-00.sql.gz",
      "createdAt": "2025-01-09T14:30:00Z",
      "size": 47456789,
      "status": "success",
      "checksum": "sha256:a1b2c3...",
      "duration": 45.2
    }
  ],
  "total": 1,
  "filtered": 1
}
```

## Validando Backups

### Validação Individual
```bash
# Validar backup específico por ID
npm run backup:validate abc123

# Validar arquivo local
npm run backup:validate /caminho/para/backup.sql
```

### Validação em Lote
```bash
# Validar todos os backups
npm run backup:validate --all

# Validar backups dos últimos N dias
npm run backup:validate --days 7
```

### Tipos de Validação

#### Verificações Realizadas
- ✅ Integridade do arquivo (checksum)
- ✅ Estrutura SQL válida
- ✅ Tamanho mínimo esperado
- ✅ Cabeçalhos de metadados
- ✅ Compressão (se aplicável)

#### Códigos de Retorno
- `0`: Backup válido
- `1`: Arquivo não encontrado
- `2`: Checksum inválido
- `3`: Estrutura SQL corrompida
- `4`: Arquivo muito pequeno

## Limpeza de Backups Antigos

### Comando Básico
```bash
# Remover backups com mais de 30 dias
npm run backup:cleanup 30
```

### Opções de Segurança

#### Modo Dry-run
```bash
# Simular limpeza sem excluir arquivos
npm run backup:cleanup 30 --dry-run
```

#### Preservar Mínimo
```bash
# Manter sempre os últimos 5 backups
npm run backup:cleanup 30 --keep-minimum 5
```

#### Filtros Específicos
```bash
# Limpar apenas backups com falha
npm run backup:cleanup 30 --status failed

# Limpar apenas backups não comprimidos
npm run backup:cleanup 30 --uncompressed-only
```

## Informações Detalhadas

### Comando Info
```bash
# Informações completas de um backup
npm run backup:info abc123
```

### Exemplo de Saída
```
Backup Information
==================
ID: abc123
Filename: backup_2025-01-09_14-30-00.sql.gz
Created: 2025-01-09 14:30:00 UTC
Size: 45.2 MB (47,456,789 bytes)
Compressed: Yes (Original: 156.8 MB)
Status: Success
Duration: 45.2 seconds
Checksum: sha256:a1b2c3d4e5f6...
Created by: admin@sistema.com
Database Version: PostgreSQL 14.5
Schema Version: 1.2.3

Validation Status: ✅ Valid
Last Validated: 2025-01-09 15:00:00 UTC
```

## Automação e Scripts

### Cron Jobs

#### Backup Diário
```bash
# Adicionar ao crontab
0 2 * * * cd /app && npm run backup:create --compress >> /var/log/backup.log 2>&1
```

#### Limpeza Semanal
```bash
# Limpeza aos domingos
0 3 * * 0 cd /app && npm run backup:cleanup 7 >> /var/log/backup-cleanup.log 2>&1
```

#### Validação Mensal
```bash
# Validação no primeiro dia do mês
0 4 1 * * cd /app && npm run backup:validate --all >> /var/log/backup-validation.log 2>&1
```

### Scripts de Exemplo

#### Backup com Notificação
```bash
#!/bin/bash
# backup-with-notification.sh

BACKUP_RESULT=$(npm run backup:create --compress --format json)
BACKUP_STATUS=$(echo "$BACKUP_RESULT" | jq -r '.status')

if [ "$BACKUP_STATUS" = "success" ]; then
    echo "✅ Backup criado com sucesso" | mail -s "Backup OK" admin@empresa.com
else
    echo "❌ Falha no backup: $BACKUP_RESULT" | mail -s "Backup FALHOU" admin@empresa.com
fi
```

#### Rotação Inteligente
```bash
#!/bin/bash
# smart-rotation.sh

# Manter backups por diferentes períodos
npm run backup:cleanup 1 --keep-minimum 24    # Últimas 24 horas
npm run backup:cleanup 7 --keep-minimum 7     # Última semana  
npm run backup:cleanup 30 --keep-minimum 4    # Último mês
npm run backup:cleanup 365 --keep-minimum 12  # Último ano
```

## Integração com CI/CD

### GitHub Actions
```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Diário às 2h

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create backup
        run: npm run backup:create --compress
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Upload to storage
        run: |
          # Upload para S3, Google Cloud, etc.
```

### GitLab CI
```yaml
backup_database:
  stage: maintenance
  script:
    - npm run backup:create --compress --verbose
  only:
    - schedules
  artifacts:
    paths:
      - backups/
    expire_in: 30 days
```

## Configuração Avançada

### Variáveis de Ambiente
```bash
# Configurações específicas da CLI
export BACKUP_CLI_TIMEOUT=7200        # Timeout em segundos
export BACKUP_CLI_MAX_RETRIES=3       # Tentativas em caso de falha
export BACKUP_CLI_VERBOSE=true        # Saída detalhada por padrão
export BACKUP_CLI_FORMAT=json         # Formato padrão de saída
```

### Arquivo de Configuração
```json
// backup-cli.config.json
{
  "defaults": {
    "compress": true,
    "verbose": false,
    "output": "/app/backups",
    "retries": 3,
    "timeout": 3600
  },
  "profiles": {
    "production": {
      "compress": true,
      "verbose": true,
      "output": "/backups/production"
    },
    "development": {
      "compress": false,
      "verbose": true,
      "output": "/tmp/backups"
    }
  }
}
```

## Troubleshooting

### Problemas Comuns

#### "Command not found"
```bash
# Verificar se está no diretório correto
pwd
ls package.json

# Verificar se os scripts estão definidos
npm run
```

#### "Permission denied"
```bash
# Verificar permissões do diretório
ls -la backups/

# Ajustar permissões se necessário
chmod 755 backups/
```

#### "Database connection failed"
```bash
# Testar conexão manualmente
psql $DATABASE_URL -c "SELECT 1;"

# Verificar variáveis de ambiente
echo $DATABASE_URL
```

### Logs e Debugging

#### Ativar Logs Detalhados
```bash
# Usar modo verbose
npm run backup:create --verbose

# Redirecionar para arquivo
npm run backup:create --verbose > backup.log 2>&1
```

#### Verificar Logs do Sistema
```bash
# Logs da aplicação
tail -f /var/log/backup-system.log

# Logs do PostgreSQL
tail -f /var/log/postgresql/postgresql.log
```

## Códigos de Retorno

| Código | Significado | Ação Recomendada |
|--------|-------------|------------------|
| 0 | Sucesso | Continuar |
| 1 | Erro de parâmetros | Verificar sintaxe |
| 2 | Erro de conexão | Verificar DATABASE_URL |
| 3 | Erro de sistema de arquivos | Verificar permissões |
| 4 | Erro de validação | Verificar integridade |
| 5 | Erro de permissões | Verificar role do usuário |
| 6 | Timeout | Aumentar BACKUP_CLI_TIMEOUT |
| 7 | Espaço insuficiente | Liberar espaço em disco |

## Referência Rápida

### Comandos Essenciais
```bash
# Backup rápido
npm run backup:create -c

# Listar últimos backups
npm run backup:list --days 7

# Validar backup específico
npm run backup:validate <id>

# Limpeza segura
npm run backup:cleanup 30 --dry-run
```

### Atalhos Úteis
```bash
# Alias para comandos frequentes
alias backup-create='npm run backup:create --compress --verbose'
alias backup-list='npm run backup:list --format table'
alias backup-clean='npm run backup:cleanup 30 --keep-minimum 5'
```