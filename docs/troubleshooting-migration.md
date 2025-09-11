# Guia de Troubleshooting - Migração Prisma

## Problemas Comuns e Soluções

Este guia aborda problemas comuns que podem ocorrer após a migração do uso direto do Prisma para arquitetura baseada em APIs.

## Erros de Compilação

### Erro: "Cannot find module '@prisma/client'"

**Sintoma**: Erro de compilação indicando que tipos do Prisma não são encontrados.

**Causa**: Import de tipos do Prisma em componentes do frontend.

**Solução**:
```typescript
// ❌ Incorreto - no frontend
import { Attendant } from '@prisma/client';

// ✅ Correto - usar tipos locais
import { AttendantData } from '@/types/attendant';
```

### Erro: "PrismaClient is not a constructor"

**Sintoma**: Erro ao tentar instanciar novo PrismaClient.

**Causa**: Tentativa de criar nova instância ao invés de usar singleton.

**Solução**:
```typescript
// ❌ Incorreto
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ✅ Correto
import { prisma } from '@/lib/prisma';
```

## Erros de Runtime

### Erro: "fetch is not defined"

**Sintoma**: Erro ao executar API clients em ambiente servidor.

**Causa**: API clients sendo executados no servidor sem polyfill do fetch.

**Solução**:
```typescript
// Verificar se está no cliente antes de usar API clients
if (typeof window !== 'undefined') {
  const data = await DashboardApiClient.getStats();
}

// Ou usar diretamente o Prisma em Server Components
import { prisma } from '@/lib/prisma';
const data = await prisma.attendant.findMany();
```

### Erro: "Too many connections"

**Sintoma**: Erro de muitas conexões com o banco de dados.

**Causa**: Múltiplas instâncias do PrismaClient ainda sendo criadas.

**Diagnóstico**:
```bash
# Verificar se ainda há instâncias diretas
node scripts/find-prisma-usage.js
```

**Solução**: Substituir todas as instâncias por singleton:
```typescript
// ❌ Incorreto
const prisma = new PrismaClient();

// ✅ Correto
import { prisma } from '@/lib/prisma';
```

## Problemas de Performance

### Dashboard Lento

**Sintoma**: Dashboard demora mais de 3 segundos para carregar.

**Diagnóstico**:
1. Verificar logs do servidor para queries lentas
2. Analisar Network tab no DevTools
3. Verificar se há N+1 queries

**Soluções**:
```typescript
// ✅ Usar include para evitar N+1
const attendants = await prisma.attendant.findMany({
  include: {
    evaluations: true,
    xpEvents: true
  }
});

// ✅ Usar agregações no banco
const stats = await prisma.evaluation.aggregate({
  _avg: { rating: true },
  _count: { id: true }
});
```

### API Timeout

**Sintoma**: APIs retornando timeout após 30 segundos.

**Causa**: Queries complexas sem otimização.

**Solução**:
```typescript
// ✅ Adicionar índices no banco
// ✅ Usar paginação
const evaluations = await prisma.evaluation.findMany({
  take: 50,
  skip: offset,
  orderBy: { createdAt: 'desc' }
});

// ✅ Usar cache para dados que mudam pouco
const cachedStats = await getCachedData('dashboard-stats', async () => {
  return await calculateStats();
});
```

## Problemas de Dados

### Conquistas Não Processadas

**Sintoma**: Conquistas não são desbloqueadas automaticamente.

**Diagnóstico**:
```typescript
// Verificar se o processamento está funcionando
const result = await AchievementApiClient.processAllAchievements();
console.log(result);
```

**Soluções**:
1. Verificar se os critérios estão corretos
2. Executar processamento manual
3. Verificar logs de erro

### Dados Inconsistentes

**Sintoma**: Dados diferentes entre páginas.

**Causa**: Cache desatualizado ou queries inconsistentes.

**Solução**:
```typescript
// ✅ Invalidar cache após mudanças
await updateData();
cache.delete('key');

// ✅ Usar transações para consistência
await prisma.$transaction(async (tx) => {
  await tx.attendant.update({ ... });
  await tx.xpEvent.create({ ... });
});
```

## Problemas de Autenticação

### Erro 401 em APIs

**Sintoma**: APIs retornando "Não autorizado" mesmo com usuário logado.

**Diagnóstico**:
```typescript
// Verificar sessão no cliente
import { useSession } from 'next-auth/react';
const { data: session, status } = useSession();
console.log('Session:', session, 'Status:', status);
```

**Soluções**:
1. Verificar se NextAuth está configurado corretamente
2. Verificar se cookies estão sendo enviados
3. Verificar middleware de autenticação

### Erro 403 - Acesso Negado

**Sintoma**: Usuário logado mas sem permissão para acessar recurso.

**Causa**: Verificação de roles incorreta.

**Solução**:
```typescript
// ✅ Verificar roles corretamente
const allowedRoles = ['ADMIN', 'SUPERADMIN'];
if (!allowedRoles.includes(session.user.role)) {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
```

## Ferramentas de Diagnóstico

### Script de Validação

Execute para verificar se a migração está completa:

```bash
node scripts/find-prisma-usage.js
```

### Verificação de Tipos

```bash
npm run typecheck
```

### Testes de Integração

```bash
npm test -- --testPathPattern=integration
```

### Logs de Debug

Adicione logs para debug:

```typescript
// Em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

## Monitoramento

### Métricas Importantes

1. **Tempo de resposta das APIs**: < 500ms para 95% das requests
2. **Conexões do banco**: Não deve exceder limite configurado
3. **Erros 5xx**: Deve ser < 1% das requests
4. **Tempo de carregamento do dashboard**: < 2 segundos

### Alertas Recomendados

```typescript
// Exemplo de alerta para muitas conexões
if (activeConnections > maxConnections * 0.8) {
  console.warn('Alto número de conexões:', activeConnections);
}
```

## Rollback de Emergência

### Se Necessário Reverter

1. **Backup do código**: Sempre manter backup antes da migração
2. **Feature flags**: Usar para alternar entre versões
3. **Rollback gradual**: Reverter componente por componente

```typescript
// Exemplo de feature flag
const USE_NEW_API = process.env.USE_NEW_DASHBOARD_API === 'true';

if (USE_NEW_API) {
  return await DashboardApiClient.getStats();
} else {
  return await LegacyDashboardService.getStats();
}
```

## Prevenção de Problemas

### Code Review Checklist

- [ ] Não há imports diretos do Prisma no frontend
- [ ] Todas as APIs usam singleton do Prisma
- [ ] Tratamento de erros implementado
- [ ] Validação de entrada com Zod
- [ ] Testes unitários e de integração
- [ ] Autenticação e autorização verificadas

### Padrões a Seguir

1. **Sempre usar API clients no frontend**
2. **Sempre usar singleton do Prisma nas APIs**
3. **Sempre validar entrada com Zod**
4. **Sempre tratar erros adequadamente**
5. **Sempre testar mudanças**

## Contato e Suporte

Para problemas não cobertos neste guia:

1. Verificar logs do servidor
2. Executar scripts de diagnóstico
3. Consultar documentação da API
4. Verificar testes de integração

## Recursos Adicionais

- [Documentação da Arquitetura](./api-architecture.md)
- [Guia de APIs](./api-reference.md)
- [Padrões de Desenvolvimento](./development-patterns.md)