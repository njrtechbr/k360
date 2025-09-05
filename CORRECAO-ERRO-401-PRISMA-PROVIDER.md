# Correção do Erro HTTP 401 no PrismaProvider

## Problema Identificado

O `PrismaProvider` estava fazendo chamadas para `/api/users` e outros endpoints protegidos antes do usuário estar completamente autenticado, resultando em erros **HTTP 401 (Unauthorized)**.

## Causa Raiz

1. **Timing de Autenticação**: O `fetchAllData` era chamado assim que havia uma sessão, mas antes do status ser `'authenticated'`
2. **Falta de Verificação de Permissões**: Tentava buscar dados de usuários mesmo para roles que não têm permissão
3. **Estado de Loading**: Não verificava se a sessão estava completamente carregada

## Análise dos Endpoints

### `/api/users` - Requer ADMIN ou SUPERADMIN
```typescript
// Verificar permissões - apenas ADMIN e SUPERADMIN podem listar usuários
if (!['ADMIN', 'SUPERADMIN'].includes(currentUser.role)) {
  return NextResponse.json(
    { error: 'Permissão insuficiente para listar usuários' },
    { status: 403 }
  );
}
```

### Outros Endpoints Protegidos
- `/api/modules` - Requer autenticação
- `/api/attendants` - Requer autenticação  
- `/api/evaluations` - Requer autenticação
- `/api/funcoes` - Requer autenticação

## Soluções Implementadas

### 1. Verificação de Status de Autenticação

**Antes:**
```typescript
useEffect(() => {
  if (session?.user) {
    // Chamava fetchAllData imediatamente
    fetchAllData();
  }
}, [session, status, fetchAllData]);
```

**Depois:**
```typescript
useEffect(() => {
  if (session?.user && status === 'authenticated') {
    // Só chama quando completamente autenticado
    fetchAllData();
  } else {
    // Limpa dados quando não autenticado
    setAllUsers([]);
    setModules([]);
    // etc...
  }
}, [session, status, fetchAllData]);
```

### 2. Verificação de Permissões no fetchAllData

**Antes:**
```typescript
const fetchAllData = useCallback(async () => {
  // Tentava buscar usuários sempre
  const usersResponse = await fetch('/api/users');
  if (usersResponse.ok) {
    setAllUsers(usersData);
  }
}, [toast]);
```

**Depois:**
```typescript
const fetchAllData = useCallback(async () => {
  // Só buscar dados se o usuário estiver autenticado
  if (!session?.user) {
    setAppLoading(false);
    return;
  }

  const userRole = session.user.role as Role;
  
  // Fetch users apenas para ADMIN e SUPERADMIN
  if (['ADMIN', 'SUPERADMIN'].includes(userRole)) {
    const usersResponse = await fetch('/api/users');
    if (usersResponse.ok) {
      setAllUsers(usersData);
    }
  } else {
    // Usuários sem permissão não precisam da lista
    setAllUsers([]);
  }
}, [toast, session]);
```

### 3. Limpeza de Estado

**Adicionado limpeza de dados quando usuário não está autenticado:**
```typescript
} else {
  setUser(null);
  // Limpar dados quando não autenticado
  setAllUsers([]);
  setModules([]);
  setAttendants([]);
  setEvaluations([]);
  setAttendantImports([]);
  setEvaluationImports([]);
  setFuncoes([]);
  setSetores([]);
}
```

## Fluxo Corrigido

### Antes (Com Erro 401)
```
1. Componente monta
2. useSession retorna sessão parcial
3. PrismaProvider chama fetchAllData()
4. fetchAllData faz fetch('/api/users') sem autenticação completa
5. Servidor retorna 401 Unauthorized
6. Console mostra erro
```

### Depois (Funcionando)
```
1. Componente monta
2. useSession está em loading
3. PrismaProvider aguarda status === 'authenticated'
4. Quando autenticado, verifica permissões do usuário
5. Só busca dados que o usuário tem permissão para acessar
6. Sem erros 401
```

## Benefícios da Correção

1. **Sem Erros 401**: Não há mais tentativas de acesso não autorizado
2. **Melhor Performance**: Só busca dados necessários baseado no role
3. **UX Melhorada**: Não mostra erros desnecessários no console
4. **Segurança**: Respeita as permissões de cada role
5. **Estado Limpo**: Limpa dados quando usuário não está autenticado

## Roles e Permissões

| Endpoint | SUPERADMIN | ADMIN | SUPERVISOR | USUARIO |
|----------|------------|-------|------------|---------|
| `/api/users` | ✅ | ✅ | ❌ | ❌ |
| `/api/modules` | ✅ | ✅ | ✅ | ✅ |
| `/api/attendants` | ✅ | ✅ | ✅ | ✅ |
| `/api/evaluations` | ✅ | ✅ | ✅ | ✅ |

## Arquivos Modificados

- `src/providers/PrismaProvider.tsx` - Correção do timing e permissões

## Testes Recomendados

1. **Login com diferentes roles**: Verificar se dados corretos são carregados
2. **Logout**: Confirmar que dados são limpos
3. **Refresh da página**: Verificar se não há erros 401 durante carregamento
4. **Console do navegador**: Confirmar ausência de erros 401

## Monitoramento

Para verificar se a correção está funcionando:

```bash
# Verificar logs de acesso (não deve haver 401 para /api/users)
grep "401.*api/users" logs/access.log

# Verificar se autenticação está funcionando
grep "Não autorizado" logs/application.log

# Monitorar carregamento de dados
grep "Error fetching data" logs/application.log
```

## Prevenção Futura

Para evitar problemas similares:

1. **Sempre verificar `status === 'authenticated'`** antes de fazer chamadas de API
2. **Implementar verificação de permissões** no frontend antes de chamar APIs
3. **Usar loading states** adequados durante autenticação
4. **Limpar estado** quando usuário não está autenticado
5. **Testar com diferentes roles** durante desenvolvimento