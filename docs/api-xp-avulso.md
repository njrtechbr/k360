# API Documentation - Sistema de XP Avulso

## Visão Geral

Esta documentação descreve os endpoints da API para o sistema de XP avulso, que permite gerenciar tipos de XP e conceder pontos extras aos atendentes.

## Autenticação

Todos os endpoints requerem autenticação via NextAuth.js. As permissões são baseadas em roles:

- **SUPERADMIN**: Acesso total
- **ADMIN**: Gerenciamento completo de XP avulso
- **SUPERVISOR**: Apenas leitura de histórico
- **USUARIO**: Sem acesso

## Endpoints de Tipos de XP

### GET /api/gamification/xp-types

Lista todos os tipos de XP configurados.

**Permissões**: ADMIN, SUPERADMIN

**Query Parameters**:
- `active` (boolean, opcional): Filtrar apenas tipos ativos

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid123",
      "name": "Excelência no Atendimento",
      "description": "Reconhecimento por atendimento excepcional ao cliente",
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

Cria um novo tipo de XP.

**Permissões**: ADMIN, SUPERADMIN

**Request Body**:
```json
{
  "name": "Novo Tipo de XP",
  "description": "Descrição detalhada do critério",
  "points": 8,
  "category": "categoria",
  "icon": "icon-name",
  "color": "#FF6B35"
}
```

**Validações**:
- `name`: String única, 1-100 caracteres
- `description`: String, 1-500 caracteres
- `points`: Número inteiro, 1-100
- `category`: String, 1-50 caracteres
- `icon`: String, 1-50 caracteres
- `color`: String, formato hexadecimal válido

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cuid456",
    "name": "Novo Tipo de XP",
    "description": "Descrição detalhada do critério",
    "points": 8,
    "active": true,
    "category": "categoria",
    "icon": "icon-name",
    "color": "#FF6B35",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "createdBy": "user123"
  }
}
```

### PUT /api/gamification/xp-types/[id]

Atualiza um tipo de XP existente.

**Permissões**: ADMIN, SUPERADMIN

**Request Body**: Mesma estrutura do POST (todos os campos opcionais)

**Response**: Mesma estrutura do POST

### DELETE /api/gamification/xp-types/[id]

Desativa um tipo de XP (soft delete).

**Permissões**: ADMIN, SUPERADMIN

**Response**:
```json
{
  "success": true,
  "message": "Tipo de XP desativado com sucesso"
}
```

## Endpoints de Concessão de XP

### POST /api/gamification/xp-grants

Concede XP avulso para um atendente.

**Permissões**: ADMIN, SUPERADMIN

**Request Body**:
```json
{
  "attendantId": "attendant123",
  "typeId": "xptype456",
  "justification": "Atendimento excepcional ao cliente X"
}
```

**Validações**:
- `attendantId`: ID válido de atendente ativo
- `typeId`: ID válido de tipo de XP ativo
- `justification`: String opcional, máximo 500 caracteres
- Temporada ativa deve existir

**Response**:
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
      "points": 10
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

Lista histórico de concessões de XP.

**Permissões**: SUPERVISOR, ADMIN, SUPERADMIN

**Query Parameters**:
- `attendantId` (string, opcional): Filtrar por atendente
- `typeId` (string, opcional): Filtrar por tipo de XP
- `granterId` (string, opcional): Filtrar por quem concedeu
- `startDate` (string, opcional): Data inicial (ISO 8601)
- `endDate` (string, opcional): Data final (ISO 8601)
- `page` (number, opcional): Página (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 20, máximo: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "grants": [
      {
        "id": "grant789",
        "attendantId": "attendant123",
        "typeId": "xptype456",
        "points": 10,
        "justification": "Atendimento excepcional ao cliente X",
        "grantedBy": "admin123",
        "grantedAt": "2024-01-01T00:00:00.000Z",
        "attendant": {
          "name": "João Silva"
        },
        "type": {
          "name": "Excelência no Atendimento",
          "category": "atendimento",
          "color": "#FFD700"
        },
        "granter": {
          "name": "Admin User"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### GET /api/gamification/xp-grants/attendant/[id]

Lista concessões de XP para um atendente específico.

**Permissões**: SUPERVISOR, ADMIN, SUPERADMIN (ou próprio atendente se autenticado)

**Query Parameters**:
- `page` (number, opcional): Página (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 10)

**Response**: Mesma estrutura do GET /xp-grants, mas filtrado por atendente

### GET /api/gamification/xp-grants/daily-stats

Estatísticas diárias de concessões com métricas detalhadas.

**Permissões**: SUPERVISOR, ADMIN, SUPERADMIN

**Query Parameters**:
- `days` (number, opcional): Número de dias para análise (padrão: 30, máximo: 365)

**Response**:
```json
{
  "success": true,
  "data": {
    "dailyStats": [
      {
        "date": "2024-01-01",
        "totalGrants": 5,
        "totalPoints": 45,
        "uniqueAttendants": 3,
        "uniqueGranters": 2,
        "topType": "Excelência no Atendimento",
        "averagePointsPerGrant": 9.0,
        "typeDistribution": {
          "Excelência no Atendimento": 3,
          "Iniciativa": 2
        }
      }
    ],
    "summary": {
      "totalGrants": 150,
      "totalPoints": 1250,
      "averagePerDay": 5.0,
      "mostActiveGranter": "Admin User",
      "topType": "Excelência no Atendimento",
      "peakDay": "2024-01-15",
      "peakDayGrants": 12,
      "uniqueAttendantsTotal": 45,
      "uniqueGrantersTotal": 3,
      "averagePointsPerGrant": 8.3
    },
    "trends": {
      "grantsGrowth": "+15%",
      "pointsGrowth": "+12%",
      "attendantsGrowth": "+8%"
    }
  }
}
```

### GET /api/gamification/xp-grants/statistics

Estatísticas gerais do sistema de XP avulso.

**Permissões**: SUPERVISOR, ADMIN, SUPERADMIN

**Query Parameters**:
- `period` (string, opcional): Período de análise ('week', 'month', 'quarter', 'year')
- `groupBy` (string, opcional): Agrupamento ('type', 'granter', 'attendant')

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalGrants": 1250,
      "totalPoints": 12500,
      "activeTypes": 8,
      "activeGranters": 5,
      "beneficiaryAttendants": 120
    },
    "byType": [
      {
        "typeId": "type123",
        "typeName": "Excelência no Atendimento",
        "totalGrants": 450,
        "totalPoints": 4500,
        "percentage": 36.0,
        "averagePerGrant": 10.0
      }
    ],
    "byGranter": [
      {
        "granterId": "user123",
        "granterName": "Admin Principal",
        "totalGrants": 300,
        "totalPoints": 2800,
        "averagePerGrant": 9.3,
        "favoriteType": "Excelência no Atendimento"
      }
    ],
    "timeline": [
      {
        "period": "2024-01",
        "grants": 85,
        "points": 750,
        "uniqueAttendants": 25
      }
    ]
  }
}
```

## Códigos de Erro

### 400 - Bad Request
```json
{
  "success": false,
  "error": "Dados inválidos",
  "details": {
    "field": "points",
    "message": "Pontos devem ser entre 1 e 100"
  }
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "error": "Não autenticado"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "error": "Permissão insuficiente",
  "required": "ADMIN"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "Recurso não encontrado"
}
```

### 409 - Conflict
```json
{
  "success": false,
  "error": "Nome do tipo de XP já existe"
}
```

### 422 - Unprocessable Entity
```json
{
  "success": false,
  "error": "Não é possível conceder XP",
  "reason": "Nenhuma temporada ativa encontrada"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Erro interno do servidor"
}
```

## Rate Limiting

- **Concessão de XP**: Máximo 10 concessões por minuto por usuário
- **Criação de tipos**: Máximo 5 criações por minuto por usuário
- **Consultas gerais**: Máximo 100 requests por minuto por usuário
- **Estatísticas**: Máximo 20 requests por minuto por usuário
- **Exportações**: Máximo 5 exportações por minuto por usuário

## Limites de Segurança

### Limites Diários por Administrador
- **50 concessões** máximo por dia
- **1000 pontos** máximo por dia
- **Alertas automáticos** quando próximo dos limites
- **Bloqueio temporário** em caso de abuso

### Validações de Integridade
- Verificação de temporada ativa obrigatória
- Validação de atendente ativo e existente
- Confirmação de tipo de XP ativo
- Auditoria completa de todas as ações

## Webhooks (Futuro)

Planejado para versões futuras:

### POST /api/webhooks/xp-granted
Notificação quando XP é concedido.

### POST /api/webhooks/achievement-unlocked
Notificação quando conquista é desbloqueada via XP avulso.

## Exemplos de Uso

### Conceder XP via cURL

```bash
curl -X POST "https://api.exemplo.com/api/gamification/xp-grants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "attendantId": "attendant123",
    "typeId": "xptype456",
    "justification": "Resolveu problema complexo do cliente"
  }'
```

### Listar histórico com filtros

```bash
curl "https://api.exemplo.com/api/gamification/xp-grants?attendantId=attendant123&startDate=2024-01-01&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Criar novo tipo de XP

```bash
curl -X POST "https://api.exemplo.com/api/gamification/xp-types" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Inovação",
    "description": "Reconhecimento por ideias inovadoras",
    "points": 12,
    "category": "criatividade",
    "icon": "lightbulb",
    "color": "#FFA500"
  }'
```

## Versionamento

- **Versão atual**: v1
- **Base URL**: `/api/gamification/`
- **Compatibilidade**: Mantida por pelo menos 6 meses após nova versão

## Changelog da API

### v1.2.0 (2024-12-01)
- **Novo endpoint**: `/api/gamification/xp-grants/statistics` para estatísticas gerais
- **Melhorias**: Endpoint de daily-stats com métricas expandidas
- **Segurança**: Limites diários por administrador implementados
- **Performance**: Otimização de queries para relatórios
- **Validações**: Controles de integridade aprimorados

### v1.1.0 (2024-11-01)
- **Novo endpoint**: `/api/gamification/xp-grants/daily-stats` para métricas diárias
- **Filtros avançados**: Múltiplos filtros no histórico de concessões
- **Exportação**: Suporte a CSV nos endpoints de consulta
- **Rate limiting**: Limites específicos por tipo de operação
- **Auditoria**: Logs expandidos com mais detalhes

### v1.0.0 (2024-01-01)
- Implementação inicial
- Endpoints de tipos de XP (CRUD completo)
- Endpoints de concessão de XP
- Sistema de auditoria básico
- Rate limiting básico
- Autenticação e autorização por roles