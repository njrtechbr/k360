# Documento de Design - Migração Firebase para Prisma

## Visão Geral

Este documento detalha o design técnico para migrar completamente o sistema do Firebase para Prisma com PostgreSQL. A migração envolve substituir Firebase Auth por NextAuth, Firestore por Prisma ORM, e remover todas as dependências Firebase mantendo a funcionalidade existente.

## Arquitetura

### Arquitetura Atual (Firebase)
```
Frontend (React/Next.js)
    ↓
AuthProvider (Firebase Auth + Firestore)
    ↓
Firebase Services
    ↓
Firestore Database
```

### Nova Arquitetura (Prisma)
```
Frontend (React/Next.js)
    ↓
AuthProvider (NextAuth + Prisma)
    ↓
Prisma Services
    ↓
PostgreSQL Database
```

### Componentes Principais

1. **AuthProvider Refatorado**: Substituir Firebase por NextAuth e Prisma
2. **Prisma Services**: Novos serviços para operações de banco de dados
3. **NextAuth Configuration**: Configuração de autenticação
4. **Database Layer**: Operações Prisma para todas as entidades

## Componentes e Interfaces

### 1. AuthProvider Refatorado

**Localização**: `src/providers/AuthProvider.tsx`

**Mudanças Principais**:
- Remover imports Firebase (`firebase/auth`, `firebase/firestore`)
- Adicionar imports NextAuth (`next-auth/react`)
- Adicionar imports Prisma (`@/lib/prisma`)
- Substituir `onAuthStateChanged` por `useSession`
- Substituir operações Firestore por operações Prisma

**Interface Mantida**:
```typescript
interface AuthContextType {
  // Mantém a mesma interface pública
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // ... todas as outras propriedades existentes
}
```

### 2. Serviços Prisma

**Localização**: `src/services/`

**Novos Arquivos**:
- `src/services/userService.ts` - Operações de usuário
- `src/services/attendantService.ts` - Operações de atendente
- `src/services/evaluationService.ts` - Operações de avaliação
- `src/services/gamificationService.ts` - Operações de gamificação
- `src/services/moduleService.ts` - Operações de módulo
- `src/services/rhService.ts` - Operações de RH (funções/setores)

**Padrão de Serviço**:
```typescript
export class UserService {
  async findAll(): Promise<User[]>
  async findById(id: string): Promise<User | null>
  async create(data: CreateUserData): Promise<User>
  async update(id: string, data: UpdateUserData): Promise<User>
  async delete(id: string): Promise<void>
}
```

### 3. NextAuth Configuration

**Localização**: `src/app/api/auth/[...nextauth]/route.ts`

**Configuração**:
```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      // Configuração para login com email/senha
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // Callbacks para sessão e JWT
  }
}
```

### 4. Prisma Client Configuration

**Localização**: `src/lib/prisma.ts`

**Configuração**:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Modelos de Dados

### Mapeamento Firebase → Prisma

| Firebase Collection | Prisma Model | Observações |
|-------------------|--------------|-------------|
| users | User | Adicionar campos NextAuth |
| attendants | Attendant | Manter estrutura existente |
| evaluations | Evaluation | Manter estrutura existente |
| modules | Module | Manter estrutura existente |
| xp_events | XpEvent | Manter estrutura existente |
| gamification/config | GamificationConfig | Converter de documento único |
| funcoes | Funcao | Manter estrutura existente |
| setores | Setor | Manter estrutura existente |

### Campos Adicionais NextAuth

O modelo User já possui os campos necessários para NextAuth:
- `emailVerified: DateTime?`
- `image: String?`
- Relacionamentos com `Account` e `Session`

## Tratamento de Erros

### Estratégia de Error Handling

1. **Prisma Errors**: Capturar e converter erros Prisma em mensagens amigáveis
2. **Validation Errors**: Usar Zod para validação de dados
3. **Authentication Errors**: Tratar erros NextAuth adequadamente
4. **Database Connection**: Implementar retry logic e fallbacks

**Implementação**:
```typescript
export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export const handlePrismaError = (error: any): never => {
  if (error.code === 'P2002') {
    throw new DatabaseError('Registro já existe')
  }
  // ... outros códigos de erro
  throw new DatabaseError('Erro interno do banco de dados')
}
```

## Estratégia de Testes

### Testes Unitários

1. **Serviços Prisma**: Testar operações CRUD com banco em memória
2. **AuthProvider**: Testar fluxos de autenticação com mocks
3. **Utilities**: Testar funções de validação e transformação

### Testes de Integração

1. **API Routes**: Testar endpoints NextAuth
2. **Database Operations**: Testar operações Prisma com banco de teste
3. **Authentication Flow**: Testar fluxo completo de login/logout

### Configuração de Teste

```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
```

## Migração de Dados

### Estratégia de Migração

1. **Não Aplicável**: O sistema já usa PostgreSQL com Prisma
2. **Limpeza**: Remover referências Firebase do código
3. **Validação**: Verificar integridade dos dados existentes
4. **Testes**: Validar funcionamento com dados reais

### Scripts de Validação

**Localização**: `scripts/validate-migration.ts`

```typescript
export async function validateDataIntegrity() {
  // Verificar se todos os relacionamentos estão corretos
  // Validar dados de gamificação
  // Confirmar integridade referencial
}
```

## Considerações de Performance

### Otimizações Prisma

1. **Connection Pooling**: Configurar pool de conexões adequado
2. **Query Optimization**: Usar `include` e `select` apropriadamente
3. **Batch Operations**: Usar transações para operações em lote
4. **Caching**: Implementar cache para consultas frequentes

### Exemplo de Otimização

```typescript
// Buscar atendentes com avaliações (otimizado)
const attendantsWithEvaluations = await prisma.attendant.findMany({
  include: {
    evaluations: {
      select: {
        id: true,
        nota: true,
        data: true,
        xpGained: true
      },
      orderBy: { data: 'desc' },
      take: 10 // Limitar resultados
    }
  }
})
```

## Considerações de Segurança

### Autenticação e Autorização

1. **NextAuth Security**: Configurar secrets e cookies seguros
2. **Role-Based Access**: Implementar verificação de roles
3. **API Protection**: Proteger rotas API com middleware
4. **Input Validation**: Validar todos os inputs com Zod

### Implementação de Middleware

```typescript
// src/middleware.ts
export { default } from "next-auth/middleware"

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"]
}
```

## Plano de Rollback

### Estratégia de Contingência

1. **Backup**: Manter backup do código Firebase (branch separada)
2. **Feature Flags**: Implementar flags para alternar entre implementações
3. **Monitoring**: Monitorar erros após deploy
4. **Quick Revert**: Processo rápido para reverter mudanças

### Implementação de Feature Flag

```typescript
const USE_PRISMA = process.env.USE_PRISMA === 'true'

export const authProvider = USE_PRISMA ? PrismaAuthProvider : FirebaseAuthProvider
```