# Migração do PrismaProvider para ApiProvider

Este documento descreve como migrar do antigo `PrismaProvider` para o novo `ApiProvider` baseado em APIs REST.

## Visão Geral

O `ApiProvider` substitui o `PrismaProvider` com uma arquitetura baseada em APIs REST, oferecendo:

- ✅ Separação clara entre frontend e backend
- ✅ Melhor testabilidade com mocks de API
- ✅ Tratamento de erro consistente
- ✅ Cache automático e retry logic
- ✅ Loading states padronizados
- ✅ Compatibilidade com a interface existente

## Mudanças Principais

### 1. Estados de Dados

**Antes (PrismaProvider):**
```typescript
const { attendants } = usePrisma();
// attendants era um SafeDataState<Attendant[]>
```

**Depois (ApiProvider):**
```typescript
const { attendants } = useApi();
// attendants é um UseApiQueryResult<Attendant[]>
```

### 2. Estrutura dos Estados

**Antes:**
```typescript
interface SafeDataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  setData: (data: T) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

**Depois:**
```typescript
interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
  refetch: () => Promise<void>;
  isStale: boolean;
  isFetching: boolean;
}
```

### 3. Operações de Mutação

**Antes:**
```typescript
const { updateUser } = usePrisma();
await updateUser(userId, userData);
```

**Depois:**
```typescript
const { updateUser } = useApi();
await updateUser.mutateAsync({ userId, ...userData });
```

## Guia de Migração Passo a Passo

### Passo 1: Atualizar Importações

```typescript
// Antes
import { usePrisma } from '@/providers/PrismaProvider';

// Depois
import { useApi } from '@/providers/ApiProvider';
// ou para compatibilidade:
import { usePrisma } from '@/providers/ApiProvider';
```

### Passo 2: Atualizar Acesso aos Dados

```typescript
// Antes
const { attendants } = usePrisma();
const attendantsList = attendants.data;

// Depois (mesma interface)
const { attendants } = useApi();
const attendantsList = attendants.data;
```

### Passo 3: Atualizar Operações de Mutação

```typescript
// Antes
const handleCreateUser = async () => {
  try {
    await createUser({
      name: 'João',
      email: 'joao@example.com',
      role: 'USER',
      modules: []
    });
  } catch (error) {
    console.error(error);
  }
};

// Depois
const handleCreateUser = async () => {
  try {
    await createUser.mutateAsync({
      name: 'João',
      email: 'joao@example.com',
      role: 'USER',
      modules: []
    });
  } catch (error) {
    console.error(error);
  }
};
```

### Passo 4: Atualizar Estados de Loading

```typescript
// Antes
const { attendants, isProcessing } = usePrisma();
if (attendants.loading || isProcessing) {
  return <Loading />;
}

// Depois
const { attendants, createAttendant } = useApi();
if (attendants.loading || createAttendant.loading) {
  return <Loading />;
}
```

## Exemplos de Migração

### Componente de Lista de Usuários

**Antes:**
```typescript
const UsersList = () => {
  const { allUsers, updateUser, deleteUser } = usePrisma();

  const handleUpdate = async (userId: string, data: any) => {
    await updateUser(userId, data);
  };

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
  };

  if (allUsers.loading) return <div>Carregando...</div>;
  if (allUsers.error) return <div>Erro: {allUsers.error}</div>;

  return (
    <div>
      {allUsers.data.map(user => (
        <UserCard 
          key={user.id} 
          user={user}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
```

**Depois:**
```typescript
const UsersList = () => {
  const { allUsers, updateUser, deleteUser } = useApi();

  const handleUpdate = async (userId: string, data: any) => {
    await updateUser.mutateAsync({ userId, ...data });
  };

  const handleDelete = async (userId: string) => {
    await deleteUser.mutateAsync(userId);
  };

  if (allUsers.loading) return <div>Carregando...</div>;
  if (allUsers.error) return <div>Erro: {allUsers.error}</div>;

  return (
    <div>
      {allUsers.data?.map(user => (
        <UserCard 
          key={user.id} 
          user={user}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          updating={updateUser.loading}
          deleting={deleteUser.loading}
        />
      ))}
    </div>
  );
};
```

### Formulário de Criação

**Antes:**
```typescript
const CreateAttendantForm = () => {
  const { addAttendant, isProcessing } = usePrisma();

  const handleSubmit = async (data: AttendantData) => {
    try {
      await addAttendant(data);
      // Sucesso tratado automaticamente
    } catch (error) {
      // Erro tratado automaticamente
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* campos do formulário */}
      <button type="submit" disabled={isProcessing}>
        {isProcessing ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
};
```

**Depois:**
```typescript
const CreateAttendantForm = () => {
  const { addAttendant } = useApi();

  const handleSubmit = async (data: AttendantData) => {
    try {
      await addAttendant.mutateAsync(data);
      // Sucesso tratado automaticamente via toast
    } catch (error) {
      // Erro tratado automaticamente via toast
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* campos do formulário */}
      <button type="submit" disabled={addAttendant.loading}>
        {addAttendant.loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
};
```

## Benefícios da Migração

### 1. Melhor Performance
- Cache automático de queries
- Refetch inteligente (apenas quando necessário)
- Retry automático em caso de falha

### 2. Melhor UX
- Loading states mais granulares
- Tratamento de erro consistente
- Feedback visual automático via toasts

### 3. Melhor DX (Developer Experience)
- Tipos TypeScript mais precisos
- Melhor testabilidade
- Debugging mais fácil

### 4. Arquitetura Mais Limpa
- Separação clara frontend/backend
- Reutilização de lógica de API
- Padrões consistentes

## Compatibilidade

O `ApiProvider` mantém compatibilidade com a interface do `PrismaProvider` através do alias `usePrisma`. Isso permite migração gradual:

```typescript
// Funciona com ambos os providers
const { attendants, addAttendant } = usePrisma();
```

## Troubleshooting

### Problema: "useApi deve ser usado dentro de um ApiProvider"
**Solução:** Certifique-se de que o componente está envolvido pelo `ApiProvider`:

```typescript
// App.tsx
import { ApiProvider } from '@/providers/ApiProvider';

function App() {
  return (
    <ApiProvider>
      <YourComponent />
    </ApiProvider>
  );
}
```

### Problema: Dados não carregam
**Verificações:**
1. Usuário está autenticado?
2. API endpoints existem e funcionam?
3. Permissões corretas para o role do usuário?

### Problema: Mutações não funcionam
**Verificações:**
1. Usar `mutateAsync()` ao invés de chamar diretamente
2. Verificar se endpoint de API existe
3. Verificar logs de erro no console

## Próximos Passos

1. Migrar componentes um por vez
2. Testar cada componente migrado
3. Remover `PrismaProvider` quando migração estiver completa
4. Atualizar testes para usar mocks de API