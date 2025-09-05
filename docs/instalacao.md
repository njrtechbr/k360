# Guia de Instalação - Sistema de Backup

## Visão Geral

Este guia fornece instruções detalhadas para instalar e configurar o sistema de backup do banco de dados PostgreSQL. O processo inclui verificação de pré-requisitos, configuração do ambiente e validação da instalação.

## Pré-requisitos

### Software Necessário

#### Node.js 18+
```bash
# Verificar versão instalada
node --version

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# macOS
brew install node

# Windows
# Baixar de https://nodejs.org/
```

#### PostgreSQL Client Tools
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql

# macOS
brew install postgresql

# Windows
# Instalar PostgreSQL completo ou apenas client tools
# https://www.postgresql.org/download/windows/
```

#### Git (opcional, para clonagem)
```bash
# Ubuntu/Debian
sudo apt-get install git

# CentOS/RHEL
sudo yum install git

# macOS
brew install git

# Windows
# Baixar de https://git-scm.com/
```

### Verificação de Pré-requisitos

Execute este script para verificar se tudo está instalado:

```bash
#!/bin/bash
echo "🔍 Verificando pré-requisitos..."

# Node.js
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js não encontrado"
fi

# npm
if command -v npm >/dev/null 2>&1; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm não encontrado"
fi

# PostgreSQL
if command -v psql >/dev/null 2>&1; then
    echo "✅ PostgreSQL: $(psql --version)"
else
    echo "❌ PostgreSQL client não encontrado"
fi

# pg_dump
if command -v pg_dump >/dev/null 2>&1; then
    echo "✅ pg_dump: $(pg_dump --version)"
else
    echo "❌ pg_dump não encontrado"
fi
```

## Instalação Automática

### Opção 1: Script de Setup (Recomendado)

```bash
# 1. Navegue para a raiz do projeto
cd /caminho/para/seu/projeto

# 2. Execute o script de configuração
npx tsx scripts/setup-backup-system.ts

# 3. Siga as instruções na tela
```

### Opção 2: Script de Deploy

```bash
# Para diferentes ambientes
./scripts/deploy-backup-system.sh development
./scripts/deploy-backup-system.sh staging
./scripts/deploy-backup-system.sh production
```

## Instalação Manual

### Passo 1: Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
# Configurações do Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco

# Configurações de Autenticação (NextAuth)
NEXTAUTH_SECRET=sua_chave_secreta_muito_longa_e_segura_aqui
NEXTAUTH_URL=http://localhost:3000

# Configurações de Backup
BACKUP_DIRECTORY=/app/backups
BACKUP_MAX_SIZE_GB=10
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_CONCURRENT=2
BACKUP_ENABLE_COMPRESSION=true
BACKUP_ENABLE_MONITORING=true

# Configurações do PostgreSQL
PGDUMP_PATH=/usr/bin/pg_dump
PGDUMP_TIMEOUT=3600

# Configurações de Segurança
BACKUP_RATE_LIMIT_REQUESTS=10
BACKUP_RATE_LIMIT_WINDOW_MS=900000

# Configurações de Logs
BACKUP_LOG_LEVEL=info
BACKUP_LOG_FILE=/app/logs/backup-system.log
```

### Passo 2: Instalar Dependências

```bash
# Instalar dependências do projeto
npm install

# Verificar se dependências específicas estão instaladas
npm list archiver
```

### Passo 3: Criar Estrutura de Diretórios

```bash
# Criar diretórios necessários
mkdir -p backups/files
mkdir -p backups/temp
mkdir -p logs

# Configurar permissões
chmod 755 backups
chmod 755 backups/files
chmod 755 backups/temp
chmod 755 logs
```

### Passo 4: Inicializar Registry de Backups

Crie o arquivo `backups/registry.json`:

```json
{
  "backups": [],
  "lastCleanup": "2025-01-09T12:00:00.000Z",
  "settings": {
    "maxBackups": 50,
    "retentionDays": 30,
    "defaultDirectory": "/app/backups",
    "enableCompression": true,
    "enableMonitoring": true
  },
  "version": "1.0.0",
  "createdAt": "2025-01-09T12:00:00.000Z"
}
```

### Passo 5: Configurar Scripts no package.json

Adicione os scripts de backup ao `package.json`:

```json
{
  "scripts": {
    "backup:create": "tsx scripts/backup-cli.ts create",
    "backup:list": "tsx scripts/backup-cli.ts list",
    "backup:validate": "tsx scripts/backup-cli.ts validate",
    "backup:cleanup": "tsx scripts/backup-cli.ts cleanup",
    "backup:info": "tsx scripts/backup-cli.ts info",
    "backup:help": "tsx scripts/backup-cli.ts --help"
  }
}
```

## Configuração por Ambiente

### Desenvolvimento

```env
# .env.development
BACKUP_DIRECTORY=./backups
BACKUP_MAX_SIZE_GB=5
BACKUP_RETENTION_DAYS=7
BACKUP_LOG_LEVEL=debug
BACKUP_RATE_LIMIT_REQUESTS=20
```

### Staging

```env
# .env.staging
BACKUP_DIRECTORY=/app/backups
BACKUP_MAX_SIZE_GB=10
BACKUP_RETENTION_DAYS=14
BACKUP_LOG_LEVEL=info
BACKUP_RATE_LIMIT_REQUESTS=15
```

### Produção

```env
# .env.production
BACKUP_DIRECTORY=/app/backups
BACKUP_MAX_SIZE_GB=50
BACKUP_RETENTION_DAYS=30
BACKUP_LOG_LEVEL=warn
BACKUP_RATE_LIMIT_REQUESTS=10
```

## Validação da Instalação

### Passo 1: Executar Validação Automática

```bash
# Validar ambiente completo
npx tsx scripts/validate-backup-environment.ts
```

### Passo 2: Teste Manual de Conectividade

```bash
# Testar conexão com banco
psql $DATABASE_URL -c "SELECT version();"

# Testar pg_dump
pg_dump --version
```

### Passo 3: Criar Backup de Teste

```bash
# Teste via CLI
npm run backup:create -- --verbose --name "teste-instalacao"

# Verificar se foi criado
npm run backup:list
```

### Passo 4: Testar Interface Web

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse `http://localhost:3000/dashboard/backup`

3. Faça login com usuário ADMIN ou SUPERADMIN

4. Teste criar um backup pela interface

## Configuração de Segurança

### Permissões de Arquivo

```bash
# Configurar permissões adequadas
chmod 600 .env                    # Apenas proprietário pode ler
chmod 755 backups/               # Diretório acessível
chmod 644 backups/registry.json  # Arquivo de registry legível
chmod 755 logs/                  # Diretório de logs acessível
```

### Configuração de Firewall (Produção)

```bash
# Ubuntu/Debian com ufw
sudo ufw allow 3000/tcp  # Apenas se necessário
sudo ufw allow 5432/tcp  # PostgreSQL (apenas para IPs específicos)

# CentOS/RHEL com firewalld
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

### Configuração de Usuário PostgreSQL

```sql
-- Criar usuário específico para backups (opcional)
CREATE USER backup_user WITH PASSWORD 'senha_segura';
GRANT CONNECT ON DATABASE seu_banco TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_user;

-- Atualizar DATABASE_URL
-- postgresql://backup_user:senha_segura@localhost:5432/seu_banco
```

## Configuração de Monitoramento

### Logs do Sistema

```bash
# Configurar rotação de logs (logrotate)
sudo tee /etc/logrotate.d/backup-system << EOF
/app/logs/backup-system.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
}
EOF
```

### Health Checks

```bash
# Script de health check
#!/bin/bash
# health-check.sh

# Verificar se o serviço está rodando
if curl -f http://localhost:3000/api/backup/health >/dev/null 2>&1; then
    echo "✅ Serviço de backup OK"
else
    echo "❌ Serviço de backup com problemas"
    exit 1
fi

# Verificar último backup
LAST_BACKUP=$(npm run backup:list --format json | jq -r '.backups[0].createdAt')
if [[ -n "$LAST_BACKUP" ]]; then
    echo "✅ Último backup: $LAST_BACKUP"
else
    echo "⚠️ Nenhum backup encontrado"
fi
```

## Automação (Produção)

### Cron Jobs

```bash
# Editar crontab
crontab -e

# Adicionar jobs
# Backup diário às 2h
0 2 * * * cd /app && npm run backup:create --compress >> /var/log/backup-cron.log 2>&1

# Limpeza semanal aos domingos às 3h
0 3 * * 0 cd /app && npm run backup:cleanup 30 >> /var/log/backup-cleanup.log 2>&1

# Health check a cada 30 minutos
*/30 * * * * /app/scripts/health-check.sh >> /var/log/backup-health.log 2>&1
```

### Systemd Service (Opcional)

```ini
# /etc/systemd/system/backup-system.service
[Unit]
Description=Sistema de Backup de Banco de Dados
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Ativar serviço
sudo systemctl enable backup-system
sudo systemctl start backup-system
sudo systemctl status backup-system
```

## Troubleshooting da Instalação

### Problemas Comuns

#### "Node.js version not supported"
```bash
# Atualizar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### "pg_dump not found"
```bash
# Instalar PostgreSQL client
sudo apt-get install postgresql-client

# Ou especificar caminho completo
export PGDUMP_PATH=/usr/local/bin/pg_dump
```

#### "Permission denied"
```bash
# Ajustar proprietário dos diretórios
sudo chown -R $USER:$USER /app/backups
sudo chmod -R 755 /app/backups
```

#### "Database connection failed"
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql $DATABASE_URL -c "SELECT 1;"

# Verificar firewall
sudo ufw status
```

### Logs de Diagnóstico

```bash
# Verificar logs de instalação
tail -f /var/log/backup-system.log

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# Verificar logs do sistema
sudo journalctl -u backup-system -f
```

## Próximos Passos

Após a instalação bem-sucedida:

1. **Leia a documentação**:
   - `docs/guia-usuario.md` - Como usar a interface web
   - `docs/guia-cli.md` - Como usar a linha de comando
   - `docs/faq.md` - Perguntas frequentes

2. **Configure automação**:
   - Backups regulares via cron
   - Limpeza automática de arquivos antigos
   - Monitoramento e alertas

3. **Teste em produção**:
   - Crie backups de teste
   - Valide integridade
   - Teste processo de restauração

4. **Monitore o sistema**:
   - Verifique logs regularmente
   - Configure alertas para falhas
   - Monitore uso de espaço em disco

## Suporte

Para problemas durante a instalação:

1. **Consulte a documentação**: `docs/troubleshooting.md`
2. **Verifique logs**: Sempre examine os logs de erro
3. **Execute validação**: Use o script de validação de ambiente
4. **Contate suporte**: Para problemas não resolvidos

## Checklist de Instalação

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL client tools instalados
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências npm instaladas
- [ ] Diretórios criados com permissões adequadas
- [ ] Registry de backups inicializado
- [ ] Scripts de backup configurados
- [ ] Validação de ambiente executada
- [ ] Backup de teste criado com sucesso
- [ ] Interface web testada
- [ ] Automação configurada (produção)
- [ ] Monitoramento configurado
- [ ] Documentação revisada