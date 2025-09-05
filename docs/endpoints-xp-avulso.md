# Documentação de Endpoints - Sistema de XP Avulso

## Visão Geral

Esta documentação técnica detalha todos os endpoints implementados para o sistema de XP avulso, incluindo exemplos de código, estruturas de dados e padrões de implementação.

## Estrutura de Arquivos

```
src/app/api/gamification/
├── xp-types/
│   ├── route.ts                    # GET, POST /xp-types
│   ├── [id]/
│   │   └── route.ts               # PUT, DELETE /xp-types/[id]
│   └── __tests__/
│       └── xp-types.test.ts       # Testes unitários
├── xp-grants/
│   ├── route.ts                   # GET, POST /xp-grants
│   ├── attendant/
│   │   └── [id]/
│   │       └── route.ts          # GET /xp-grants/attendant/[id]
│   ├── daily-stats/
│   │   └── route.ts              # GET /xp-grants/daily-stats
│   └── __tests__/
│       └── xp-grants.test.ts     # Testes unitários
```

## Endpoints de Tipos de XP

### GET /api/gamification/xp-types

**Descrição**: Lista todos os tipos de XP configurados no sistema.

**Implementação**:
```typescript
// src/app/api/gamification/xp-types/route.ts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Verificação de autenticação e autorização
  if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  const types = await XpAvulsoService.findAllXpTypes(activeOnly);
  return NextResponse.json({ success: true, data: types });
}
```

**Query Parameters**:
- `active` (boolean): Filtrar apenas tipos ativos

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm123abc",
      "name": "Excelência no Atendimento",
      "description": "Reconhecimento por atendimento excepcional",
      "points": 10,
      "active": true,
      "category": "atendimento",
      "icon": "star",
      "color": "#FFD700",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "createdBy": "user123",
      "creator": {
        "name": "Admin User"
      }
    }
  ]
}
```

### POST /api/gamification/xp-types

**Descrição**: Cria um novo tipo de XP no sistema.

**Validação Zod**:
```typescript
const createXpTypeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
  points: z.number().int().min(1, "Pontos devem ser positivos").max(100, "Máximo 100 pontos"),
  category: z.string().min(1, "Categoria é obrigatória").max(50, "Categoria muito longa"),
  icon: z.string().min(1, "Ícone é obrigatório").max(50, "Ícone muito longo"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve ser um hexadecimal válido")
});
```

**Request Body**:
```json
{
  "name": "Inovação",
  "description": "Reconhecimento por ideias inovadoras",
  "points": 12,
  "category": "criatividade",
  "icon": "lightbulb",
  "color": "#FFA500"
}
```

**Implementação**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createXpTypeSchema.parse(body);

    const newType = await XpAvulsoService.createXpType({
      ...validatedData,
      createdBy: session.user.id
    });

    return NextResponse.json({ success: true, data: newType }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
```

### PUT /api/gamification/xp-types/[id]

**Descrição**: Atualiza um tipo de XP existente.

**Implementação**:
```typescript
// src/app/api/gamification/xp-types/[id]/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validatedData = updateXpTypeSchema.parse(body);

  const updatedType = await XpAvulsoService.updateXpType(params.id, validatedData);
  return NextResponse.json({ success: true, data: updatedType });
}
```

### DELETE /api/gamification/xp-types/[id]

**Descrição**: Desativa um tipo de XP (soft delete).

**Implementação**:
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await XpAvulsoService.toggleXpTypeStatus(params.id);
  return NextResponse.json({ 
    success: true, 
    message: 'Tipo de XP desativado com sucesso' 
  });
}
```

## Endpoints de Concessão de XP

### POST /api/gamification/xp-grants

**Descrição**: Concede XP avulso para um atendente específico.

**Validação Zod**:
```typescript
const grantXpSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
  typeId: z.string().min(1, "ID do tipo é obrigatório"),
  justification: z.string().max(500, "Justificativa muito longa").optional()
});
```

**Implementação Completa**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = grantXpSchema.parse(body);

    // Validações de negócio
    const activeSeason = await prisma.gamificationSeason.findFirst({
      where: { active: true }
    });

    if (!activeSeason) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível conceder XP',
        reason: 'Nenhuma temporada ativa encontrada'
      }, { status: 422 });
    }

    // Verificar limites diários
    await XpAvulsoService.validateGrantLimits(session.user.id, 0);

    // Conceder XP
    const grant = await XpAvulsoService.grantXp({
      ...validatedData,
      grantedBy: session.user.id
    });

    return NextResponse.json({ success: true, data: grant }, { status: 201 });
  } catch (error) {
    // Tratamento de erros específicos
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      }, { status: 400 });
    }

    if (error.message.includes('Limite diário')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 429 });
    }

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
```

**Response de Sucesso**:
```json
{
  "success": true,
  "data": {
    "id": "grant789",
    "attendantId": "attendant123",
    "typeId": "xptype456",
    "points": 10,
    "justification": "Atendimento excepcional ao cliente X",
    "grantedBy": "admin123",
    "grantedAt": "2024-01-01T00:00:00.000Z",
    "xpEventId": "event456",
    "attendant": {
      "name": "João Silva",
      "totalXp": 150
    },
    "type": {
      "name": "Excelência no Atendimento",
      "points": 10,
      "color": "#FFD700"
    },
    "achievementsUnlocked": [
      {
        "id": "achievement123",
        "title": "Primeira Impressão",
        "description": "Receba sua primeira avaliação"
      }
    ]
  }
}
```

### GET /api/gamification/xp-grants

**Descrição**: Lista histórico de concessões com filtros avançados.

**Query Parameters**:
```typescript
interface GrantHistoryFilters {
  attendantId?: string;
  typeId?: string;
  granterId?: string;
  startDate?: string; // ISO 8601
  endDate?: string;   // ISO 8601
  page?: number;      // Default: 1
  limit?: number;     // Default: 20, Max: 100
}
```

**Implementação**:
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !['SUPERVISOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  const filters: GrantHistoryFilters = {
    attendantId: searchParams.get('attendantId') || undefined,
    typeId: searchParams.get('typeId') || undefined,
    granterId: searchParams.get('granterId') || undefined,
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  };

  const result = await XpAvulsoService.findGrantHistory(filters);
  return NextResponse.json({ success: true, data: result });
}
```

### GET /api/gamification/xp-grants/attendant/[id]

**Descrição**: Lista concessões específicas de um atendente.

**Implementação**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  // Verificar se é o próprio atendente ou tem permissão administrativa
  const hasPermission = session?.user && (
    ['SUPERVISOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.role) ||
    session.user.attendantId === params.id
  );

  if (!hasPermission) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  const grants = await XpAvulsoService.findGrantsByAttendant(params.id, { page, limit });
  return NextResponse.json({ success: true, data: grants });
}
```

### GET /api/gamification/xp-grants/daily-stats

**Descrição**: Estatísticas diárias de uso do sistema.

**Implementação**:
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !['SUPERVISOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  const stats = await XpAvulsoService.getDailyStats(days);
  return NextResponse.json({ success: true, data: stats });
}
```

## Padrões de Implementação

### Middleware de Autenticação

Todos os endpoints seguem o padrão de verificação de sessão:

```typescript
const session = await getServerSession(authOptions);

if (!session?.user) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}

if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
  return NextResponse.json({ 
    error: 'Insufficient permissions',
    required: 'ADMIN'
  }, { status: 403 });
}
```

### Validação de Dados

Uso consistente do Zod para validação:

```typescript
try {
  const validatedData = schema.parse(body);
  // Processar dados validados
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: 'Dados inválidos',
      details: error.errors
    }, { status: 400 });
  }
}
```

### Tratamento de Erros

Padrão consistente de tratamento de erros:

```typescript
try {
  // Lógica do endpoint
} catch (error) {
  console.error('Erro no endpoint:', error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: 'Dados inválidos',
      details: error.errors
    }, { status: 400 });
  }
  
  if (error.message.includes('não encontrado')) {
    return NextResponse.json({
      success: false,
      error: 'Recurso não encontrado'
    }, { status: 404 });
  }
  
  return NextResponse.json({
    success: false,
    error: 'Erro interno do servidor'
  }, { status: 500 });
}
```

### Rate Limiting

Implementação de limites por endpoint:

```typescript
// Configuração em middleware
const rateLimits = {
  '/api/gamification/xp-grants': { requests: 10, window: 60000 }, // 10 req/min
  '/api/gamification/xp-types': { requests: 5, window: 60000 },   // 5 req/min
  default: { requests: 30, window: 60000 } // 30 req/min
};
```

## Testes Unitários

### Estrutura de Testes

```typescript
// __tests__/xp-grants.test.ts
describe('/api/gamification/xp-grants', () => {
  beforeEach(async () => {
    // Setup de dados de teste
    await setupTestData();
  });

  afterEach(async () => {
    // Limpeza após cada teste
    await cleanupTestData();
  });

  describe('POST /api/gamification/xp-grants', () => {
    it('should grant XP successfully with valid data', async () => {
      const grantData = {
        attendantId: 'test-attendant',
        typeId: 'test-type',
        justification: 'Test justification'
      };

      const response = await POST(createMockRequest(grantData));
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data.points).toBe(10);
    });

    it('should reject invalid attendant ID', async () => {
      const grantData = {
        attendantId: 'invalid-id',
        typeId: 'test-type'
      };

      const response = await POST(createMockRequest(grantData));
      expect(response.status).toBe(404);
    });
  });
});
```

### Cobertura de Testes

- ✅ Autenticação e autorização
- ✅ Validação de dados de entrada
- ✅ Lógica de negócio
- ✅ Tratamento de erros
- ✅ Integração com serviços
- ✅ Rate limiting
- ✅ Casos extremos

## Monitoramento e Logs

### Logs de Auditoria

Todos os endpoints críticos geram logs:

```typescript
console.log(`XP Grant: ${session.user.name} granted ${points}XP to ${attendant.name} (${type.name})`);
```

### Métricas de Performance

- Tempo de resposta por endpoint
- Taxa de erro por endpoint
- Uso por usuário/role
- Distribuição de tipos de XP concedidos

### Alertas Configurados

- Concessões suspeitas (muito XP em pouco tempo)
- Falhas de autenticação repetidas
- Erros de servidor acima do limite
- Uso excessivo de API por usuário