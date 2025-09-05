# CLI de Backup do Banco de Dados

Sistema de linha de comando para gerenciar backups do banco de dados PostgreSQL.

## Instalação

O CLI está integrado ao projeto e pode ser executado através dos scripts npm:

```bash
npm run backup:create    # Criar backup
npm run backup:list      # Listar backups
npm run backup:validate  # Validar backup
npm run backup:cleanup   # Limpar backups antigos
npm run backup:info      # Informações de backup específico
```

Ou diretamente:

```bash
npx tsx scripts/backup-cli.ts <comando> [opções]
```

## Comandos Disponíveis

### create - Criar Backup

Cria um novo backup completo do banco de dados.

```bash
npm run backup:create [opções]
```

**Opções:**
- `-o, --output <diretório>` - Diretório de saída para o backup
- `-n, --name <nome>` - Nome personalizado para o arquivo
- `-c, --compress` - Comprimir o arquivo de backup
- `--schema-only` - Backup apenas da estrutura (sem dados)
- `--data-only` - Backup apenas dos dados (sem estrutura)
- `-v, --verbose` - Saída detalhada

**Exemplos:**
```bash
# Backup básico
npm run backup:create

# Backup comprimido com nome personalizado
npm run backup:create -- --compress --name "backup-producao"

# Backup apenas da estrutura
npm run backup:create -- --schema-only --verbose
```

### list - Listar Backups

Lista todos os backups existentes no sistema.

```bash
npm run backup:list [opções]
```

**Opções:**
- `-f, --format <tipo>` - Formato de saída (table|json), padrão: table
- `-l, --limit <número>` - Limitar número de resultados, padrão: 10
- `-v, --verbose` - Mostrar informações detalhadas

**Exemplos:**
```bash
# Listar backups em formato tabela
npm run backup:list

# Listar em formato JSON
npm run backup:list -- --format json

# Listar com detalhes
npm run backup:list -- --verbose --limit 20
```

### validate - Validar Backup

Valida a integridade de um arquivo de backup.

```bash
npm run backup:validate <caminho-do-arquivo> [opções]
```

**Opções:**
- `-v, --verbose` - Saída detalhada da validação
- `--checksum` - Verificar checksum do arquivo

**Exemplos:**
```bash
# Validação básica
npm run backup:validate -- ./backups/files/backup_2025-01-09_14-30-00.sql

# Validação com checksum
npm run backup:validate -- ./backups/files/backup.sql --checksum --verbose
```

### cleanup - Limpar Backups Antigos

Remove backups antigos baseado em critérios de retenção.

```bash
npm run backup:cleanup [opções]
```

**Opções:**
- `-d, --days <número>` - Remover backups mais antigos que N dias, padrão: 30
- `--dry-run` - Mostrar o que seria removido sem executar
- `-v, --verbose` - Saída detalhada

**Exemplos:**
```bash
# Simular limpeza (não remove arquivos)
npm run backup:cleanup -- --dry-run

# Limpar backups com mais de 7 dias
npm run backup:cleanup -- --days 7 --verbose

# Limpeza padrão (30 dias)
npm run backup:cleanup
```

### info - Informações do Backup

Mostra informações detalhadas sobre um backup específico.

```bash
npm run backup:info -- <backup-id> [opções]
```

**Opções:**
- `-v, --verbose` - Mostrar informações detalhadas

**Exemplos:**
```bash
# Informações básicas do backup
npm run backup:info -- abc123def456

# Informações detalhadas
npm run backup:info -- abc123def456 --verbose
```

## Códigos de Saída

- `0` - Sucesso
- `1` - Erro durante execução

## Configuração

O CLI utiliza as seguintes variáveis de ambiente:

- `DATABASE_URL` - URL de conexão com o banco PostgreSQL
- `BACKUP_DIRECTORY` - Diretório padrão para backups (padrão: ./backups)
- `BACKUP_MAX_SIZE_GB` - Tamanho máximo permitido para backups (padrão: 10GB)
- `BACKUP_RETENTION_DAYS` - Dias de retenção para limpeza automática (padrão: 30)
- `PGDUMP_PATH` - Caminho para o executável pg_dump (padrão: pg_dump)
- `PGDUMP_TIMEOUT` - Timeout em segundos para pg_dump (padrão: 3600)

## Troubleshooting

### Erro: "pg_dump não encontrado"
Certifique-se de que o PostgreSQL está instalado e o pg_dump está no PATH, ou configure a variável `PGDUMP_PATH`.

### Erro: "DATABASE_URL não configurada"
Configure a variável de ambiente `DATABASE_URL` com a string de conexão do banco.

### Erro: "Espaço insuficiente em disco"
Libere espaço em disco ou execute limpeza de backups antigos com `npm run backup:cleanup`.

### Erro: "Permissão negada"
Verifique se o usuário tem permissões de escrita no diretório de backup.