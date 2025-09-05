# Guia de Troubleshooting - Sistema de Backup

## Problemas Comuns e Soluções

### 🔧 Problemas de Instalação e Configuração

#### "Comando backup não encontrado"

**Sintomas:**
- Erro "command not found" ao executar comandos CLI
- Scripts npm não reconhecidos

**Diagnóstico:**
```bash
# Verificar se está no diretório correto
pwd
ls package.json

# Verificar scripts disponíveis
npm run
```

**Soluções:**
1. **Verificar diretório**: Certifique-se de estar na raiz do projeto
2. **Instalar dependências**: Execute `npm install`
3. **Verificar package.json**: Confirme se os scripts de backup estão definidos

#### "Variáveis de ambiente não configuradas"

**Sintomas:**
- Erro de conexão com banco de dados
- Caminhos de backup inválidos

**Diagnóstico:**
```bash
# Verificar variáveis essenciais
echo $DATABASE_URL
echo $BACKUP_DIRECTORY
echo $PGDUMP_PATH
```

**Soluções:**
1. **Criar arquivo .env**:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
BACKUP_DIRECTORY=/app/backups
PGDUMP_PATH=/usr/bin/pg_dump
```

2. **Verificar permissões**: Certifique-se de que o arquivo .env tem permissões corretas
3. **Reiniciar aplicação**: Após alterar variáveis de ambiente

### 🗄️ Problemas de Banco de Dados

#### "Falha na conexão com PostgreSQL"

**Sintomas:**
- Timeout ao conectar com banco
- Erro "connection refused"
- Credenciais inválidas

**Diagnóstico:**
```bash
# Testar conexão manual
psql $DATABASE_URL -c "SELECT version();"

# Verificar se PostgreSQL está rodando
systemctl status postgresql
# ou
brew services list | grep postgresql
```

**Soluções:**
1. **Verificar serviço PostgreSQL**:
```bash
# Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql

# macOS
brew services start postgresql

# Windows
net start postgresql-x64-14
```

2. **Verificar credenciais**: Confirme usuário, senha e nome do banco
3. **Verificar firewall**: Certifique-se de que a porta 5432 está acessível
4. **Verificar pg_hba.conf**: Configurar autenticação adequada

#### "pg_dump não encontrado"

**Sintomas:**
- Erro "pg_dump: command not found"
- Caminho inválido para pg_dump

**Diagnóstico:**
```bash
# Verificar se pg_dump está instalado
which pg_dump
pg_dump --version
```

**Soluções:**
1. **Instalar PostgreSQL client**:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql

# macOS
brew install postgresql

# Windows
# Instalar PostgreSQL completo ou apenas client tools
```

2. **Configurar caminho**:
```env
# No .env, especificar caminho completo
PGDUMP_PATH=/usr/local/bin/pg_dump
```

### 📁 Problemas de Sistema de Arquivos

#### "Permissão negada ao criar backup"

**Sintomas:**
- Erro "Permission denied" ao criar arquivos
- Falha ao escrever no diretório de backup

**Diagnóstico:**
```bash
# Verificar permissões do diretório
ls -la /app/backups/

# Verificar usuário atual
whoami
id
```

**Soluções:**
1. **Ajustar permissões**:
```bash
# Criar diretório se não existir
sudo mkdir -p /app/backups

# Ajustar proprietário
sudo chown -R $USER:$USER /app/backups

# Ajustar permissões
chmod 755 /app/backups
```

2. **Usar diretório alternativo**:
```env
# No .env, usar diretório com permissões adequadas
BACKUP_DIRECTORY=/tmp/backups
```

#### "Espaço insuficiente em disco"

**Sintomas:**
- Erro "No space left on device"
- Backup interrompido por falta de espaço

**Diagnóstico:**
```bash
# Verificar espaço disponível
df -h /app/backups

# Verificar tamanho do banco
psql $DATABASE_URL -c "
SELECT pg_size_pretty(pg_database_size(current_database()));
"
```

**Soluções:**
1. **Liberar espaço**:
```bash
# Remover backups antigos
npm run backup:cleanup 7

# Remover arquivos temporários
sudo rm -rf /tmp/*
```

2. **Usar compressão**:
```bash
# Sempre usar compressão para economizar espaço
npm run backup:create --compress
```

3. **Configurar limpeza automática**:
```bash
# Cron job para limpeza diária
0 3 * * * cd /app && npm run backup:cleanup 30
```

### 🔐 Problemas de Autenticação e Autorização

#### "Usuário sem permissões para backup"

**Sintomas:**
- Erro "Access denied" na interface web
- Botões de backup não aparecem
- API retorna 403 Forbidden

**Diagnóstico:**
```bash
# Verificar role do usuário no banco
psql $DATABASE_URL -c "
SELECT email, role FROM \"User\" WHERE email = 'usuario@exemplo.com';
"
```

**Soluções:**
1. **Ajustar role do usuário**:
```sql
-- Conectar como admin e ajustar role
UPDATE "User" SET role = 'ADMIN' WHERE email = 'usuario@exemplo.com';
```

2. **Verificar configuração de permissões**:
```typescript
// Em backupAuth.ts, verificar se as permissões estão corretas
const backupPermissions = {
  SUPERADMIN: ['create', 'list', 'download', 'delete'],
  ADMIN: ['create', 'list', 'download', 'delete'],
  SUPERVISOR: ['list', 'download'],
  USUARIO: []
};
```

#### "Sessão expirada durante backup"

**Sintomas:**
- Backup interrompido por logout automático
- Erro de autenticação no meio do processo

**Soluções:**
1. **Aumentar timeout da sessão**:
```typescript
// Em next-auth configuration
session: {
  maxAge: 24 * 60 * 60, // 24 horas
}
```

2. **Usar CLI para backups longos**:
```bash
# CLI não depende de sessão web
npm run backup:create --compress
```

### 🚀 Problemas de Performance

#### "Backup muito lento"

**Sintomas:**
- Backup demora horas para completar
- Interface web trava durante backup
- Timeout em operações

**Diagnóstico:**
```bash
# Verificar tamanho do banco
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Verificar processos em execução
ps aux | grep pg_dump
```

**Soluções:**
1. **Otimizar configuração do pg_dump**:
```typescript
// Em backupService.ts, ajustar opções
const pgDumpOptions = [
  '--verbose',
  '--no-owner',
  '--no-privileges',
  '--compress=9',  // Máxima compressão
  '--jobs=4'       // Paralelização (PostgreSQL 9.3+)
];
```

2. **Usar backup incremental** (para bancos muito grandes):
```bash
# Backup apenas de dados modificados recentemente
npm run backup:create --incremental --since="2025-01-08"
```

3. **Aumentar timeout**:
```env
PGDUMP_TIMEOUT=7200  # 2 horas
```

#### "Interface web não responde durante backup"

**Sintomas:**
- Página trava durante criação de backup
- Barra de progresso não atualiza
- Timeout no navegador

**Soluções:**
1. **Implementar WebSocket para progresso**:
```typescript
// Usar polling ou WebSocket para atualizações
const checkProgress = setInterval(async () => {
  const status = await fetch(`/api/backup/status/${backupId}`);
  // Atualizar UI
}, 2000);
```

2. **Executar backup em background**:
```typescript
// Não bloquear a UI durante backup
const backup = await fetch('/api/backup/create', {
  method: 'POST',
  // Não aguardar resposta completa
});
```

### 🔍 Problemas de Validação e Integridade

#### "Backup corrompido detectado"

**Sintomas:**
- Checksum inválido
- Erro ao abrir arquivo SQL
- Dados faltando no backup

**Diagnóstico:**
```bash
# Verificar integridade do arquivo
npm run backup:validate abc123

# Verificar manualmente
file /app/backups/files/backup_2025-01-09_14-30-00.sql
head -n 20 /app/backups/files/backup_2025-01-09_14-30-00.sql
```

**Soluções:**
1. **Recriar backup**:
```bash
# Excluir backup corrompido
npm run backup:delete abc123

# Criar novo backup
npm run backup:create --compress --verbose
```

2. **Verificar sistema de arquivos**:
```bash
# Verificar erros no disco
sudo fsck /dev/sda1

# Verificar logs do sistema
sudo dmesg | grep -i error
```

#### "Checksum não confere"

**Sintomas:**
- Aviso de integridade na validação
- Download bloqueado por falha de checksum

**Soluções:**
1. **Recalcular checksum**:
```bash
# Recalcular e atualizar no registry
npm run backup:recalculate-checksum abc123
```

2. **Verificar se arquivo foi modificado**:
```bash
# Verificar timestamps
stat /app/backups/files/backup_2025-01-09_14-30-00.sql
```

### 🌐 Problemas de Rede e API

#### "Timeout no download de backup"

**Sintomas:**
- Download interrompido
- Erro de timeout no navegador
- Arquivo parcialmente baixado

**Soluções:**
1. **Aumentar timeout do servidor**:
```typescript
// Em next.config.js
module.exports = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10gb',
    },
  },
}
```

2. **Implementar download resumível**:
```typescript
// Suporte a Range requests
res.setHeader('Accept-Ranges', 'bytes');
```

3. **Usar CLI para arquivos grandes**:
```bash
# Download direto via sistema de arquivos
cp /app/backups/files/backup_2025-01-09_14-30-00.sql ~/Downloads/
```

#### "Rate limit atingido"

**Sintomas:**
- Erro 429 Too Many Requests
- Operações bloqueadas temporariamente

**Soluções:**
1. **Aguardar reset do rate limit**:
```bash
# Verificar quando o limite será resetado
curl -I /api/backup/create
# Verificar header X-RateLimit-Reset
```

2. **Ajustar configuração**:
```typescript
// Em backupRateLimit.ts
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Aumentar limite
};
```

### 🔄 Problemas de Automação

#### "Cron job não executa backup"

**Sintomas:**
- Backup automático não roda
- Sem logs de execução
- Cron job silencioso

**Diagnóstico:**
```bash
# Verificar se cron está rodando
systemctl status cron

# Verificar logs do cron
sudo tail -f /var/log/cron

# Testar comando manualmente
cd /app && npm run backup:create
```

**Soluções:**
1. **Verificar sintaxe do crontab**:
```bash
# Editar crontab
crontab -e

# Verificar sintaxe
0 2 * * * cd /app && /usr/bin/npm run backup:create >> /var/log/backup.log 2>&1
```

2. **Usar caminhos absolutos**:
```bash
# Especificar caminhos completos
0 2 * * * cd /app && /usr/bin/node /usr/bin/npm run backup:create
```

3. **Configurar variáveis de ambiente**:
```bash
# No início do crontab
PATH=/usr/local/bin:/usr/bin:/bin
DATABASE_URL=postgresql://...
```

### 📊 Problemas de Monitoramento

#### "Métricas não aparecem no dashboard"

**Sintomas:**
- Dashboard vazio
- Gráficos sem dados
- Estatísticas zeradas

**Diagnóstico:**
```bash
# Verificar se há dados de backup
npm run backup:list --format json

# Verificar logs de monitoramento
tail -f /var/log/backup-monitoring.log
```

**Soluções:**
1. **Verificar configuração do monitoramento**:
```typescript
// Em backupMonitoring.ts
const monitoringConfig = {
  enabled: true,
  collectMetrics: true,
  retentionDays: 30
};
```

2. **Reprocessar métricas**:
```bash
# Reprocessar dados históricos
npm run backup:recalculate-metrics
```

## 🆘 Quando Buscar Ajuda

### Informações para Suporte

Ao reportar problemas, inclua sempre:

1. **Versão do sistema**:
```bash
npm list | grep backup
node --version
psql --version
```

2. **Logs relevantes**:
```bash
# Logs da aplicação
tail -n 100 /var/log/backup-system.log

# Logs do PostgreSQL
tail -n 50 /var/log/postgresql/postgresql.log
```

3. **Configuração (sem senhas)**:
```bash
# Variáveis de ambiente (mascarar senhas)
env | grep BACKUP
env | grep DATABASE_URL | sed 's/:[^@]*@/:***@/'
```

4. **Detalhes do erro**:
- Mensagem de erro completa
- Passos para reproduzir
- Quando o problema começou
- Mudanças recentes no sistema

### Canais de Suporte

1. **Documentação**: Consulte sempre primeiro
2. **Logs do sistema**: Verifique logs detalhados
3. **Comunidade**: Fóruns e discussões
4. **Suporte técnico**: Para problemas críticos

### Escalação de Problemas

**Nível 1 - Problemas Simples:**
- Erros de configuração
- Problemas de permissão
- Dúvidas de uso

**Nível 2 - Problemas Técnicos:**
- Falhas de performance
- Problemas de integração
- Bugs reproduzíveis

**Nível 3 - Problemas Críticos:**
- Perda de dados
- Falhas de segurança
- Sistema completamente inoperante

## 📋 Checklist de Diagnóstico

Antes de reportar problemas, verifique:

- [ ] Sistema operacional e versões
- [ ] Variáveis de ambiente configuradas
- [ ] PostgreSQL rodando e acessível
- [ ] Permissões de arquivo adequadas
- [ ] Espaço em disco suficiente
- [ ] Logs de erro consultados
- [ ] Documentação consultada
- [ ] Problema reproduzível
- [ ] Workarounds tentados