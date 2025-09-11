# Padrões de Cliente API

## Visão Geral

Este documento descreve os padrões de cliente API implementados na refatoração da arquitetura do sistema. O objetivo é fornecer uma interface consistente e padronizada para comunicação com APIs REST.

## Arquitetura

### HTTP Client Service

O `HttpClient` é a base para todas as comunicações HTTP no sistema.

```typescript
import { httpClient } from '@/lib/httpClient';

// Exemplo de uso básico
const response = await httpClient.get<User[]>('/api/users');
if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

### Padrão de Resposta API

Todas as APIs seguem um padrão consistente de resposta:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Hooks de API

### useApiQuery

Para operações de leitura (GET):

```typescript
import { useApiQuery } from '@/hooks/api/useApiQuery';

function UsersList() {
  const { data, loading, error, refetch } = useApiQuery<User[]>(
    ['users'], 
    '/api/users'
  );

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  
  return (
    <div>
      {data?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### useApiMutation

Para operações de escrita (POST, PUT, DELETE):

```typescript
import { useApiMutation } from '@/hooks/api/useApiMutation';

function CreateUserForm() {
  const { mutate, loading, error } = useApiMutation<User, CreateUserData>(
    (userData) => httpClient.post('/api/users', userData)
  );

  const handleSubmit = async (userData: CreateUserData) => {
    try {
      await mutate(userData);
      // Sucesso - usuário criado
    } catch (err) {
      // Erro já está disponível em 'error'
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Formulário */}
      {loading && <div>Salvando...</div>}
      {error && <div>Erro: {error}</div>}
    </form>
  );
}
```

## Clientes de API

### Padrão de Service Client

Todos os services foram convertidos para clientes de API:

```typescript
// Antes (Prisma direto)
export class UserService {
  static async findAll(): Promise<User[]> {
    return await prisma.user.findMany();
  }
}

// Depois (API Client)
export class UserApiClient {
  static async findAll(): Promise<User[]> {
    const response = await httpClient.get<User[]>('/api/users');
    if (!response.success) {
      throw new Error(response.error || 'Erro ao buscar usuários');
    }
    return response.data;
  }

  static async create(userData: CreateUserData): Promise<User> {
    const response = await httpClient.post<User>('/api/users', userData);
    if (!response.success) {
      throw new Error(response.error || 'Erro ao criar usuário');
    }
    return response.data;
  }

  static async update(id: string, userData: UpdateUserData): Promise<User> {
    const response = await httpClient.put<User>(`/api/users/${id}`, userData);
    if (!response.success) {
      throw new Error(response.error || 'Erro ao atualizar usuário');
    }
    return response.data;
  }

  static async delete(id: string): Promise<void> {
    const response = await httpClient.delete(`/api/users/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Erro ao deletar usuário');
    }
  }
}
```

## ApiProvider

O `ApiProvider` substitui o antigo `PrismaProvider` e usa hooks de API:

```typescript
import { ApiProvider } from '@/providers/ApiProvider';

function App() {
  return (
    <ApiProvider>
      <YourAppComponents />
    </ApiProvider>
  );
}

// Uso em componentes
function MyComponent() {
  const { users, attendants, isLoading } = useApiContext();
  
  return (
    <div>
      {isLoading ? 'Carregando...' : 'Dados carregados'}
    </div>
  );
}
```

## Hooks Customizados

### useUsersData

```typescript
import { useUsersData } from '@/hooks/useUsersData';

function UsersManager() {
  const { 
    users, 
    loading, 
    error, 
    createUser, 
    updateUser, 
    deleteUser,
    refetch 
  } = useUsersData();

  const handleCreateUser = async (userData: CreateUserData) => {
    await createUser.mutate(userData);
    refetch(); // Atualiza a lista
  };

  return (
    <div>
      {/* Interface de usuários */}
    </div>
  );
}
```

### useGamificationData

```typescript
import { useGamificationData } from '@/hooks/api/useGamificationData';

function GamificationDashboard() {
  const { 
    achievements, 
    xpEvents, 
    seasons,
    loading,
    error,
    refetch 
  } = useGamificationData();

  return (
    <div>
      {/* Dashboard de gamificação */}
    </div>
  );
}
```

## Tratamento de Erros

### Padrão de Error Handling

```typescript
// Em hooks
const { data, loading, error } = useApiQuery(['users'], '/api/users');

if (error) {
  // Erro já está formatado e pronto para exibição
  return <ErrorMessage message={error} />;
}

// Em mutations
const { mutate, error } = useApiMutation(createUserFn);

const handleSubmit = async (data) => {
  try {
    await mutate(data);
    // Sucesso
  } catch (err) {
    // Erro capturado automaticamente no hook
    // Disponível em 'error'
  }
};
```

### Tipos de Erro

1. **Erros de Rede**: Timeout, conexão perdida
2. **Erros de Validação**: Dados inválidos (400)
3. **Erros de Autenticação**: Token inválido (401)
4. **Erros de Autorização**: Sem permissão (403)
5. **Erros de Servidor**: Erro interno (500)

## Cache e Performance

### Estratégia de Cache

```typescript
// Cache automático por chave
const { data } = useApiQuery(
  ['users', filters], // Chave única baseada em parâmetros
  `/api/users?${new URLSearchParams(filters)}`
);

// Invalidação de cache
const { refetch } = useApiQuery(['users'], '/api/users');
await refetch(); // Força nova busca

// Cache com tempo de vida
const { data } = useApiQuery(
  ['users'], 
  '/api/users',
  { 
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  }
);
```

### Otimizações

1. **Debounce**: Para buscas em tempo real
2. **Pagination**: Para listas grandes
3. **Lazy Loading**: Para dados não críticos
4. **Prefetch**: Para dados previsíveis

## Migração de Código Existente

### Checklist de Migração

1. ✅ Substituir imports do Prisma por API clients
2. ✅ Converter chamadas diretas para hooks de API
3. ✅ Atualizar tratamento de erro
4. ✅ Testar funcionalidade end-to-end
5. ✅ Remover dependências do Prisma

### Exemplo de Migração

```typescript
// ANTES
import { PrismaProvider } from '@/providers/PrismaProvider';

function UserComponent() {
  const { users, createUser } = usePrismaContext();
  
  return (
    <div>
      {users.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}

// DEPOIS
import { useUsersData } from '@/hooks/useUsersData';

function UserComponent() {
  const { users, createUser } = useUsersData();
  
  return (
    <div>
      {users?.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

## Boas Práticas

### 1. Sempre use TypeScript

```typescript
// ✅ Correto
const { data } = useApiQuery<User[]>(['users'], '/api/users');

// ❌ Evitar
const { data } = useApiQuery(['users'], '/api/users');
```

### 2. Trate estados de loading e erro

```typescript
// ✅ Correto
if (loading) return <Spinner />;
if (error) return <ErrorMessage message={error} />;
return <DataComponent data={data} />;

// ❌ Evitar
return <DataComponent data={data} />; // Pode quebrar se data for undefined
```

### 3. Use chaves de cache consistentes

```typescript
// ✅ Correto
const QUERY_KEYS = {
  users: ['users'],
  userById: (id: string) => ['users', id],
  usersByRole: (role: string) => ['users', 'role', role]
};

// ❌ Evitar
const { data } = useApiQuery(['users-list'], '/api/users'); // Inconsistente
```

### 4. Implemente retry logic

```typescript
// ✅ Correto - retry automático no httpClient
const response = await httpClient.get('/api/users'); // Retry automático

// ✅ Correto - retry manual se necessário
const { data, refetch } = useApiQuery(['users'], '/api/users');
const handleRetry = () => refetch();
```

### 5. Valide dados de entrada

```typescript
// ✅ Correto
const createUser = async (userData: CreateUserData) => {
  if (!userData.name || !userData.email) {
    throw new Error('Nome e email são obrigatórios');
  }
  return await UserApiClient.create(userData);
};
```