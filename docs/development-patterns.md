# Padrões de Desenvolvimento - Pós Migração

## Visão Geral

Este documento estabelece os padrões de desenvolvimento que devem ser seguidos após a migração para arquitetura baseada em APIs, garantindo consistência e qualidade do código.

## Arquitetura em Camadas

### Separação de Responsabilidades

```
Frontend (Client-Side)
├── Components (UI)
├── Hooks (State & Effects)
├── Providers (Global State)
└── API Clients (HTTP Communication)
    │
    └── HTTP/REST
        │
Backend (Server-Side)
├── API Routes (Business Logic)
├── Validation (Zod Schemas)
├── Authentication (NextAuth)
└── Data Access (Prisma Singleton)
```

## Padrões para API Clients

### Estrutura Padrão

```typescript
// src/services/exampleApiClient.ts
import { httpClient, HttpClientError } from '@/lib/httpClient';
import { ExampleData, CreateExampleData } from '@/types/example';

export class ExampleApiClient {
  private static readonly BASE_URL = '/api/examples';

  /**
   * Lista todos os exemplos
   */
  static async getAll(): Promise<ExampleData[]> {
    try {
      const response = await httpClient.get<ExampleData[]>(this.BASE_URL);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(`Erro ao buscar exemplos: ${error.message}`);
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca exemplo por ID
   */
  static async getById(id: string): Promise<ExampleData | null> {
    try {
      const response = await httpClient.get<ExampleData>(`${this.BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError && error.status === 404) {
        return null;
      }
      if (error instanceof HttpClientError) {
        throw new Error(`Erro ao buscar exemplo: ${error.message}`);
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria novo exemplo
   */
  static async create(data: CreateExampleData): Promise<ExampleData> {
    try {
      const response = await httpClient.post<ExampleData>(this.BASE_URL, data);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(`Erro ao criar exemplo: ${error.message}`);
      }
      throw new Error('Erro interno do servidor');
    }
  }
}
```

### Convenções para API Clients

1. **Classe estática**: Todos os métodos são estáticos
2. **BASE_URL constante**: URL base definida como constante privada
3. **Tratamento de erros**: Sempre tratar `HttpClientError`
4. **Tipos específicos**: Usar tipos locais, não do Prisma
5. **JSDoc**: Documentar métodos públicos
6. **Null handling**: Retornar `null` para recursos não encontrados

## Padrões para API Routes

### Estrutura Padrão

```typescript
// src/app/api/examples/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema de validação
const CreateExampleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

/**
 * GET /api/examples - Lista exemplos
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Parâmetros de query
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Buscar dados
    const examples = await prisma.example.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(examples);
  } catch (error) {
    console.error('Erro ao buscar exemplos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/examples - Cria exemplo
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Autorização
    if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Validação do body
    const body = await request.json();
    const validatedData = CreateExampleSchema.parse(body);

    // Criar recurso
    const example = await prisma.example.create({
      data: {
        ...validatedData,
        createdBy: session.user.id
      }
    });

    return NextResponse.json(example, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Dados inválidos: ${error.errors.map(e => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    console.error('Erro ao criar exemplo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### Convenções para API Routes

1. **Autenticação primeiro**: Sempre verificar sessão
2. **Autorização quando necessário**: Verificar roles específicos
3. **Validação com Zod**: Schemas para validação de entrada
4. **Prisma singleton**: Sempre usar `import { prisma } from '@/lib/prisma'`
5. **Tratamento de erros**: Logs detalhados + respostas padronizadas
6. **Status codes corretos**: 200, 201, 400, 401, 403, 500
7. **JSDoc**: Documentar endpoints

## Padrões para Tipos

### Tipos Locais vs Prisma

```typescript
// ❌ Não importar tipos do Prisma no frontend
import { Attendant } from '@prisma/client';

// ✅ Criar tipos locais específicos
// src/types/attendant.ts
export interface AttendantData {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  // Apenas campos necessários no frontend
}

export interface CreateAttendantData {
  name: string;
  email: string;
  isActive?: boolean;
}

export interface UpdateAttendantData {
  name?: string;
  email?: string;
  isActive?: boolean;
}
```

### Convenções para Tipos

1. **Sufixos descritivos**: `Data`, `Create`, `Update`, `Response`
2. **Campos opcionais**: Usar `?` para campos opcionais
3. **Documentação**: JSDoc para tipos complexos
4. **Reutilização**: Tipos base + extensões quando apropriado
5. **Validação**: Schemas Zod correspondentes

## Padrões para Hooks

### Hook Customizado Padrão

```typescript
// src/hooks/useExamples.ts
import { useState, useEffect } from 'react';
import { ExampleApiClient } from '@/services/exampleApiClient';
import { ExampleData } from '@/types/example';

interface UseExamplesOptions {
  autoFetch?: boolean;
  limit?: number;
}

export function useExamples(options: UseExamplesOptions = {}) {
  const { autoFetch = true, limit = 10 } = options;
  
  const [examples, setExamples] = useState<ExampleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExamples = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ExampleApiClient.getAll();
      setExamples(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createExample = async (data: CreateExampleData) => {
    try {
      setError(null);
      const newExample = await ExampleApiClient.create(data);
      setExamples(prev => [newExample, ...prev]);
      return newExample;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchExamples();
    }
  }, [autoFetch]);

  return {
    examples,
    loading,
    error,
    fetchExamples,
    createExample,
    refetch: fetchExamples
  };
}
```

### Convenções para Hooks

1. **Prefixo `use`**: Sempre começar com `use`
2. **Estado consistente**: `data`, `loading`, `error`
3. **Funções de ação**: `create`, `update`, `delete`, `refetch`
4. **Opções configuráveis**: Interface para opções
5. **Tratamento de erros**: Capturar e expor erros
6. **TypeScript**: Tipos explícitos para parâmetros e retorno

## Padrões para Componentes

### Componente com API Client

```typescript
// src/components/ExampleList.tsx
'use client';

import { useExamples } from '@/hooks/useExamples';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

interface ExampleListProps {
  limit?: number;
  showCreateButton?: boolean;
}

export function ExampleList({ limit = 10, showCreateButton = true }: ExampleListProps) {
  const { examples, loading, error, refetch } = useExamples({ limit });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {showCreateButton && (
        <CreateExampleButton onSuccess={refetch} />
      )}
      
      <div className="grid gap-4">
        {examples.map(example => (
          <ExampleCard key={example.id} example={example} />
        ))}
      </div>
      
      {examples.length === 0 && (
        <EmptyState message="Nenhum exemplo encontrado" />
      )}
    </div>
  );
}
```

### Convenções para Componentes

1. **'use client'**: Para componentes que usam hooks
2. **Props interface**: Sempre definir interface para props
3. **Estados de loading**: Mostrar loading, error e empty states
4. **Composição**: Quebrar em componentes menores
5. **Acessibilidade**: Seguir padrões de acessibilidade
6. **TypeScript**: Tipos explícitos para props

## Padrões para Testes

### Teste de API Client

```typescript
// src/services/__tests__/exampleApiClient.test.ts
import { ExampleApiClient } from '../exampleApiClient';
import { httpClient } from '@/lib/httpClient';

jest.mock('@/lib/httpClient');
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('ExampleApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all examples successfully', async () => {
      const mockExamples = [
        { id: '1', name: 'Example 1' },
        { id: '2', name: 'Example 2' }
      ];
      
      mockHttpClient.get.mockResolvedValue({ data: mockExamples });

      const result = await ExampleApiClient.getAll();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/examples');
      expect(result).toEqual(mockExamples);
    });

    it('should handle errors properly', async () => {
      const error = new HttpClientError('Network error', 500);
      mockHttpClient.get.mockRejectedValue(error);

      await expect(ExampleApiClient.getAll()).rejects.toThrow('Erro ao buscar exemplos: Network error');
    });
  });
});
```

### Teste de API Route

```typescript
// src/app/api/examples/__tests__/route.test.ts
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    example: {
      findMany: jest.fn(),
      create: jest.fn()
    }
  }
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/examples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return examples for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'USER' }
      } as any);
      
      const mockExamples = [{ id: '1', name: 'Test' }];
      mockPrisma.example.findMany.mockResolvedValue(mockExamples as any);

      const request = new Request('http://localhost/api/examples');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockExamples);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost/api/examples');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
```

### Convenções para Testes

1. **Mocks**: Sempre mockar dependências externas
2. **Describe/it**: Estrutura clara de testes
3. **beforeEach**: Limpar mocks antes de cada teste
4. **Casos de sucesso e erro**: Testar ambos os cenários
5. **Assertions específicas**: Verificar status, dados e chamadas
6. **Nomes descritivos**: Descrever o que está sendo testado

## Validação e Qualidade

### ESLint Rules

```json
// .eslintrc.json (regras específicas)
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error"
  }
}
```

### Scripts de Validação

```bash
# Verificar uso do Prisma
npm run validate:prisma

# Verificar tipos
npm run typecheck

# Executar testes
npm test

# Build de produção
npm run build
```

## Monitoramento e Logs

### Padrão de Logs

```typescript
// Em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// Em produção (apenas erros)
console.error('Erro crítico:', error);

// Logs estruturados
console.log(JSON.stringify({
  level: 'info',
  message: 'Operação realizada',
  userId: session.user.id,
  timestamp: new Date().toISOString()
}));
```

### Métricas Importantes

1. **Tempo de resposta**: APIs < 500ms
2. **Taxa de erro**: < 1% das requests
3. **Uso de memória**: Monitorar vazamentos
4. **Conexões DB**: Não exceder limites

## Checklist de Desenvolvimento

### Para Novos Recursos

- [ ] API Client criado seguindo padrões
- [ ] Endpoints implementados com validação
- [ ] Tipos locais definidos
- [ ] Hooks customizados quando necessário
- [ ] Componentes com tratamento de estados
- [ ] Testes unitários e de integração
- [ ] Documentação atualizada
- [ ] Validação de performance

### Para Manutenção

- [ ] Não usar Prisma diretamente no frontend
- [ ] Sempre usar singleton do Prisma nas APIs
- [ ] Validar entrada com Zod
- [ ] Tratar erros adequadamente
- [ ] Manter testes atualizados
- [ ] Seguir padrões estabelecidos

## Recursos Adicionais

- [Documentação da Arquitetura](./api-architecture.md)
- [Guia de Troubleshooting](./troubleshooting-migration.md)
- [Guia de Migração](./migration-guide.md)