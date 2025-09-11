# Plano de Ação: Migração Prisma → API

## Situação Atual
**175 itens identificados** que precisam ser migrados do uso direto do Prisma para APIs.

## Priorização por Impacto

### 🚨 PRIORIDADE CRÍTICA - Frontend (18 itens)

Estes são os únicos que realmente afetam o frontend e precisam ser migrados IMEDIATAMENTE:

#### Serviços que Usam Prisma Diretamente no Frontend:
1. **`src/services/realtimeDashboardService.ts`** - Dashboard em tempo real
2. **`src/services/dashboardService.ts`** - Estatísticas gerais  
3. **`src/services/achievementProcessor.ts`** - Processamento de conquistas
4. **`src/services/gamification/achievement-checker.service.ts`** - Verificação de conquistas

#### Serviços Prisma Legados (Frontend):
5. **`src/services/userPrismaService.ts`** - ❌ REMOVER
6. **`src/services/attendantPrismaService.ts`** - ❌ REMOVER  
7. **`src/services/evaluationPrismaService.ts`** - ❌ REMOVER

### 🟡 PRIORIDADE MÉDIA - APIs Backend (157 itens)

Estes estão nas APIs (src/app/api) e são menos críticos, mas devem ser organizados:

#### APIs Ainda Usando Serviços Prisma Legados (66 itens):
- Endpoints de `/api/attendants/*` usando `AttendantPrismaService`
- Endpoints de `/api/evaluations/*` usando `EvaluationPrismaService`  
- Endpoints de `/api/users/*` usando `UserPrismaService`

#### APIs com `new PrismaClient()` (43 itens):
- Múltiplas instâncias do Prisma Client nas APIs
- Deveria usar instância singleton de `@/lib/prisma`

#### Tipos Prisma (48 arquivos):
- Imports de tipos do `@prisma/client` que podem ser mantidos

## Plano de Execução

### FASE 1: Migração Crítica do Frontend (1-2 dias)

#### 1.1 Criar API Clients para Dashboard
```bash
# Criar novos API clients
src/services/dashboardApiClient.ts
src/services/achievementApiClient.ts
```

#### 1.2 Criar Endpoints de Dashboard
```bash
# Novos endpoints necessários
src/app/api/dashboard/realtime/route.ts
src/app/api/dashboard/metrics/route.ts
src/app/api/achievements/process/route.ts
src/app/api/achievements/check/route.ts
```

#### 1.3 Migrar Serviços do Frontend
- [ ] Substituir `RealtimeDashboardService` por `DashboardApiClient`
- [ ] Substituir `DashboardService` por `DashboardApiClient`
- [ ] Substituir `AchievementProcessor` por `AchievementApiClient`
- [ ] Remover serviços Prisma legados do frontend

### FASE 2: Limpeza das APIs (3-5 dias)

#### 2.1 Migrar APIs para Usar API Clients
- [ ] Atualizar endpoints `/api/attendants/*` para usar `AttendantApiClient`
- [ ] Atualizar endpoints `/api/evaluations/*` para usar `EvaluationApiClient`
- [ ] Atualizar endpoints `/api/users/*` para usar `UserApiClient`

#### 2.2 Padronizar Uso do Prisma nas APIs
- [ ] Substituir `new PrismaClient()` por `import { prisma } from '@/lib/prisma'`
- [ ] Consolidar instâncias do Prisma Client

### FASE 3: Otimização de Tipos (1 dia)

#### 3.1 Avaliar Tipos Prisma
- [ ] Manter tipos necessários para APIs
- [ ] Criar tipos locais para frontend quando necessário
- [ ] Remover imports desnecessários

## Comandos de Execução

### Verificar Progresso
```bash
node scripts/find-prisma-usage.js
```

### Executar Testes
```bash
npm test
npm run test:coverage
```

### Validar Build
```bash
npm run build
npm run typecheck
```

## Arquivos Críticos para Migração Imediata

### Para Criar:
- `src/services/dashboardApiClient.ts`
- `src/services/achievementApiClient.ts`
- `src/app/api/dashboard/realtime/route.ts`
- `src/app/api/dashboard/metrics/route.ts`
- `src/app/api/achievements/process/route.ts`

### Para Remover:
- `src/services/userPrismaService.ts`
- `src/services/attendantPrismaService.ts`
- `src/services/evaluationPrismaService.ts`

### Para Migrar:
- `src/services/realtimeDashboardService.ts` → API calls
- `src/services/dashboardService.ts` → API calls
- `src/services/achievementProcessor.ts` → API calls

## Riscos e Mitigações

### Alto Risco:
- **Dashboard quebrar**: Implementar feature flags durante migração
- **Performance degradar**: Otimizar queries nas novas APIs
- **Testes falharem**: Atualizar mocks e testes gradualmente

### Mitigações:
- Manter serviços antigos até migração completa
- Implementar testes de integração para novas APIs
- Usar versionamento de API se necessário

## Critérios de Sucesso

### Fase 1 Completa:
- ✅ Zero uso direto do Prisma no frontend
- ✅ Dashboard funcionando via APIs
- ✅ Conquistas processadas via APIs
- ✅ Todos os testes passando

### Fase 2 Completa:
- ✅ APIs usando padrão consistente
- ✅ Serviços Prisma legados removidos
- ✅ Instâncias Prisma consolidadas

### Fase 3 Completa:
- ✅ Tipos organizados e otimizados
- ✅ Build limpo sem warnings
- ✅ Documentação atualizada

## Próximo Passo Imediato

**COMEÇAR AGORA**: Criar `src/services/dashboardApiClient.ts` e migrar o `RealtimeDashboardService` por ser o mais crítico para o funcionamento do dashboard.