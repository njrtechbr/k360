# Sistema de Backup de Banco de Dados - Documentação Completa

## Visão Geral

O Sistema de Backup de Banco de Dados é uma solução completa para criar, gerenciar e monitorar backups do banco PostgreSQL do sistema de gamificação. Oferece tanto interface web quanto linha de comando para máxima flexibilidade.

## Funcionalidades Principais

### Interface Web
- ✅ Criação de backups com interface intuitiva
- ✅ Visualização do histórico de backups
- ✅ Download de arquivos de backup
- ✅ Monitoramento em tempo real do progresso
- ✅ Exclusão de backups antigos
- ✅ Controle de acesso baseado em roles

### Linha de Comando (CLI)
- ✅ Criação automatizada de backups
- ✅ Listagem de backups existentes
- ✅ Validação de integridade
- ✅ Limpeza automática de arquivos antigos
- ✅ Integração com scripts e CI/CD

### Segurança e Monitoramento
- ✅ Controle de acesso por roles de usuário
- ✅ Validação de integridade com checksums
- ✅ Rate limiting para prevenir abuso
- ✅ Logs de auditoria detalhados
- ✅ Monitoramento de performance

## Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────┐    ┌─────────────────┐
│   Interface Web │    │   CLI Commands  │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────┬─────────────────┘
                 │
         ┌───────▼────────┐
         │ BackupService  │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌────▼────┐   ┌───▼────┐
│pg_dump│   │Validator│   │Storage │
└───────┘   └─────────┘   └────────┘
```

### Fluxo de Dados

1. **Solicitação**: Interface Web ou CLI solicita backup
2. **Validação**: Sistema verifica permissões e parâmetros
3. **Execução**: pg_dump cria o arquivo de backup
4. **Validação**: Sistema verifica integridade do arquivo
5. **Armazenamento**: Metadados são salvos no registry
6. **Notificação**: Usuário é informado do resultado

## Estrutura de Arquivos

```
projeto/
├── src/
│   ├── services/
│   │   ├── backupService.ts          # Serviço principal
│   │   ├── backupValidator.ts        # Validação de integridade
│   │   ├── backupStorage.ts          # Gerenciamento de metadados
│   │   ├── backupErrorHandler.ts     # Tratamento de erros
│   │   └── backupAuditLog.ts         # Logs de auditoria
│   ├── app/api/backup/
│   │   ├── create/route.ts           # Endpoint de criação
│   │   ├── list/route.ts             # Endpoint de listagem
│   │   ├── download/[id]/route.ts    # Endpoint de download
│   │   ├── delete/[id]/route.ts      # Endpoint de exclusão
│   │   └── status/[id]/route.ts      # Endpoint de status
│   ├── components/backup/
│   │   ├── BackupManager.tsx         # Componente principal
│   │   ├── CreateBackupForm.tsx      # Formulário de criação
│   │   ├── BackupList.tsx            # Lista de backups
│   │   └── BackupProgress.tsx        # Indicador de progresso
│   └── lib/
│       ├── auth/backupAuth.ts        # Autenticação
│       └── rateLimit/backupRateLimit.ts # Rate limiting
├── scripts/
│   └── backup-cli.ts                 # Interface de linha de comando
├── backups/
│   ├── registry.json                 # Metadados dos backups
│   └── files/                        # Arquivos de backup
└── docs/
    ├── sistema-backup-completo.md    # Esta documentação
    ├── guia-usuario.md               # Guia do usuário
    ├── guia-cli.md                   # Guia da CLI
    └── troubleshooting.md            # Solução de problemas
```

## Requisitos do Sistema

### Software Necessário
- Node.js 18+ 
- PostgreSQL 12+
- pg_dump (incluído com PostgreSQL)
- npm ou yarn

### Dependências do Projeto
```json
{
  "dependencies": {
    "archiver": "^6.0.1",
    "node-cron": "^3.0.3"
  }
}
```

### Variáveis de Ambiente
```env
# Configurações de backup
BACKUP_DIRECTORY=/app/backups
BACKUP_MAX_SIZE_GB=10
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_CONCURRENT=2
BACKUP_ENABLE_COMPRESSION=true

# Configurações do PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PGDUMP_PATH=/usr/bin/pg_dump
PGDUMP_TIMEOUT=3600
```

## Permissões por Role

| Funcionalidade | SUPERADMIN | ADMIN | SUPERVISOR | USUARIO |
|----------------|------------|-------|------------|---------|
| Criar Backup   | ✅         | ✅    | ❌         | ❌      |
| Listar Backups | ✅         | ✅    | ✅         | ❌      |
| Download       | ✅         | ✅    | ✅         | ❌      |
| Excluir Backup | ✅         | ✅    | ❌         | ❌      |
| Validar        | ✅         | ✅    | ✅         | ❌      |
| CLI Access     | ✅         | ✅    | ❌         | ❌      |

## Formatos de Backup

### Nomenclatura Automática
- Formato: `backup_YYYY-MM-DD_HH-mm-ss.sql`
- Exemplo: `backup_2025-01-09_14-30-00.sql`
- Comprimido: `backup_2025-01-09_14-30-00.sql.gz`

### Conteúdo dos Backups
- ✅ Estrutura completa das tabelas (CREATE statements)
- ✅ Todos os dados (INSERT statements)  
- ✅ Índices e constraints
- ✅ Sequences e triggers
- ✅ Metadados de versão do schema

### Validação de Integridade
- Checksum SHA-256 para cada arquivo
- Validação de estrutura SQL
- Verificação de tamanho mínimo
- Teste de abertura do arquivo

## Monitoramento e Métricas

### Métricas Coletadas
- Taxa de sucesso dos backups
- Tempo médio de criação
- Tamanho dos arquivos gerados
- Uso de espaço em disco
- Frequência de erros por tipo

### Logs de Auditoria
Todas as operações são registradas com:
- Timestamp da operação
- Usuário responsável
- Tipo de operação
- Resultado (sucesso/falha)
- Detalhes adicionais

### Alertas Automáticos
- Falha na criação de backup
- Espaço em disco baixo
- Arquivos corrompidos detectados
- Limite de rate limiting atingido

## Manutenção Automática

### Limpeza de Arquivos Antigos
- Configurável via `BACKUP_RETENTION_DAYS`
- Execução automática diária
- Preserva sempre os últimos N backups
- Remove apenas backups com status 'success'

### Health Checks
- Verificação de conectividade com banco
- Teste de espaço disponível em disco
- Validação de permissões de escrita
- Verificação de integridade dos backups existentes

## Integração com CI/CD

### Scripts Automatizados
```bash
# Backup diário via cron
0 2 * * * cd /app && npm run backup:create --compress

# Limpeza semanal
0 3 * * 0 cd /app && npm run backup:cleanup 7

# Validação mensal
0 4 1 * * cd /app && npm run backup:validate-all
```

### Códigos de Retorno
- `0`: Operação bem-sucedida
- `1`: Erro de parâmetros
- `2`: Erro de conexão com banco
- `3`: Erro de sistema de arquivos
- `4`: Erro de validação
- `5`: Erro de permissões

## Próximos Passos

1. **Instalação**: Siga o guia de instalação em `docs/instalacao.md`
2. **Configuração**: Configure as variáveis de ambiente
3. **Teste**: Execute um backup de teste via CLI
4. **Interface**: Acesse `/dashboard/backup` para usar a interface web
5. **Automação**: Configure scripts de backup automático

## Suporte e Troubleshooting

Para problemas comuns e soluções, consulte:
- `docs/troubleshooting.md` - Guia de solução de problemas
- `docs/faq.md` - Perguntas frequentes
- Logs do sistema em `/var/log/backup-system.log`

## Contato

Para suporte técnico ou dúvidas sobre o sistema, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.