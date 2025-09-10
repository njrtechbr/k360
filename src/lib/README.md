# Infraestrutura de API

Esta documentação descreve a infraestrutura base criada para a refatoração da arquitetura API do projeto.

## Componentes Principais

### 1. HTTP Client Service (`httpClient.ts`)

Cliente HTTP centralizado com funcionalidades avançadas:

- **Retry Logic**: Tentativas automáticas em caso de falha de rede ou erros 5xx
- **Timeout**: Controle de timeout configurável (padrão: 10s)
- **Error Handling**: Tratamento padronizado de erros HTTP
- **Abort Controller**: Cancelamento de requisições em andamento

#### Uso Básico

```typescript
import { httpClient } from '@/lib/httpClient';

// GET request
const response = await httpClient.get<User[]>('/api/users');

// POST request
const newUser = await httpClient.post<User>('/api/users', {
  name: 'João Silva',
  email: 'joao@example.com'
});

// PUT request
const updatedUser = await httpClient.put<User>(`/api/users/${id}`, userData);

// DELETE request
await httpClient.delete(`/api/users/${id}`);
```

#### Configuração Customizada

```typescript
import { createHttpClient } from '@/lib/httpClient';

const customClient = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 15000,
  retries: 5,
  retryDelay: 2000,
  headers: {
    'Authorization': 'Bearer token',
  }
});
```

### 2. Tipos de API (`api-types.ts`)

Tipos TypeScript padronizados para todas as comunicações de API:

#### Tipos de Resposta

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

#### Tipos de Erro

```typescript
interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>; // Validation errors
  code?: string;
  status?: number;
}
```

#### Utilitários de Erro

```typescript
import { getErrorType, getErrorMessage, isValidationError } from '@/lib/api-types';

// Determina o tipo de erro
const errorType = getErrorType(error); // ApiErrorType.VALIDATION_ERROR

// Extrai mensagem de erro
const message = getErrorMessage(error);

// Verifica se é erro de validação
if (isValidationError(error)) {
  console.log(error.details); // { field: ['Required'] }
}
```

### 3. Hook useApiQuery (`useApiQuery.ts`)

Hook para operações de leitura (GET) com cache e gerenciamento de estado:

#### Funcionalidades

- **Cache em Memória**: Cache automático com controle de stale time
- **Refetch Automático**: Refetch em focus da janela (opcional)
- **Estados de Loading**: Controle granular de estados de carregamento
- **Error Handling**: Tratamento automático de erros
- **Retry Logic**: Tentativas automáticas em caso de falha

#### Uso Básico

```typescript
import { useApiQuery } from '@/hooks/api';

function UsersList() {
  const {
    data: users,
    loading,
    error,
    refetch,
    isStale
  } = useApiQuery<User[]>(['users'], '/api/users');

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      <button onClick={refetch}>Atualizar</button>
    </div>
  );
}
```

#### Com Parâmetros

```typescript
const { data, loading, error } = useApiQuery(
  ['users', { page, search }],
  '/api/users',
  { page: 1, limit: 10, search: 'joão' }
);
```

#### Opções Avançadas

```typescript
const { data, loading, error } = useApiQuery(
  ['users'],
  '/api/users',
  undefined,
  {
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    onSuccess: (data) => console.log('Dados carregados:', data),
    onError: (error) => console.error('Erro:', error),
  }
);
```

### 4. Hook useApiMutation (`useApiMutation.ts`)

Hook para operações de escrita (POST, PUT, DELETE) com gerenciamento de estado:

#### Funcionalidades

- **Estados de Mutação**: Loading, success, error
- **Callbacks**: onSuccess, onError, onSettled
- **Error Handling**: Tratamento automático de erros
- **Reset**: Função para resetar estado

#### Uso Básico

```typescript
import { useApiMutation } from '@/hooks/api';

function CreateUserForm() {
  const {
    mutate: createUser,
    loading,
    error,
    success
  } = useApiMutation(
    async (userData: CreateUserData) => 
      httpClient.post<User>('/api/users', userData)
  );

  const handleSubmit = async (formData: CreateUserData) => {
    try {
      await createUser(formData);
      // Usuário criado com sucesso
    } catch (error) {
      // Erro já está no estado do hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* campos do formulário */}
      <button type="submit" disabled={loading}>
        {loading ? 'Criando...' : 'Criar Usuário'}
      </button>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Usuário criado!</div>}
    </form>
  );
}
```

#### Hooks Específicos

```typescript
import { useApiCreate, useApiUpdate, useApiDelete } from '@/hooks/api';

// Criar recurso
const { mutate: createUser } = useApiCreate<User>('/api/users');

// Atualizar recurso
const { mutate: updateUser } = useApiUpdate<User>(
  (data) => `/api/users/${data.id}`
);

// Deletar recurso
const { mutate: deleteUser } = useApiDelete<void>(
  (id: string) => `/api/users/${id}`
);
```

### 5. Error Handler (`errorHandler.ts`)

Sistema centralizado de tratamento de erros:

#### Configuração

```typescript
import { ApiErrorHandler } from '@/lib/errorHandler';

// Configurar sistema de toast (exemplo com react-hot-toast)
ApiErrorHandler.setToastSystem({
  error: (title, options) => toast.error(title, options),
  success: (title, options) => toast.success(title, options),
  info: (title, options) => toast.info(title, options),
});
```

#### Uso

```typescript
import { handleApiError } from '@/lib/errorHandler';

try {
  await httpClient.post('/api/users', userData);
} catch (error) {
  handleApiError(error, 'Criação de usuário');
}
```

## Padrões de Uso

### 1. Estrutura de Componente com API

```typescript
import { useApiQuery, useApiMutation } from '@/hooks/api';
import { httpClient } from '@/lib/httpClient';

function UserManagement() {
  // Query para listar usuários
  const { 
    data: users, 
    loading: loadingUsers, 
    refetch 
  } = useApiQuery<User[]>(['users'], '/api/users');

  // Mutation para criar usuário
  const { 
    mutate: createUser, 
    loading: creatingUser 
  } = useApiMutation(
    (userData: CreateUserData) => httpClient.post<User>('/api/users', userData),
    {
      onSuccess: () => {
        refetch(); // Atualiza lista após criação
      }
    }
  );

  // Mutation para deletar usuário
  const { mutate: deleteUser } = useApiMutation(
    (id: string) => httpClient.delete(`/api/users/${id}`),
    {
      onSuccess: () => {
        refetch(); // Atualiza lista após deleção
      }
    }
  );

  return (
    <div>
      {/* UI do componente */}
    </div>
  );
}
```

### 2. Service Layer com API Client

```typescript
// userApiClient.ts
import { httpClient } from '@/lib/httpClient';
import type { User, CreateUserData, UpdateUserData } from '@/types';

export class UserApiClient {
  static async findAll(): Promise<User[]> {
    const response = await httpClient.get<User[]>('/api/users');
    return response.data;
  }

  static async findById(id: string): Promise<User> {
    const response = await httpClient.get<User>(`/api/users/${id}`);
    return response.data;
  }

  static async create(userData: CreateUserData): Promise<User> {
    const response = await httpClient.post<User>('/api/users', userData);
    return response.data;
  }

  static async update(id: string, userData: UpdateUserData): Promise<User> {
    const response = await httpClient.put<User>(`/api/users/${id}`, userData);
    return response.data;
  }

  static async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/users/${id}`);
  }
}
```

## Testes

A infraestrutura inclui testes unitários completos:

- `src/lib/__tests__/httpClient.test.ts`
- `src/hooks/api/__tests__/useApiQuery.test.ts`
- `src/hooks/api/__tests__/useApiMutation.test.ts`

### Executar Testes

```bash
npm test -- --testPathPattern="httpClient|useApiQuery|useApiMutation"
```

## Próximos Passos

1. **Criar APIs Faltantes**: Implementar endpoints que ainda não existem
2. **Migrar Serviços**: Converter serviços existentes para usar HTTP client
3. **Refatorar Provider**: Migrar PrismaProvider para ApiProvider
4. **Atualizar Componentes**: Migrar componentes para usar novos hooks
5. **Remover Dependências Prisma**: Limpar imports diretos do Prisma

## Benefícios

- **Arquitetura Limpa**: Separação clara entre frontend e backend
- **Testabilidade**: Fácil mockar APIs em testes
- **Escalabilidade**: Possibilidade de separar frontend e backend
- **Consistência**: Padrão único de acesso a dados
- **Manutenibilidade**: Código mais organizado e fácil de manter