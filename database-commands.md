# Comandos de Banco de Dados

## Prisma Studio
```bash
# Abrir interface visual
npx prisma studio

# Gerar cliente após mudanças
npx prisma generate

# Aplicar mudanças no schema
npx prisma db push

# Criar migração
npx prisma migrate dev --name nome_da_migracao

# Resetar banco (CUIDADO!)
npx prisma db reset
```

## Scripts de Verificação
```bash
# Verificar integridade do sistema
node verify-system-integrity.js

# Verificar usuários
node verify-user-integrity.js

# Corrigir módulos dos usuários
node fix-user-modules.js

# Testar APIs
node test-user-management.js

# Debug de sessão NextAuth
node debug-nextauth-session.js
```

## Desenvolvimento
```bash
# Iniciar servidor
npm run dev

# Executar testes
npm test

# Popular banco com dados iniciais
npm run db:seed

# Executar helper de migração
npx ts-node scripts/migration-helper.ts
```

## PostgreSQL Direto (se necessário)
```bash
# Conectar ao banco
psql $DATABASE_URL

# Backup
pg_dump $DATABASE_URL > backup.sql

# Restaurar
psql $DATABASE_URL < backup.sql
```