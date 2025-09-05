# FAQ - Sistema de Backup

## Perguntas Frequentes

### 🚀 Instalação e Configuração

#### **P: Como instalar o sistema de backup?**
**R:** Execute o script de configuração inicial:
```bash
npx tsx scripts/setup-backup-system.ts
```
Ou siga o guia manual em `docs/instalacao.md`.

#### **P: Quais são os pré-requisitos mínimos?**
**R:** 
- Node.js 18+
- PostgreSQL 12+ com pg_dump
- 1GB de espaço livre em disco
- Permissões de escrita no diretório do projeto

#### **P: Onde configurar as variáveis de ambiente?**
**R:** Adicione as configurações no arquivo `.env` na raiz do projeto:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/db
BACKUP_DIRECTORY=/app/backups
BACKUP_RETENTION_DAYS=30
```

### 🔧 Uso Básico

#### **P: Como criar meu primeiro backup?**
**R:** Via interface web:
1. Acesse `/dashboard/backup`
2. Clique em "Criar Backup"
3. Aguarde a conclusão

Via CLI:
```bash
npm run backup:create --compress
```

#### **P: Quanto tempo demora para criar um backup?**
**R:** Depende do tamanho do banco:
- Banco pequeno (< 100MB): 1-2 minutos
- Banco médio (100MB-1GB): 5-15 minutos
- Banco grande (> 1GB): 15+ minutos

#### **P: Como fazer download de um backup?**
**R:** 
1. Na página de backup, localize o arquivo na lista
2. Clique no botão "Download" (ícone de seta)
3. O sistema validará a integridade antes do download
4. O arquivo será baixado automaticamente

### 🔐 Permissões e Segurança

#### **P: Quais roles podem criar backups?**
**R:** Apenas usuários com roles:
- **SUPERADMIN**: Acesso completo
- **ADMIN**: Acesso completo
- **SUPERVISOR**: Apenas visualização e download
- **USUARIO**: Sem acesso

#### **P: Como alterar as permissões de um usuário?**
**R:** Execute no banco de dados:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'usuario@exemplo.com';
```

#### **P: Os backups são seguros?**
**R:** Sim, o sistema implementa:
- Validação de integridade com checksums
- Controle de acesso baseado em roles
- Rate limiting para prevenir abuso
- Logs de auditoria de todas as operações

### 📁 Gerenciamento de Arquivos

#### **P: Onde ficam armazenados os backups?**
**R:** Por padrão em `/app/backups/files/`. Configure via `BACKUP_DIRECTORY`.

#### **P: Como são nomeados os arquivos de backup?**
**R:** Formato automático: `backup_YYYY-MM-DD_HH-mm-ss.sql`
Exemplo: `backup_2025-01-09_14-30-00.sql`

#### **P: Posso usar nomes personalizados?**
**R:** Sim, via CLI:
```bash
npm run backup:create --name "meu-backup-especial"
```

#### **P: Como excluir backups antigos?**
**R:** 
- **Interface web**: Clique no botão "Excluir" na lista
- **CLI**: `npm run backup:cleanup 30` (remove backups com mais de 30 dias)
- **Automático**: Configure limpeza automática

### 🛠️ CLI (Linha de Comando)

#### **P: Quais comandos CLI estão disponíveis?**
**R:** 
```bash
npm run backup:create [options]    # Criar backup
npm run backup:list               # Listar backups
npm run backup:validate <id>      # Validar integridade
npm run backup:cleanup <days>     # Limpar antigos
npm run backup:info <id>          # Informações detalhadas
```

#### **P: Como automatizar backups diários?**
**R:** Configure um cron job:
```bash
# Adicionar ao crontab
0 2 * * * cd /app && npm run backup:create --compress
```

#### **P: Como usar a CLI em scripts?**
**R:** A CLI retorna códigos de saída apropriados:
```bash
#!/bin/bash
if npm run backup:create --compress; then
    echo "Backup criado com sucesso"
else
    echo "Falha no backup" >&2
    exit 1
fi
```

### 🔍 Validação e Integridade

#### **P: Como verificar se um backup está íntegro?**
**R:** 
- **Automático**: O sistema valida durante a criação
- **Manual**: `npm run backup:validate <backup-id>`
- **Interface**: Status é exibido na lista de backups

#### **P: O que significa "checksum inválido"?**
**R:** O arquivo foi modificado ou corrompido após a criação. Recomendações:
1. Não edite arquivos de backup manualmente
2. Crie um novo backup
3. Verifique integridade do sistema de arquivos

#### **P: Como restaurar um backup?**
**R:** O sistema cria backups, mas não restaura automaticamente. Para restaurar:
```bash
# Fazer download do backup
# Depois executar:
psql $DATABASE_URL < backup_2025-01-09_14-30-00.sql
```

### ⚡ Performance e Otimização

#### **P: Como acelerar a criação de backups?**
**R:** 
1. Use compressão: `--compress`
2. Configure `BACKUP_MAX_CONCURRENT=2`
3. Use SSD para armazenamento
4. Otimize o banco (VACUUM, REINDEX)

#### **P: Backup está consumindo muito espaço?**
**R:** 
1. Sempre use compressão (reduz 70-80%)
2. Configure limpeza automática
3. Considere backup incremental para bancos muito grandes

#### **P: Interface web trava durante backup?**
**R:** 
1. Use CLI para backups grandes
2. Verifique se o progresso está sendo atualizado
3. Não feche o navegador durante o processo

### 🚨 Problemas Comuns

#### **P: "Permission denied" ao criar backup**
**R:** 
1. Verifique permissões do diretório: `ls -la backups/`
2. Ajuste permissões: `chmod 755 backups/`
3. Verifique se o usuário tem acesso de escrita

#### **P: "Database connection failed"**
**R:** 
1. Verifique `DATABASE_URL`
2. Teste conexão: `psql $DATABASE_URL -c "SELECT 1;"`
3. Verifique se PostgreSQL está rodando

#### **P: "pg_dump not found"**
**R:** 
1. Instale PostgreSQL client: `apt-get install postgresql-client`
2. Configure caminho: `PGDUMP_PATH=/usr/bin/pg_dump`
3. Verifique PATH: `which pg_dump`

#### **P: Backup muito lento**
**R:** 
1. Verifique tamanho do banco
2. Use compressão
3. Aumente timeout: `PGDUMP_TIMEOUT=7200`
4. Considere horários de menor uso

### 🔄 Automação e Integração

#### **P: Como integrar com CI/CD?**
**R:** Exemplo para GitHub Actions:
```yaml
- name: Create backup
  run: npm run backup:create --compress
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### **P: Como receber notificações de backup?**
**R:** Configure scripts personalizados:
```bash
#!/bin/bash
if npm run backup:create; then
    echo "Backup OK" | mail -s "Backup Success" admin@empresa.com
fi
```

#### **P: Posso fazer backup de tabelas específicas?**
**R:** Atualmente o sistema faz backup completo. Para tabelas específicas, use pg_dump diretamente:
```bash
pg_dump $DATABASE_URL -t tabela_especifica > backup_tabela.sql
```

### 📊 Monitoramento

#### **P: Como monitorar o sistema de backup?**
**R:** 
1. Verifique logs em `/logs/backup-system.log`
2. Use endpoint de monitoramento: `/api/backup/monitoring`
3. Configure alertas para falhas

#### **P: Onde ver estatísticas de backup?**
**R:** 
- **Interface web**: Dashboard de backup
- **CLI**: `npm run backup:list --format json`
- **API**: `GET /api/backup/list`

#### **P: Como configurar alertas?**
**R:** Configure monitoramento externo que verifica:
- Endpoint de health: `/api/backup/health`
- Logs de erro
- Idade do último backup bem-sucedido

### 🔧 Configuração Avançada

#### **P: Como configurar múltiplos ambientes?**
**R:** Use arquivos de configuração separados:
```bash
# Desenvolvimento
npm run backup:create --config development

# Produção  
npm run backup:create --config production
```

#### **P: Posso personalizar o formato dos backups?**
**R:** Configure opções do pg_dump no `backupService.ts`:
```typescript
const pgDumpOptions = [
  '--verbose',
  '--no-owner',
  '--no-privileges',
  '--format=custom'  // Formato binário
];
```

#### **P: Como configurar backup incremental?**
**R:** Atualmente não suportado nativamente. Considere:
1. WAL-E ou WAL-G para PostgreSQL
2. Backup diferencial baseado em timestamps
3. Replicação streaming

### 📞 Suporte

#### **P: Onde buscar ajuda?**
**R:** 
1. **Documentação**: `docs/` (sempre consulte primeiro)
2. **Troubleshooting**: `docs/troubleshooting.md`
3. **Logs**: Verifique logs detalhados
4. **Suporte técnico**: Para problemas críticos

#### **P: Como reportar bugs?**
**R:** Inclua sempre:
- Versão do Node.js e PostgreSQL
- Logs de erro completos
- Passos para reproduzir
- Configuração (sem senhas)

#### **P: Há roadmap de novas funcionalidades?**
**R:** Funcionalidades planejadas:
- Backup incremental
- Criptografia de arquivos
- Interface de restauração
- Backup para cloud storage
- Notificações por email/Slack

### 💡 Dicas e Boas Práticas

#### **P: Qual a frequência ideal de backup?**
**R:** 
- **Desenvolvimento**: Diário ou antes de mudanças importantes
- **Staging**: 2x por dia
- **Produção**: A cada 4-6 horas + backup antes de deploys

#### **P: Como testar se os backups funcionam?**
**R:** 
1. Crie backup de teste regularmente
2. Valide integridade: `npm run backup:validate`
3. Teste restauração em ambiente separado
4. Monitore logs de erro

#### **P: Devo fazer backup durante horário comercial?**
**R:** 
- **Bancos pequenos**: Sem problema
- **Bancos grandes**: Prefira madrugada (menor uso)
- **Produção crítica**: Use réplicas read-only para backup

#### **P: Como organizar backups de longo prazo?**
**R:** Estratégia 3-2-1:
- 3 cópias dos dados
- 2 mídias diferentes
- 1 cópia offsite

Configure retenção escalonada:
- Diários: 7 dias
- Semanais: 4 semanas  
- Mensais: 12 meses
- Anuais: 5+ anos