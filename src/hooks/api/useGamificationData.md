# useGamificationData Hook

Hook para gerenciar dados de gamificação usando APIs REST. Substitui o acesso direto ao PrismaProvider por chamadas HTTP padronizadas.

## Visão Geral

O `useGamificationData` é um hook abrangente que fornece acesso a todos os dados de gamificação através de APIs REST, incluindo configurações, conquistas, eventos de XP, temporadas e leaderboard. Ele implementa cache inteligente, tratamento de erros e operações de mutação.

## Instalação e Uso

```typescript
import { useGamificationData, useGamificationReadOnly } from '@/hooks/api/useGamificationData';
```

## API Reference

### useGamificationData(options?)

Hook principal com funcionalidades completas de leitura e escrita.

#### Parâmetros

```typescript
interface UseGamificationQueryOptions {
  seasonId?: string;        // Filtrar por temporada específica
  attendantId?: string;     // Filtrar por atendente específico
  enabled?: boolean;        // Habilitar/desabilitar queries
  staleTime?: number;       // Tempo de cache em ms
  cacheTime?: number;       // Tempo de expiração do cache
  retry?: boolean;          // Habilitar retry automático
}
```

#### Retorno

```typescript
interface UseGamificationDataResult {
  // Configuração principal
  config: {
    data: GamificationApiResponse | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  };

  // Conquistas
  achievements: {
    data: Achievement[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateAchievement: (id: string, data: Partial<AchievementConfig>) => Promise<void>;
  };

  // Eventos de XP
  xpEvents: {
    data: XpEvent[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getByAttendant: (attendantId: string) => XpEvent[];
    getTotalXp: (attendantId?: string) => number;
  };

  // Conquistas desbloqueadas
  unlockedAchievements: {
    data: UnlockedAchievement[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getByAttendant: (attendantId: string) => UnlockedAchievement[];
  };

  // Temporadas
  seasons: {
    data: GamificationSeason[] | null;
    activeSeason: GamificationSeason | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createSeason: (season: Omit<GamificationSeason, 'id'>) => Promise<void>;
    updateSeason: (id: string, data: Partial<GamificationSeason>) => Promise<void>;
    deleteSeason: (id: string) => Promise<void>;
  };

  // Leaderboard
  leaderboard: {
    data: LeaderboardEntry[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getByPosition: (position: number) => LeaderboardEntry | null;
    getByAttendant: (attendantId: string) => LeaderboardEntry | null;
  };

  // Recompensas de nível
  levelRewards: {
    data: LevelReward[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateLevelReward: (level: number, data: Partial<LevelTrackConfig>) => Promise<void>;
  };

  // Estado global
  isLoading: boolean;
  hasError: boolean;
  
  // Ações globais
  refreshAll: () => Promise<void>;
  
  // Utilitários
  getLevelFromXp: (xp: number) => number;
  getXpForLevel: (level: number) => number;
  calculateSeasonMultiplier: (date?: Date) => number;
}
```

### useGamificationReadOnly(options?)

Hook simplificado para componentes que precisam apenas de dados de leitura.

#### Retorno

```typescript
{
  // Dados básicos
  config: GamificationApiResponse | null;
  achievements: Achievement[] | null;
  levelRewards: LevelReward[] | null;
  seasons: GamificationSeason[] | null;
  activeSeason: GamificationSeason | null;
  xpEvents: XpEvent[] | null;
  unlockedAchievements: UnlockedAchievement[] | null;
  leaderboard: LeaderboardEntry[] | null;

  // Estado
  isLoading: boolean;
  hasError: boolean;

  // Funções utilitárias (somente leitura)
  getLevelFromXp: (xp: number) => number;
  getXpForLevel: (level: number) => number;
  calculateSeasonMultiplier: (date?: Date) => number;
  getXpByAttendant: (attendantId: string) => XpEvent[];
  getTotalXp: (attendantId?: string) => number;
  getUnlockedAchievementsByAttendant: (attendantId: string) => UnlockedAchievement[];
  getLeaderboardPosition: (attendantId: string) => LeaderboardEntry | null;
}
```

## Exemplos de Uso

### 1. Dashboard Completo

```typescript
function GamificationDashboard() {
  const {
    config,
    achievements,
    seasons,
    leaderboard,
    isLoading,
    hasError,
    refreshAll,
  } = useGamificationData();

  if (isLoading) return <div>Carregando...</div>;
  if (hasError) return <div>Erro ao carregar dados</div>;

  return (
    <div>
      <h1>Dashboard de Gamificação</h1>
      
      <section>
        <h2>Configuração</h2>
        <p>Multiplicador: {config.data?.globalXpMultiplier}</p>
        <p>Temporada: {seasons.activeSeason?.name}</p>
      </section>

      <section>
        <h2>Conquistas ({achievements.data?.length})</h2>
        {achievements.data?.map(achievement => (
          <div key={achievement.id}>
            <h3>{achievement.title}</h3>
            <p>{achievement.description}</p>
            <button onClick={() => 
              achievements.updateAchievement(achievement.id, {
                active: !achievement.active
              })
            }>
              {achievement.active ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        ))}
      </section>

      <button onClick={refreshAll}>Atualizar Dados</button>
    </div>
  );
}
```

### 2. Perfil de Atendente (Somente Leitura)

```typescript
function AttendantProfile({ attendantId }: { attendantId: string }) {
  const {
    activeSeason,
    isLoading,
    getLevelFromXp,
    getTotalXp,
    getLeaderboardPosition,
  } = useGamificationReadOnly({ attendantId });

  if (isLoading) return <div>Carregando perfil...</div>;

  const totalXp = getTotalXp(attendantId);
  const level = getLevelFromXp(totalXp);
  const position = getLeaderboardPosition(attendantId);

  return (
    <div>
      <h2>Perfil do Atendente</h2>
      <p>XP Total: {totalXp}</p>
      <p>Nível: {level}</p>
      <p>Posição: #{position?.position}</p>
      <p>Temporada: {activeSeason?.name}</p>
    </div>
  );
}
```

### 3. Gerenciamento de Temporadas

```typescript
function SeasonManager() {
  const { seasons, isLoading } = useGamificationData();

  const createNewSeason = async () => {
    const newSeason = {
      name: 'Temporada Q1 2024',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-03-31T23:59:59Z',
      active: true,
      xpMultiplier: 1.5,
    };
    
    await seasons.createSeason(newSeason);
  };

  return (
    <div>
      <h2>Gerenciar Temporadas</h2>
      
      {seasons.data?.map(season => (
        <div key={season.id}>
          <h3>{season.name}</h3>
          <p>Multiplicador: {season.xpMultiplier}x</p>
          <p>Status: {season.active ? 'Ativa' : 'Inativa'}</p>
          
          <button onClick={() => 
            seasons.updateSeason(season.id, { active: !season.active })
          }>
            {season.active ? 'Desativar' : 'Ativar'}
          </button>
          
          <button onClick={() => seasons.deleteSeason(season.id)}>
            Excluir
          </button>
        </div>
      ))}
      
      <button onClick={createNewSeason}>Nova Temporada</button>
    </div>
  );
}
```

### 4. Leaderboard com Filtros

```typescript
function Leaderboard({ seasonId }: { seasonId?: string }) {
  const { leaderboard, isLoading } = useGamificationData({ seasonId });

  if (isLoading) return <div>Carregando leaderboard...</div>;

  return (
    <div>
      <h2>Leaderboard</h2>
      {leaderboard.data?.map(entry => (
        <div key={entry.attendantId}>
          <span>#{entry.position}</span>
          <span>{entry.attendantName}</span>
          <span>{entry.totalXp} XP</span>
          <span>Nível {entry.level}</span>
        </div>
      ))}
    </div>
  );
}
```

## Funcionalidades

### Cache Inteligente
- Cache automático com tempo configurável
- Invalidação inteligente após mutações
- Estratégia stale-while-revalidate

### Tratamento de Erros
- Retry automático para erros de rede
- Mensagens de erro padronizadas
- Estados de erro por seção

### Otimizações
- Queries paralelas para melhor performance
- Cancelamento automático de requests
- Debounce em operações de busca

### Utilitários
- Cálculos de nível e XP
- Filtros por atendente e temporada
- Funções de busca otimizadas

## APIs Consumidas

O hook consome as seguintes APIs:

- `GET /api/gamification` - Configuração principal
- `GET /api/gamification/xp-events` - Eventos de XP
- `GET /api/gamification/achievements/unlocked` - Conquistas desbloqueadas
- `GET /api/gamification/seasons` - Temporadas
- `GET /api/gamification/seasons/active` - Temporada ativa
- `GET /api/gamification/leaderboard` - Leaderboard
- `PUT /api/gamification/achievements/{id}` - Atualizar conquista
- `PUT /api/gamification/level-rewards/{level}` - Atualizar recompensa
- `POST /api/gamification/seasons` - Criar temporada
- `PUT /api/gamification/seasons/{id}` - Atualizar temporada
- `DELETE /api/gamification/seasons/{id}` - Excluir temporada

## Migração do PrismaProvider

Para migrar do `useGamificationData` antigo:

### Antes (PrismaProvider)
```typescript
const { gamificationConfig, achievements, seasons } = usePrismaProvider();
```

### Depois (API)
```typescript
const { config, achievements, seasons } = useGamificationData();

// Acessar dados
const gamificationConfig = config.data;
const achievementsList = achievements.data;
const seasonsList = seasons.data;
```

### Principais Diferenças

1. **Estrutura de dados**: Cada seção tem `data`, `loading`, `error`
2. **Mutações**: Funções específicas para cada operação
3. **Cache**: Gerenciamento automático de cache
4. **Estados**: Estados de loading e erro separados por seção

## Considerações de Performance

- Use `useGamificationReadOnly` para componentes que não fazem mutações
- Especifique `attendantId` ou `seasonId` para filtrar dados
- Configure `staleTime` adequadamente para seu caso de uso
- Use `enabled: false` para queries condicionais

## Tratamento de Erros

```typescript
const { config, hasError } = useGamificationData();

if (hasError) {
  // Tratar erro global
}

if (config.error) {
  // Tratar erro específico da configuração
}
```

## Testes

O hook inclui testes abrangentes cobrindo:
- Carregamento de dados
- Operações de mutação
- Tratamento de erros
- Funções utilitárias
- Cache e refetch

Execute os testes com:
```bash
npm test -- src/hooks/api/__tests__/useGamificationData.test.ts
```