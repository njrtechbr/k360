# Design Document

## Overview

O dashboard em tempo real será uma interface centralizada que apresenta métricas consolidadas de gamificação e pesquisa de satisfação com atualizações automáticas. A solução utilizará WebSockets para comunicação em tempo real e será construída como uma página dedicada no sistema existente, seguindo os padrões de design já estabelecidos.

## Architecture

### Componentes Principais

```
Dashboard em Tempo Real
├── Real-time Data Layer (WebSocket)
├── Dashboard Page (/dashboard/tempo-real)
├── Widget Components (Métricas individuais)
├── Real-time Services (Agregação de dados)
└── Configuration System (Personalização)
```

### Fluxo de Dados

1. **Coleta**: Serviços agregam dados do Prisma (avaliações, XP, conquistas)
2. **Processamento**: Cálculo de métricas em tempo real
3. **Transmissão**: WebSocket Server envia atualizações para clientes conectados
4. **Renderização**: Componentes React atualizam interface automaticamente

### Tecnologias

- **Frontend**: Next.js 15, React 18, TypeScript
- **Real-time**: WebSocket (ws library) ou Server-Sent Events
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts (já usado no projeto)
- **State**: React hooks + Context API para estado real-time

## Components and Interfaces

### 1. Dashboard Page Component

```typescript
// src/app/dashboard/tempo-real/page.tsx
interface DashboardPageProps {
  initialData: DashboardMetrics;
}

interface DashboardMetrics {
  gamification: GamificationMetrics;
  satisfaction: SatisfactionMetrics;
  alerts: AlertMetrics;
  lastUpdated: Date;
}
```

### 2. Widget System

```typescript
// Widgets modulares e configuráveis
interface WidgetProps {
  id: string;
  title: string;
  data: any;
  isLoading: boolean;
  error?: string;
  refreshInterval?: number;
}

// Widgets disponíveis:
- XpTotalWidget: XP total da temporada ativa
- ActiveUsersWidget: Usuários ativos (com atividade recente)
- SatisfactionAverageWidget: Média de satisfação (geral e 24h)
- TopRankingWidget: Top 10 atendentes
- AchievementsWidget: Conquistas desbloqueadas recentemente
- EvaluationsTrendWidget: Gráfico de avaliações dos últimos 7 dias
- AlertsWidget: Alertas de satisfação baixa
- DistributionWidget: Distribuição de notas (gráfico de barras)
```

### 3. Real-time Service Layer

```typescript
// src/services/realtimeDashboardService.ts
interface RealtimeDashboardService {
  // Agregação de dados
  getGamificationMetrics(seasonId?: string): Promise<GamificationMetrics>;
  getSatisfactionMetrics(period: '24h' | '7d' | '30d'): Promise<SatisfactionMetrics>;
  getActiveUsers(hours: number): Promise<ActiveUserMetrics>;
  
  // WebSocket management
  subscribeToUpdates(callback: (data: DashboardMetrics) => void): () => void;
  broadcastUpdate(type: 'evaluation' | 'xp' | 'achievement', data: any): void;
}
```

### 4. WebSocket Server

```typescript
// src/lib/websocket/dashboardSocket.ts
interface DashboardSocketServer {
  // Gerenciamento de conexões
  handleConnection(socket: WebSocket): void;
  broadcastToAll(message: DashboardUpdate): void;
  
  // Triggers de atualização
  onEvaluationCreated(evaluation: Evaluation): void;
  onXpEventCreated(xpEvent: XpEvent): void;
  onAchievementUnlocked(achievement: UnlockedAchievement): void;
}
```

## Data Models

### Dashboard Metrics

```typescript
interface GamificationMetrics {
  totalXp: number;
  activeUsers: number;
  topRanking: Array<{
    attendantId: string;
    name: string;
    totalXp: number;
    position: number;
    avatarUrl?: string;
  }>;
  recentAchievements: Array<{
    id: string;
    title: string;
    attendantName: string;
    unlockedAt: Date;
    icon: string;
    color: string;
  }>;
  xpTrend: Array<{
    date: Date;
    totalXp: number;
  }>;
}

interface SatisfactionMetrics {
  averageRating: number;
  averageRating24h: number;
  totalEvaluations: {
    today: number;
    week: number;
    month: number;
  };
  ratingDistribution: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };
  lowRatingAlerts: number;
  trend: Array<{
    date: Date;
    averageRating: number;
    evaluationCount: number;
  }>;
}

interface AlertMetrics {
  lowSatisfactionCount: number;
  inactiveUsersCount: number;
  systemAlerts: Array<{
    id: string;
    type: 'satisfaction' | 'inactivity' | 'system';
    message: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: Date;
    resolved: boolean;
  }>;
}
```

### Configuration Model

```typescript
interface DashboardConfig {
  userId: string;
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    enabled: boolean;
    config: Record<string, any>;
  }>;
  refreshInterval: number; // segundos
  alertThresholds: {
    lowSatisfactionThreshold: number;
    inactivityHours: number;
  };
}
```

## Error Handling

### Estratégias de Resilência

1. **Fallback para Polling**: Se WebSocket falhar, usar polling a cada 30s
2. **Cache Local**: Manter última versão dos dados em localStorage
3. **Retry Logic**: Reconexão automática com backoff exponencial
4. **Graceful Degradation**: Mostrar dados cached com indicador de "offline"

### Error Boundaries

```typescript
// Componente para capturar erros de widgets individuais
interface WidgetErrorBoundary {
  fallback: React.ComponentType<{ error: Error; retry: () => void }>;
  onError: (error: Error, errorInfo: ErrorInfo) => void;
}
```

## Testing Strategy

### Unit Tests

- **Services**: Testes para agregação de métricas
- **Components**: Testes de renderização de widgets
- **WebSocket**: Mocks para conexões real-time
- **Utils**: Funções de cálculo e formatação

### Integration Tests

- **API Routes**: Endpoints de métricas
- **Real-time Flow**: Simulação de eventos e atualizações
- **Error Scenarios**: Falhas de conexão e recuperação

### E2E Tests

- **Dashboard Loading**: Carregamento inicial completo
- **Real-time Updates**: Verificação de atualizações automáticas
- **User Interactions**: Configuração de widgets e filtros
- **Responsive Design**: Testes em diferentes dispositivos

## Performance Considerations

### Otimizações

1. **Debouncing**: Agrupar múltiplas atualizações em 1-2 segundos
2. **Memoization**: React.memo para widgets que não mudaram
3. **Lazy Loading**: Carregar widgets sob demanda
4. **Data Aggregation**: Pré-calcular métricas em background jobs

### Monitoring

- **WebSocket Connections**: Número de clientes conectados
- **Update Frequency**: Taxa de atualizações por segundo
- **Query Performance**: Tempo de resposta das agregações
- **Memory Usage**: Monitoramento de vazamentos

## Security

### Autenticação e Autorização

- **WebSocket Auth**: Validação de token JWT na conexão
- **Role-based Access**: Métricas diferentes por perfil de usuário
- **Rate Limiting**: Limite de conexões por usuário/IP

### Data Protection

- **Sanitização**: Limpeza de dados sensíveis antes do envio
- **Encryption**: WSS (WebSocket Secure) em produção
- **Audit Trail**: Log de acessos ao dashboard

## Deployment Strategy

### Development

1. **Local WebSocket Server**: Servidor de desenvolvimento integrado
2. **Hot Reload**: Atualizações automáticas durante desenvolvimento
3. **Mock Data**: Dados simulados para testes

### Production

1. **WebSocket Scaling**: Suporte a múltiplas instâncias com Redis
2. **Load Balancing**: Distribuição de conexões WebSocket
3. **Health Checks**: Monitoramento de saúde do serviço real-time
4. **Graceful Shutdown**: Fechamento adequado de conexões ativas