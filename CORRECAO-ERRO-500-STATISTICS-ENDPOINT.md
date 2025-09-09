# Correção do Erro 500 no Endpoint de Estatísticas de XP

## Problema Identificado

O endpoint `/api/gamification/xp-grants/statistics` estava retornando erro 500 (Internal Server Error) em vez do esperado 401 (Unauthorized) quando acessado sem autenticação.

### Erro Original
```
GET http://localhost:3000/api/gamification/xp-grants/statistics?period=30d 500 (Internal Server Error)
```

### Resposta de Erro
```json
{
  "error": "Erro interno de autenticação"
}
```

## Causa Raiz

O problema foi causado por **importação circular** entre os módulos:

1. **`src/lib/auth.ts`** importava `UserService` de `@/services/userService`
2. **`UserService`** dependia de outras importações que eventualmente causavam conflito
3. **`AuthMiddleware`** importava `authOptions` de `@/lib/auth`
4. **Nome incorreto** da configuração de autenticação (`supervisorOrAbove` vs `supervisorAndAbove`)

## Solução Implementada

### 1. Remoção da Dependência Circular

**Antes** (`src/lib/auth.ts`):
```typescript
import { UserService } from "@/services/userService";

// No authorize()
const user = await UserService.verifyCredentials(
  credentials.email,
  credentials.password
);
```

**Depois** (`src/lib/auth.ts`):
```typescript
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// No authorize()
const user = await prisma.user.findUnique({
  where: { email: credentials.email }
});

const isValidPassword = await bcrypt.compare(credentials.password, user.password);
```

### 2. Correção do Nome da Configuração

**Antes** (`src/app/api/gamification/xp-grants/statistics/route.ts`):
```typescript
const authResult = await AuthMiddleware.checkAuth(request, AuthConfigs.supervisorOrAbove);
```

**Depois**:
```typescript
const authResult = await AuthMiddleware.checkAuth(request, AuthConfigs.supervisorAndAbove);
```

## Resultado

✅ **Antes**: Erro 500 (Internal Server Error)  
✅ **Depois**: Erro 401 (Unauthorized) - comportamento correto

### Teste de Validação
```bash
# Comando de teste
Invoke-WebRequest -Uri "http://localhost:3000/api/gamification/xp-grants/statistics?period=30d" -Method GET

# Resultado esperado
Invoke-WebRequest : O servidor remoto retornou um erro: (401) Não Autorizado.
```

## Arquivos Modificados

1. **`src/lib/auth.ts`**
   - Removida importação do `UserService`
   - Adicionada importação direta do `prisma` e `bcrypt`
   - Implementada verificação de credenciais diretamente no `authorize()`

2. **`src/app/api/gamification/xp-grants/statistics/route.ts`**
   - Corrigido nome da configuração de autenticação
   - Mantida funcionalidade completa do endpoint

## Benefícios

1. **Eliminação de importação circular** - Melhora a estabilidade do sistema
2. **Autenticação mais direta** - Reduz dependências desnecessárias
3. **Erro correto retornado** - Facilita debugging e UX
4. **Performance melhorada** - Menos camadas de abstração na autenticação

## Impacto

- ✅ Endpoint de estatísticas funcionando corretamente
- ✅ Middleware de autenticação estabilizado
- ✅ Outros endpoints que usam o mesmo middleware também beneficiados
- ✅ Redução de erros 500 relacionados à autenticação

## Próximos Passos

1. Verificar se outros endpoints têm problemas similares
2. Implementar testes automatizados para prevenir regressões
3. Documentar padrões de autenticação para evitar problemas futuros