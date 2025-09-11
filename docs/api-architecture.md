# Arquitetura de APIs - Sistema de Gamificação

## Visão Geral

Este documento descreve a arquitetura de APIs do sistema após a migração completa do uso direto do Prisma no frontend para uma arquitetura baseada em APIs REST.

## Princípios Arquiteturais

### Separação de Responsabilidades
- **Frontend**: Apenas interface de usuário e lógica de apresentação
- **API Layer**: Lógica de negócio e acesso a dados
- **Data Layer**: Persistência e integridade dos dados

### Padrões Estabelecidos
- **API Clients**: Camada de abstração para comunicação HTTP
- **Singleton Prisma**: Instância única do ORM em todas as APIs
- **Validação Zod**: Schemas de validação consistentes
- **Error Handling**: Tratamento padronizado de erros

## Estrutura de Camadas

```
┌─────────────────────────────────────────┐
│              Frontend Layer             │
├─────────────────────────────────────────┤
│  Components │ Hooks │ Providers │ Pages │
├─────────────────────────────────────────┤
│            API Clients Layer            │
├─────────────────────────────────────────┤
│  DashboardApiClient │ AchievementApiClient │
│  AttendantApiClient │ EvaluationApiClient  │
│  UserApiClient      │ XpAvulsoApiClient    │
└─────────────────────────────────────────┘
                       │
                    HTTP/REST
                       │
┌─────────────────────────────────────────┐
│              API Routes Layer           │
├─────────────────────────────────────────┤
│  /api/dashboard/*   │ /api/achievements/* │
│  /api/attendants/*  │ /api/evaluations/*  │
│  /api/users/*       │ /api/gamification/* │
├─────────────────────────────────────────┤
│            Prisma Singleton             │
├─────────────────────────────────────────┤
│              PostgreSQL                 │
└─────────────────────────────────────────┘
```

## API Clients

### DashboardApiClient
**Localização**: `src/services/dashboardApiClient.ts`

Responsável por todas as métricas e estatísticas do dashboard:

```typescript
class DashboardApiClient {
  // Métricas gerais
  static async getGeneralStats(): Promise<DashboardStats>
  static async getEvaluationTrend(days?: number): Promise<EvaluationTrend[]>
  static async getRatingDistribution(): Promise<RatingDistribution[]>
  static async getTopPerformers(limit?: number): Promise<TopPerformers[]>
  
  // Métricas de gamificação
  static async getGamificationOverview(): Promise<GamificationOverview>
  static async getMonthlyEvaluationStats(months?: number): Promise<MonthlyStats[]>
  static async getPopularAchievements(limit?: number): Promise<PopularAchievement[]>
  static async getRecentActivities(limit?: number): Promise<RecentActivity[]>
  
  // Métricas em tempo real
  static async getRealtimeMetrics(options?: RealtimeOptions): Promise<DashboardMetrics>
  static async getGamificationMetrics(seasonId?: string): Promise<GamificationMetrics>
  static async getSatisfactionMetrics(period?: string): Promise<SatisfactionMetrics>
  static async getAlertMetrics(thresholds?: AlertThresholds): Promise<AlertMetrics>
}
```

### AchievementApiClient
**Localização**: `src/services/achievementApiClient.ts`

Gerencia processamento e verificação de conquistas:

```typescript
class AchievementApiClient {
  // Processamento
  static async processAchievementsForAttendant(attendantId: string): Promise<number>
  static async processAllAchievements(): Promise<ProcessResult>
  static async processSeasonAchievements(seasonId: string): Promise<ProcessResult>
  
  // Verificação
  static async checkAchievementCriteria(attendantId: string, achievementId: string): Promise<boolean>
  static async getUnlockedAchievements(attendantId: string): Promise<UnlockedAchievement[]>
  static async getAvailableAchievements(): Promise<AchievementConfig[]>
  
  // Estatísticas
  static async getAchievementStats(): Promise<AchievementStats>
  static async getPopularAchievements(limit?: number): Promise<PopularAchievement[]>
}
```

## Endpoints de API

### Dashboard Endpoints

#### Estatísticas Gerais
- **GET** `/api/dashboard/stats`
  - Retorna estatísticas consolidadas do sistema
  - Inclui total de avaliações, atendentes, XP, etc.

#### Métricas em Tempo Real
- **GET** `/api/dashboard/realtime`
  - Métricas atualizadas em tempo real
  - Inclui gamificação, satisfação e alertas

#### Tendências e Distribuições
- **GET** `/api/dashboard/evaluation-trend`
  - Tendência de avaliações ao longo do tempo
  - Parâmetro opcional: `days` (padrão: 30)

- **GET** `/api/dashboard/rating-distribution`
  - Distribuição de notas das avaliações
  - Agrupado por faixas de rating

#### Performance
- **GET** `/api/dashboard/top-performers`
  - Ranking dos melhores atendentes
  - Parâmetro opcional: `limit` (padrão: 10)

### Achievement Endpoints

#### Processamento
- **POST** `/api/achievements/process`
  - Processa conquistas para todos os atendentes
  - Retorna estatísticas do processamento

- **POST** `/api/achievements/process-attendant`
  - Processa conquistas para um atendente específico
  - Body: `{ attendantId: string }`

#### Verificação
- **POST** `/api/achievements/check`
  - Verifica critérios de conquista específica
  - Body: `{ attendantId: string, achievementId: string }`

- **GET** `/api/achievements/unlocked/[attendantId]`
  - Lista conquistas desbloqueadas de um atendente
  - Inclui detalhes de XP e data de desbloqueio

## Padrões de Implementação

### Tratamento de Erros

Todos os endpoints seguem o padrão de tratamento de erros:

```typescript
export async function GET(request: Request) {
  try {
    // Lógica do endpoint
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro específico:', error);
    return NextResponse.json(
      { error: 'Mensagem de erro apropriada' },
      { status: 500 }
    );
  }
}
```

### Validação de Entrada

Uso consistente do Zod para validação:

```typescript
const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0)
});

const { limit, offset } = QuerySchema.parse(searchParams);
```

### Autenticação

Verificação de sessão em endpoints protegidos:

```typescript
const session = await getServerSession(authOptions);

if (!session) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

// Verificar permissões específicas se necessário
if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
```

### Uso do Prisma Singleton

Todas as APIs usam a instância singleton:

```typescript
import { prisma } from '@/lib/prisma';

// Nunca usar: new PrismaClient()
// Sempre usar: prisma (singleton)
```

## Tipos de Dados

### Dashboard Types
**Localização**: `src/types/dashboard.ts`

```typescript
export interface DashboardStats {
  totalEvaluations: number;
  totalAttendants: number;
  averageRating: number;
  totalXp: number;
  activeSeasons: number;
  unlockedAchievements: number;
}

export interface DashboardMetrics {
  gamification: GamificationMetrics;
  satisfaction: SatisfactionMetrics;
  alerts: AlertMetrics;
  lastUpdated: Date;
}
```

### Achievement Types
**Localização**: `src/types/achievements.ts`

```typescript
export interface ProcessResult {
  attendantsProcessed: number;
  achievementsUnlocked: number;
  xpAwarded: number;
  errors: string[];
}

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  attendantId: string;
  seasonId: string;
  unlockedAt: Date;
  xpGained: number;
}
```

## Testes

### Testes Unitários
- **API Clients**: Mockam `httpClient` para testar lógica de chamadas
- **Localização**: `src/services/__tests__/`

### Testes de Integração
- **Endpoints**: Testam funcionalidade completa com dados reais
- **Localização**: `src/app/api/**/__tests__/`

### Exemplo de Teste de API Client

```typescript
jest.mock('@/lib/httpClient');
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('DashboardApiClient', () => {
  it('should fetch general stats', async () => {
    const mockStats = { totalEvaluations: 100 };
    mockHttpClient.get.mockResolvedValue({ data: mockStats });

    const result = await DashboardApiClient.getGeneralStats();
    
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/dashboard/stats');
    expect(result).toEqual(mockStats);
  });
});
```

## Performance e Otimização

### Caching
- Cache em memória para métricas computacionalmente caras
- TTL configurável por tipo de métrica

### Paginação
- Implementada em endpoints que retornam listas grandes
- Parâmetros padrão: `limit=10`, `offset=0`

### Queries Otimizadas
- Uso de `select` para campos específicos
- Agregações eficientes no banco
- Queries paralelas com `Promise.all()`

## Migração Concluída

### Problemas Resolvidos
- ✅ 178 itens de uso direto do Prisma migrados
- ✅ Múltiplas instâncias do PrismaClient substituídas por singleton
- ✅ Serviços legados removidos completamente
- ✅ Separação clara entre frontend e backend

### Benefícios Obtidos
- **Performance**: Conexões otimizadas com singleton
- **Manutenibilidade**: Código mais organizado e testável
- **Escalabilidade**: Arquitetura preparada para crescimento
- **Segurança**: Validação e autenticação centralizadas

## Próximos Passos

1. **Monitoramento**: Implementar métricas de performance das APIs
2. **Cache Avançado**: Redis para cache distribuído
3. **Rate Limiting**: Proteção contra abuso de APIs
4. **Documentação OpenAPI**: Especificação formal das APIs