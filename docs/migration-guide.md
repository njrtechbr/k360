# Guia de Migração - Prisma para Arquitetura de APIs

## Visão Geral

Este documento serve como guia para futuras migrações similares, documentando o processo completo de migração do uso direto do Prisma no frontend para uma arquitetura baseada em APIs REST.

## Contexto da Migração

### Problema Original
- **178 itens** identificados que precisavam ser migrados
- **Frontend usando Prisma diretamente**: Violação da separação de responsabilidades
- **Múltiplas instâncias do PrismaClient**: Desperdício de conexões
- **Serviços legados**: Código inconsistente e difícil de manter

### Objetivos Alcançados
- ✅ Separação clara entre frontend e backend
- ✅ Otimização de conexões com singleton
- ✅ Código mais testável e manutenível
- ✅ Arquitetura escalável e consistente

## Processo de Migração

### Fase 1: Análise e Planejamento

#### 1.1 Identificação de Problemas
```bash
# Script para identificar uso direto do Prisma
node scripts/find-prisma-usage.js
```

**Saída esperada**:
- Lista de arquivos com uso direto do Prisma
- Contagem de instâncias `new PrismaClient()`
- Identificação de serviços legados

#### 1.2 Categorização dos Problemas
1. **Críticos**: Serviços do frontend usando Prisma
2. **Importantes**: Múltiplas instâncias do PrismaClient
3. **Limpeza**: Serviços legados para remoção

### Fase 2: Criação da Nova Arquitetura

#### 2.1 API Clients
Criar clients para abstrair comunicação HTTP:

```typescript
// Template para API Client
export class ExampleApiClient {
  private static readonly BASE_URL = '/api/example';

  static async getData(): Promise<DataType> {
    try {
      const response = await httpClient.get<DataType>(`${this.BASE_URL}/data`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }
      throw new Error('Erro interno do servidor');
    }
  }
}
```

#### 2.2 API Endpoints
Criar endpoints REST correspondentes:

```typescript
// Template para API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Lógica de negócio
    const data = await prisma.model.findMany();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro no endpoint:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

#### 2.3 Tipos Locais
Criar tipos específicos para o frontend:

```typescript
// src/types/example.ts
export interface ExampleData {
  id: string;
  name: string;
  createdAt: Date;
  // Apenas campos necessários no frontend
}

// Evitar importar tipos do Prisma no frontend
// import { Example } from '@prisma/client'; // ❌
```

### Fase 3: Migração Incremental

#### 3.1 Substituição de Serviços
Processo para cada serviço:

1. **Criar API Client**
2. **Criar endpoints correspondentes**
3. **Atualizar componentes para usar API Client**
4. **Testar funcionalidade**
5. **Remover serviço antigo**

#### 3.2 Padronização do Prisma
Substituir todas as instâncias:

```bash
# Buscar instâncias diretas
grep -r "new PrismaClient" src/

# Substituir por singleton
# ❌ const prisma = new PrismaClient();
# ✅ import { prisma } from '@/lib/prisma';
```

### Fase 4: Validação e Testes

#### 4.1 Testes Unitários
```typescript
// Template para teste de API Client
jest.mock('@/lib/httpClient');
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('ExampleApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: '1', name: 'Test' };
    mockHttpClient.get.mockResolvedValue({ data: mockData });

    const result = await ExampleApiClient.getData();
    
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/example/data');
    expect(result).toEqual(mockData);
  });
});
```

#### 4.2 Testes de Integração
```typescript
// Template para teste de integração
describe('Example API Integration', () => {
  it('should return data from endpoint', async () => {
    const response = await fetch('/api/example/data');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
  });
});
```

#### 4.3 Validação Automática
```bash
# Executar validação completa
node scripts/find-prisma-usage.js
npm run build
npm test
```

## Padrões Estabelecidos

### 1. Estrutura de API Client

```typescript
export class ServiceApiClient {
  private static readonly BASE_URL = '/api/service';

  // Métodos estáticos para operações
  static async getAll(): Promise<DataType[]> { }
  static async getById(id: string): Promise<DataType> { }
  static async create(data: CreateDataType): Promise<DataType> { }
  static async update(id: string, data: UpdateDataType): Promise<DataType> { }
  static async delete(id: string): Promise<void> { }
}
```

### 2. Estrutura de API Route

```typescript
// GET - Listar/Buscar
export async function GET(request: NextRequest) {
  // Autenticação
  // Validação de parâmetros
  // Lógica de negócio
  // Retorno padronizado
}

// POST - Criar
export async function POST(request: NextRequest) {
  // Autenticação
  // Validação do body
  // Criação do recurso
  // Retorno do recurso criado
}

// PUT - Atualizar
export async function PUT(request: NextRequest) {
  // Autenticação
  // Validação do body
  // Atualização do recurso
  // Retorno do recurso atualizado
}

// DELETE - Remover
export async function DELETE(request: NextRequest) {
  // Autenticação
  // Validação de permissões
  // Remoção do recurso
  // Retorno de confirmação
}
```

### 3. Tratamento de Erros

```typescript
// Padrão para API Clients
try {
  const response = await httpClient.get<T>(url);
  return response.data;
} catch (error) {
  if (error instanceof HttpClientError) {
    if (error.status === 404) {
      return null; // Para recursos não encontrados
    }
    throw new Error(error.message);
  }
  throw new Error('Erro interno do servidor');
}

// Padrão para API Routes
try {
  // Lógica do endpoint
  return NextResponse.json(data);
} catch (error) {
  console.error('Erro específico:', error);
  return NextResponse.json(
    { error: 'Mensagem de erro apropriada' },
    { status: 500 }
  );
}
```

### 4. Validação com Zod

```typescript
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  age: z.number().min(0).max(120)
});

// Uso no endpoint
const body = await request.json();
const validatedData = CreateSchema.parse(body);
```

## Checklist de Migração

### Preparação
- [ ] Identificar todos os usos diretos do Prisma
- [ ] Categorizar por criticidade
- [ ] Criar plano de migração incremental
- [ ] Configurar ambiente de testes

### Implementação
- [ ] Criar API Clients necessários
- [ ] Implementar endpoints correspondentes
- [ ] Criar tipos locais para frontend
- [ ] Migrar componentes um por vez
- [ ] Atualizar testes

### Validação
- [ ] Executar script de validação
- [ ] Verificar build de produção
- [ ] Executar todos os testes
- [ ] Testar funcionalidades críticas
- [ ] Verificar performance

### Limpeza
- [ ] Remover serviços legados
- [ ] Limpar imports não utilizados
- [ ] Remover comentários de migração
- [ ] Padronizar formatação
- [ ] Atualizar documentação

## Métricas de Sucesso

### Técnicas
- **Zero** imports diretos do Prisma no frontend
- **Zero** instâncias `new PrismaClient()` nas APIs
- **100%** dos testes passando
- **Zero** erros de build

### Performance
- Tempo de resposta das APIs < 500ms
- Tempo de carregamento do dashboard < 2s
- Uso de memória não aumentado > 10%

### Qualidade
- Cobertura de testes mantida ou melhorada
- Zero warnings de TypeScript
- Código seguindo padrões estabelecidos

## Lições Aprendidas

### O Que Funcionou Bem
1. **Migração incremental**: Permitiu manter sistema funcionando
2. **Testes abrangentes**: Detectaram problemas cedo
3. **Padrões consistentes**: Facilitaram manutenção
4. **Validação automática**: Garantiu qualidade

### Desafios Enfrentados
1. **Dependências circulares**: Resolvidas com refatoração
2. **Tipos complexos**: Simplificados com tipos locais
3. **Performance**: Otimizada com cache e queries eficientes
4. **Testes**: Adaptados para nova arquitetura

### Recomendações
1. **Sempre fazer backup** antes de iniciar
2. **Migrar incrementalmente** para reduzir riscos
3. **Testar extensivamente** cada etapa
4. **Documentar padrões** para consistência
5. **Monitorar performance** durante migração

## Ferramentas Úteis

### Scripts de Validação
- `scripts/find-prisma-usage.js` - Identifica problemas
- `scripts/cleanup-code.js` - Limpa código
- `scripts/validate-refactoring.ts` - Valida migração

### Comandos Importantes
```bash
# Validação completa
npm run build && npm test && node scripts/find-prisma-usage.js

# Limpeza de código
node scripts/cleanup-code.js

# Verificação de tipos
npm run typecheck
```

## Próximas Migrações

Este guia pode ser adaptado para:
- Migração de outros ORMs
- Refatoração de arquitetura
- Modernização de APIs
- Separação de responsabilidades

### Template de Checklist
Use este template para futuras migrações:

```markdown
## Migração: [Nome da Migração]

### Análise
- [ ] Identificar problemas
- [ ] Categorizar por prioridade
- [ ] Estimar esforço

### Planejamento
- [ ] Definir arquitetura alvo
- [ ] Criar plano incremental
- [ ] Preparar ambiente de testes

### Execução
- [ ] Implementar nova arquitetura
- [ ] Migrar incrementalmente
- [ ] Validar cada etapa

### Finalização
- [ ] Limpeza de código
- [ ] Atualização de documentação
- [ ] Validação final
```