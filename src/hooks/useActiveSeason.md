# useActiveSeason Hook

Hook para buscar e gerenciar dados da temporada ativa atual do sistema de gamificação.

## Uso Básico

```typescript
import { useActiveSeason } from '@/hooks';

function MyComponent() {
  const { 
    activeSeason, 
    isLoading, 
    error, 
    hasActiveSeason,
    seasonProgress,
    remainingDays 
  } = useActiveSeason();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!hasActiveSeason) return <div>Nenhuma temporada ativa</div>;

  return (
    <div>
      <h2>{activeSeason.name}</h2>
      <p>Progresso: {seasonProgress}%</p>
      <p>Dias restantes: {remainingDays}</p>
    </div>
  );
}
```

## Opções Avançadas

```typescript
// Com estatísticas incluídas
const { activeSeason } = useActiveSeason({ 
  includeStats: true 
});

// Com configurações de cache personalizadas
const { activeSeason } = useActiveSeason({
  staleTime: 5 * 60 * 1000, // 5 minutos
  refetchOnWindowFocus: true
});

// Desabilitado condicionalmente
const { activeSeason } = useActiveSeason({
  enabled: userHasPermission
});
```

## API

### Parâmetros

```typescript
interface UseActiveSeasonOptions {
  includeStats?: boolean;        // Incluir estatísticas da temporada
  enabled?: boolean;             // Habilitar/desabilitar o hook
  refetchOnWindowFocus?: boolean; // Refetch ao focar na janela
  staleTime?: number;            // Tempo para considerar dados stale (ms)
}
```

### Retorno

```typescript
interface UseActiveSeasonReturn {
  // Dados principais
  activeSeason: ActiveSeasonData | null;
  isLoading: boolean;
  error: string | null;
  
  // Estados do cache
  isStale: boolean;
  isFetching: boolean;
  
  // Funções
  refetch: () => Promise<void>;
  
  // Propriedades de conveniência
  hasActiveSeason: boolean;
  seasonProgress: number;        // 0-100
  remainingDays: number;
  totalParticipants: number;     // Apenas com includeStats: true
  totalXpDistributed: number;    // Apenas com includeStats: true
}
```

### Tipos de Dados

```typescript
interface ActiveSeasonData extends GamificationSeason {
  status: {
    label: 'active';
    isActive: true;
    hasStarted: true;
    hasEnded: false;
    progress: number;           // Progresso da temporada (0-100)
    remainingDays: number;      // Dias restantes
  };
  duration: {
    totalDays: number;          // Duração total em dias
    elapsedDays: number;        // Dias decorridos
    remainingDays: number;      // Dias restantes
  };
  stats?: {                     // Apenas com includeStats: true
    totalParticipants: number;
    totalXpDistributed: number;
    averageXpPerParticipant: number;
    topPerformer: {
      name: string;
      xp: number;
    } | null;
  };
}
```

## Características

### Cache Inteligente
- Cache automático com tempo de vida configurável (padrão: 2 minutos)
- Invalidação automática quando dados ficam stale
- Chaves de cache diferentes para diferentes opções

### Tratamento de Erro
- Retry automático para erros de rede
- Tratamento gracioso de erros de API
- Estados de erro claros e informativos

### Performance
- Debounce automático de requisições
- Cancelamento de requisições em andamento
- Otimização para múltiplas instâncias do hook

### Estados de Loading
- `isLoading`: Carregamento inicial
- `isFetching`: Qualquer operação de fetch (incluindo refetch)
- `isStale`: Indica se os dados estão desatualizados

## Endpoint da API

O hook consome o endpoint `/api/gamification/seasons/active` que:

- Retorna a temporada ativa atual (se houver)
- Calcula automaticamente progresso e dias restantes
- Inclui estatísticas opcionais quando solicitado
- Filtra apenas temporadas que estão ativas e dentro do período

## Exemplos de Uso

### Dashboard de Gamificação
```typescript
function GamificationDashboard() {
  const { activeSeason, seasonProgress, remainingDays } = useActiveSeason({
    includeStats: true
  });

  return (
    <div className="dashboard">
      {activeSeason && (
        <>
          <h1>{activeSeason.name}</h1>
          <ProgressBar value={seasonProgress} />
          <p>{remainingDays} dias restantes</p>
          {activeSeason.stats && (
            <div>
              <p>Participantes: {activeSeason.stats.totalParticipants}</p>
              <p>XP Total: {activeSeason.stats.totalXpDistributed}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### Componente de Status
```typescript
function SeasonStatus() {
  const { hasActiveSeason, activeSeason, isLoading } = useActiveSeason();

  if (isLoading) return <Skeleton />;
  
  return (
    <Badge variant={hasActiveSeason ? "success" : "secondary"}>
      {hasActiveSeason ? activeSeason.name : "Nenhuma temporada ativa"}
    </Badge>
  );
}
```

### Hook Condicional
```typescript
function AdminPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const { activeSeason } = useActiveSeason({
    enabled: isAdmin,
    includeStats: isAdmin
  });

  // Hook só executa se o usuário for admin
  return isAdmin ? <AdminSeasonView season={activeSeason} /> : null;
}
```