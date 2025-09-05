# Sistema de Backup de Banco de Dados

## 🚀 Início Rápido

### Instalação Automática
```bash
# Configuração completa em um comando
npm run backup:setup
```

### Primeiro Backup
```bash
# Via CLI
npm run backup:create --compress

# Via interface web
# Acesse: http://localhost:3000/dashboard/backup
```

## 📚 Documentação Completa

### Guias Principais
- **[📖 Documentação Completa](sistema-backup-completo.md)** - Visão geral do sistema
- **[⚙️ Guia de Instalação](instalacao.md)** - Instalação passo a passo
- **[👤 Guia do Usuário](guia-usuario.md)** - Como usar a interface web
- **[💻 Guia da CLI](guia-cli.md)** - Comandos de linha de comando
- **[🔧 Troubleshooting](troubleshooting.md)** - Solução de problemas
- **[❓ FAQ](faq.md)** - Perguntas frequentes

### Documentação Técnica
- **[🔒 Sistema de Segurança](backup-security-system.md)** - Controle de acesso e auditoria
- **[📊 Sistema de Monitoramento](backup-monitoring-system.md)** - Métricas e alertas
- **[⚠️ Tratamento de Erros](backup-error-handling.md)** - Gestão de falhas
- **[💻 CLI](backup-cli.md)** - Interface de linha de comando

## 🎯 Funcionalidades

### ✅ Interface Web
- Criação de backups com interface intuitiva
- Visualização do histórico de backups
- Download seguro de arquivos
- Monitoramento em tempo real
- Controle de acesso por roles

### ✅ Linha de Comando (CLI)
- Automação completa via scripts
- Integração com CI/CD
- Validação de integridade
- Limpeza automática de arquivos antigos

### ✅ Segurança
- Controle de acesso baseado em roles
- Validação de integridade com checksums
- Rate limiting e proteção contra abuso
- Logs de auditoria detalhados

### ✅ Monitoramento
- Métricas de performance
- Alertas automáticos
- Health checks
- Dashboard de estatísticas

## 🛠️ Comandos Disponíveis

### Configuração e Deploy
```bash
npm run backup:setup              # Configuração inicial
npm run backup:validate-env       # Validar ambiente
npm run backup:deploy:dev         # Deploy desenvolvimento
npm run backup:deploy:staging     # Deploy staging
npm run backup:deploy:prod        # Deploy produção
```

### Operações de Backup
```bash
npm run backup:create             # Criar backup
npm run backup:list               # Listar backups
npm run backup:validate <id>      # Validar integridade
npm run backup:cleanup <days>     # Limpar antigos
npm run backup:info <id>          # Informações detalhadas
```

### Monitoramento
```bash
npm run backup:monitoring:start   # Iniciar monitoramento
npm run backup:monitoring:test    # Testar monitoramento
```

### Testes
```bash
npm run test:integration          # Testes de integração
npm run test:integration:api      # Testes de API
npm run test:integration:auth     # Testes de autenticação
npm run test:integration:files    # Testes de arquivos
```

## 🔧 Configuração Rápida

### Variáveis de Ambiente Essenciais
```env
# Banco de dados
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Autenticação
NEXTAUTH_SECRET=sua_chave_secreta_muito_longa
NEXTAUTH_URL=http://localhost:3000

# Backup
BACKUP_DIRECTORY=/app/backups
BACKUP_RETENTION_DAYS=30
BACKUP_ENABLE_COMPRESSION=true
```

### Estrutura de Arquivos
```
projeto/
├── src/
│   ├── services/backup*.ts      # Serviços de backup
│   ├── components/backup/       # Componentes React
│   ├── app/api/backup/         # Endpoints da API
│   └── lib/auth/backupAuth.ts  # Autenticação
├── scripts/
│   ├── backup-cli.ts           # Interface CLI
│   ├── setup-backup-system.ts # Configuração inicial
│   └── deploy-backup-system.sh # Script de deploy
├── backups/
│   ├── registry.json           # Metadados
│   └── files/                  # Arquivos de backup
└── docs/                       # Documentação
```

## 🔐 Permissões por Role

| Funcionalidade | SUPERADMIN | ADMIN | SUPERVISOR | USUARIO |
|----------------|------------|-------|------------|---------|
| Criar Backup   | ✅         | ✅    | ❌         | ❌      |
| Listar Backups | ✅         | ✅    | ✅         | ❌      |
| Download       | ✅         | ✅    | ✅         | ❌      |
| Excluir Backup | ✅         | ✅    | ❌         | ❌      |
| CLI Access     | ✅         | ✅    | ❌         | ❌      |

## 📊 Monitoramento

### Métricas Coletadas
- Taxa de sucesso dos backups
- Tempo médio de criação
- Tamanho dos arquivos
- Uso de espaço em disco
- Frequência de erros

### Endpoints de Monitoramento
- `GET /api/backup/monitoring` - Métricas gerais
- `GET /api/backup/health` - Health check
- `GET /api/backup/audit` - Logs de auditoria

## 🚨 Troubleshooting Rápido

### Problemas Comuns

#### "Permission denied"
```bash
chmod 755 backups/
sudo chown -R $USER:$USER backups/
```

#### "Database connection failed"
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

#### "pg_dump not found"
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### Logs e Diagnóstico
```bash
# Logs do sistema
tail -f logs/backup-system.log

# Validação completa
npm run backup:validate-env

# Teste de conectividade
psql $DATABASE_URL -c "SELECT version();"
```

## 🔄 Automação

### Backup Diário (Cron)
```bash
# Adicionar ao crontab
0 2 * * * cd /app && npm run backup:create --compress
```

### CI/CD (GitHub Actions)
```yaml
- name: Create backup
  run: npm run backup:create --compress
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Docker
```dockerfile
# Adicionar ao Dockerfile
RUN apt-get update && apt-get install -y postgresql-client
COPY scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.sh
```

## 📈 Roadmap

### Funcionalidades Planejadas
- [ ] Backup incremental
- [ ] Criptografia de arquivos
- [ ] Upload para cloud storage (S3, GCS)
- [ ] Interface de restauração
- [ ] Notificações por email/Slack
- [ ] Backup de múltiplos bancos
- [ ] Compressão avançada
- [ ] Backup streaming para arquivos grandes

### Melhorias Técnicas
- [ ] WebSocket para progresso em tempo real
- [ ] Cache de metadados
- [ ] Paralelização de operações
- [ ] Otimização de performance
- [ ] Testes E2E automatizados

## 🆘 Suporte

### Canais de Ajuda
1. **Documentação**: Sempre consulte primeiro
2. **FAQ**: Perguntas mais comuns
3. **Troubleshooting**: Problemas específicos
4. **Logs**: Informações detalhadas de erro

### Reportar Problemas
Inclua sempre:
- Versão do Node.js e PostgreSQL
- Logs de erro completos
- Passos para reproduzir
- Configuração (sem senhas)

### Contribuição
- Reporte bugs e sugestões
- Contribua com documentação
- Submeta pull requests
- Compartilhe casos de uso

## 📄 Licença

Este sistema de backup é parte do projeto principal e segue a mesma licença.

---

**💡 Dica**: Para começar rapidamente, execute `npm run backup:setup` e siga as instruções na tela!