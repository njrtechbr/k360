# Análise de Migração do Prisma para API

## Resumo Executivo

A refatoração para usar APIs foi implementada, mas ainda existem **serviços e componentes usando Prisma diretamente** no frontend. Esta análise identifica todos os pontos que precisam ser migrados.

## Status Atual

### ✅ Já Migrados para API
- `UserApiClient` - Substituindo `UserPrismaService`
- `AttendantApiClient` - Substituindo `AttendantPrismaService` 
- `EvaluationApiClient` - Substituindo `EvaluationPrismaService`
- `GamificationApiClient` - Para funcionalidades de gamificação
- `ModuleApiClient` - Para gerenciamento de módulos
- `RhApiClient` - Para configurações de RH
- `XpAvulsoApiClient` - Para sistema de XP avulso

### ❌ Problemas Encontrados (175 itens total)

**🔴 Críticos (61 itens):**
- 18 imports diretos do Prisma no frontend
- 43 instâncias de `new PrismaClient()` fora das APIs

**🟡 Para Migrar (48 itens):**
- Serviços de Dashboard usando Prisma diretamente
- Serviços de Achievement usando Prisma diretamente

**🟠 Para Remover (66 itens):**
- Serviços Prisma legados ainda sendo usados nas APIs
- Imports e referências aos serviços antigos

**📝 Tipos Prisma (54 arquivos):**
- Arquivos importando tipos do `@prisma/client`

### ❌ Ainda Usando Prisma Diretamente

#### Serviços Críticos que Precisam Migrar

1. **`RealtimeDashboardService`** (`src/services/realtimeDashboardService.ts`)
   - **Impacto**: Alto - usado no dashboard principal
   - **Uso**: Métricas em tempo real, estatísticas, alertas
   - **Prisma**: `new PrismaClient()` + queries complexas

2. **`DashboardService`** (`src/services/dashboardService.ts`)
   - **Impacto**: Alto - estatísticas gerais do dashboard
   - **Uso**: Estatísticas gerais, relatórios
   - **Prisma**: `new PrismaClient()` + agregações

3. **`AchievementProcessor`** (`src/services/achievementProcessor.ts`)
   - **Impacto**: Médio - processamento de conquistas
   - **Uso**: Verificação automática de conquistas
   - **Prisma**: `new PrismaClient()` + lógica de conquistas

4. **Achievement Checker Service** (`src/services/gamification/achievement-checker.service.ts`)
   - **Impacto**: Médio - verificação de conquistas
   - **Uso**: Validação de critérios de conquistas
   - **Prisma**: `new PrismaClient()` + queries de validação

#### Serviços Prisma Legados (Para Remoção)

1. **`UserPrismaService`** (`src/services/userPrismaService.ts`)
   - **Status**: Substituído por `UserApiClient`
   - **Ação**: Remover após migração completa

2. **`AttendantPrismaService`** (`src/services/attendantPrismaService.ts`)
   - **Status**: Substituído por `AttendantApiClient`
   - **Ação**: Remover após migração completa

3. **`EvaluationPrismaService`** (`src/services/evaluationPrismaService.ts`)
   - **Status**: Substituído por `EvaluationApiClient`
   - **Ação**: Remover após migração completa

#### Dependências de Tipos Prisma

Vários arquivos ainda importam tipos do `@prisma/client`:

```typescript
// Arquivos que importam tipos do Prisma
- src/services/gamificationApiClient.ts
- src/services/backupAuditLog.ts
- src/lib/auth/backupAuth.ts
- src/lib/errors.ts
- src/lib/rateLimit/backupRateLimit.ts
- src/lib/middleware/backupSecurityMiddleware.ts
```

## Plano de Migração

### Fase 1: Criar APIs para Serviços Críticos

#### 1.1 Dashboard APIs
- [ ] `GET /api/dashboard/metrics` - Métricas gerais
- [ ] `GET /api/dashboard/realtime` - Métricas em tempo real
- [ ] `GET /api/dashboard/gamification` - Métricas de gamificação
- [ ] `GET /api/dashboard/satisfaction` - Métricas de satisfação
- [ ] `GET /api/dashboard/alerts` - Alertas do sistema

#### 1.2 Achievement APIs
- [ ] `POST /api/achievements/process` - Processar conquistas
- [ ] `GET /api/achievements/check` - Verificar conquistas
- [ ] `GET /api/achievements/unlocked` - Conquistas desbloqueadas

### Fase 2: Migrar Serviços para API Clients

#### 2.1 Dashboard Service Migration
```typescript
// Criar: src/services/dashboardApiClient.ts
export class DashboardApiClient {
  static async getRealtimeMetrics(): Promise<RealtimeMetrics>
  static async getGeneralStats(): Promise<DashboardStats>
  static async getAlertMetrics(): Promise<AlertMetrics>
}
```

#### 2.2 Achievement Service Migration
```typescript
// Criar: src/services/achievementApiClient.ts
export class AchievementApiClient {
  static async processAchievements(attendantId: string): Promise<void>
  static async checkAchievements(criteria: AchievementCriteria): Promise<Achievement[]>
}
```

### Fase 3: Atualizar Componentes e Hooks

#### 3.1 Dashboard Components
- [ ] Atualizar `src/app/dashboard/page.tsx`
- [ ] Atualizar hooks de dashboard
- [ ] Migrar componentes de métricas

#### 3.2 Gamification Components
- [ ] Atualizar componentes de conquistas
- [ ] Migrar processamento de XP
- [ ] Atualizar ranking e estatísticas

### Fase 4: Limpeza e Remoção

#### 4.1 Remover Serviços Prisma Legados
- [ ] Remover `UserPrismaService`
- [ ] Remover `AttendantPrismaService`
- [ ] Remover `EvaluationPrismaService`

#### 4.2 Migrar Tipos Prisma
- [ ] Criar tipos locais para substituir imports do `@prisma/client`
- [ ] Atualizar imports em arquivos de utilitários
- [ ] Manter apenas tipos necessários para APIs

#### 4.3 Atualizar Configurações
- [ ] Remover dependências Prisma desnecessárias do frontend
- [ ] Atualizar imports em `src/lib/index.ts`
- [ ] Limpar exports não utilizados

## Riscos e Considerações

### Alto Risco
- **Dashboard em Tempo Real**: Migração pode afetar performance
- **Processamento de Conquistas**: Lógica complexa que precisa ser preservada

### Médio Risco
- **Tipos TypeScript**: Mudança de tipos pode quebrar compilação
- **Testes**: Muitos testes precisarão ser atualizados

### Baixo Risco
- **Serviços Legados**: Já têm substitutos funcionais

## Cronograma Sugerido

### Semana 1: APIs de Dashboard
- Implementar endpoints de dashboard
- Criar `DashboardApiClient`
- Testes de integração

### Semana 2: APIs de Achievement
- Implementar endpoints de conquistas
- Criar `AchievementApiClient`
- Migrar lógica de processamento

### Semana 3: Migração de Componentes
- Atualizar componentes do dashboard
- Migrar hooks e providers
- Testes de componentes

### Semana 4: Limpeza e Validação
- Remover serviços Prisma legados
- Migrar tipos restantes
- Validação completa do sistema

## ✅ Progresso Realizado

### FASE 1 CONCLUÍDA: APIs de Dashboard
- ✅ Criados 4 novos endpoints de dashboard
- ✅ Implementado `DashboardApiClient` completo
- ✅ Criado hook `useDashboardMetrics` para React
- ✅ Testes implementados e passando
- ✅ Documentação atualizada

### Arquivos Criados:
- `src/app/api/dashboard/gamification/route.ts`
- `src/app/api/dashboard/satisfaction/route.ts`
- `src/app/api/dashboard/alerts/route.ts`
- `src/app/api/dashboard/metrics/route.ts`
- `src/services/dashboardApiClient.ts`
- `src/hooks/useDashboardMetrics.ts`

## Próximos Passos

1. **✅ CONCLUÍDO**: Criar APIs de Dashboard
2. **🔄 EM ANDAMENTO**: Migrar componentes para usar novo hook
3. **⏳ PENDENTE**: Remover serviços Prisma legados
4. **⏳ PENDENTE**: Migrar Achievement services

## Arquivos para Monitorar

### Críticos para Migração
- `src/services/realtimeDashboardService.ts`
- `src/services/dashboardService.ts`
- `src/services/achievementProcessor.ts`
- `src/services/gamification/achievement-checker.service.ts`

### Para Remoção
- `src/services/userPrismaService.ts`
- `src/services/attendantPrismaService.ts`
- `src/services/evaluationPrismaService.ts`

### Para Atualização de Tipos
- `src/lib/errors.ts`
- `src/lib/auth/backupAuth.ts`
- `src/services/backupAuditLog.ts`