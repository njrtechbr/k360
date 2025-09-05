# Exemplos de Uso da API de XP Avulso

## POST /api/gamification/xp-grants

### Conceder XP Avulso

**Request:**
```bash
curl -X POST http://localhost:3000/api/gamification/xp-grants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "attendantId": "clx123456789",
    "typeId": "clx987654321",
    "justification": "Excelente atendimento ao cliente durante situação complexa"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "XP avulso concedido com sucesso",
  "data": {
    "id": "clx111222333",
    "attendant": {
      "id": "clx123456789",
      "name": "João Silva"
    },
    "type": {
      "id": "clx987654321",
      "name": "Excelência no Atendimento",
      "points": 50
    },
    "points": 50,
    "justification": "Excelente atendimento ao cliente durante situação complexa",
    "grantedAt": "2024-01-15T10:30:00.000Z",
    "granter": {
      "id": "clx555666777",
      "name": "Maria Admin"
    }
  }
}
```

**Erros Possíveis:**

- **400 - Dados Inválidos:**
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "attendantId",
      "message": "Atendente é obrigatório"
    }
  ]
}
```

- **400 - Regras de Negócio:**
```json
{
  "error": "Não há temporada ativa para conceder XP"
}
```

- **401 - Não Autorizado:**
```json
{
  "error": "Não autorizado. Faça login para continuar."
}
```

- **403 - Acesso Negado:**
```json
{
  "error": "Acesso negado. Roles permitidos: ADMIN, SUPERADMIN"
}
```

- **429 - Rate Limit:**
```json
{
  "error": "Muitas tentativas de concessão. Tente novamente em alguns instantes.",
  "retryAfter": 45
}
```

## GET /api/gamification/xp-grants

### Buscar Histórico de Concessões

**Request:**
```bash
curl -X GET "http://localhost:3000/api/gamification/xp-grants?page=1&limit=20&attendantId=clx123456789" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "grants": [
      {
        "id": "clx111222333",
        "attendant": {
          "id": "clx123456789",
          "name": "João Silva"
        },
        "type": {
          "id": "clx987654321",
          "name": "Excelência no Atendimento",
          "category": "performance",
          "icon": "star",
          "color": "#FFD700"
        },
        "points": 50,
        "justification": "Excelente atendimento ao cliente",
        "grantedAt": "2024-01-15T10:30:00.000Z",
        "granter": {
          "id": "clx555666777",
          "name": "Maria Admin",
          "role": "ADMIN"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### Parâmetros de Filtro Disponíveis:

- `page` (number): Página atual (padrão: 1)
- `limit` (number): Itens por página (padrão: 20, máximo: 100)
- `attendantId` (string): Filtrar por atendente específico
- `typeId` (string): Filtrar por tipo de XP específico
- `granterId` (string): Filtrar por administrador que concedeu
- `startDate` (string): Data inicial (ISO 8601)
- `endDate` (string): Data final (ISO 8601)
- `minPoints` (number): Pontos mínimos
- `maxPoints` (number): Pontos máximos

**Exemplo com Filtros:**
```bash
curl -X GET "http://localhost:3000/api/gamification/xp-grants?startDate=2024-01-01&endDate=2024-01-31&minPoints=50&typeId=clx987654321" \
  -H "Authorization: Bearer <token>"
```

## Logs de Auditoria

Todas as concessões de XP avulso são registradas nos logs de auditoria com as seguintes informações:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "XP_GRANT_CREATED",
  "userId": "clx555666777",
  "details": {
    "grantId": "clx111222333",
    "attendantId": "clx123456789",
    "typeId": "clx987654321",
    "points": 50,
    "justification": "Excelente atendimento ao cliente"
  },
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

## Rate Limiting

### Limites Aplicados:

- **Concessões (POST):** 10 requests por minuto por IP
- **Consultas (GET):** 30 requests por minuto por IP

### Headers de Rate Limiting:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1705312200
```

## Validações de Segurança

### Limites Diários por Administrador:

- **Máximo de concessões:** 50 por dia
- **Máximo de pontos:** 1000 por dia

### Verificações Automáticas:

1. Temporada ativa obrigatória
2. Atendente deve existir e estar ativo
3. Tipo de XP deve existir e estar ativo
4. Administrador deve ter permissão (ADMIN ou SUPERADMIN)
5. Limites diários não podem ser excedidos

## Integração com Sistema de Gamificação

### Efeitos Automáticos da Concessão:

1. **XpEvent criado** automaticamente
2. **XP total do atendente** atualizado na temporada atual
3. **Multiplicadores sazonais** aplicados se ativos
4. **Conquistas verificadas** automaticamente
5. **Rankings atualizados** em tempo real

### Exemplo de XpEvent Gerado:

```json
{
  "id": "clx444555666",
  "attendantId": "clx123456789",
  "points": 50,
  "basePoints": 50,
  "multiplier": 1.0,
  "reason": "XP Avulso: Excelência no Atendimento - Excelente atendimento ao cliente",
  "type": "manual_grant",
  "relatedId": "clx987654321",
  "seasonId": "clx777888999",
  "date": "2024-01-15T10:30:00.000Z"
}
```
#
# GET /api/gamification/xp-grants/attendant/{id}

### Buscar Concessões de um Atendente Específico

**Request:**
```bash
curl -X GET "http://localhost:3000/api/gamification/xp-grants/attendant/clx123456789" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attendant": {
      "id": "clx123456789",
      "name": "João Silva"
    },
    "summary": {
      "totalGrants": 15,
      "totalPoints": 750,
      "averagePoints": 50
    },
    "grantsByType": [
      {
        "type": {
          "id": "clx987654321",
          "name": "Excelência no Atendimento",
          "category": "performance",
          "icon": "star",
          "color": "#FFD700"
        },
        "count": 8,
        "totalPoints": 400,
        "grants": [
          {
            "id": "clx111222333",
            "points": 50,
            "justification": "Atendimento excepcional",
            "grantedAt": "2024-01-15T10:30:00.000Z",
            "granter": {
              "id": "clx555666777",
              "name": "Maria Admin",
              "role": "ADMIN"
            }
          }
        ]
      }
    ],
    "recentGrants": [
      {
        "id": "clx111222333",
        "type": {
          "id": "clx987654321",
          "name": "Excelência no Atendimento",
          "category": "performance",
          "icon": "star",
          "color": "#FFD700"
        },
        "points": 50,
        "justification": "Atendimento excepcional",
        "grantedAt": "2024-01-15T10:30:00.000Z",
        "granter": {
          "id": "clx555666777",
          "name": "Maria Admin",
          "role": "ADMIN"
        }
      }
    ],
    "grants": [
      {
        "id": "clx111222333",
        "type": {
          "id": "clx987654321",
          "name": "Excelência no Atendimento",
          "category": "performance",
          "icon": "star",
          "color": "#FFD700"
        },
        "points": 50,
        "justification": "Atendimento excepcional",
        "grantedAt": "2024-01-15T10:30:00.000Z",
        "granter": {
          "id": "clx555666777",
          "name": "Maria Admin",
          "role": "ADMIN"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### Parâmetros de Query Disponíveis:

- `page` (number): Página atual (padrão: 1)
- `limit` (number): Itens por página (padrão: 50, máximo: 200)
- `includeAll` (boolean): Se true, retorna todas as concessões sem paginação

**Exemplo com Paginação:**
```bash
curl -X GET "http://localhost:3000/api/gamification/xp-grants/attendant/clx123456789?page=2&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Exemplo sem Paginação (todas as concessões):**
```bash
curl -X GET "http://localhost:3000/api/gamification/xp-grants/attendant/clx123456789?includeAll=true" \
  -H "Authorization: Bearer <token>"
```

## GET /api/gamification/xp-grants/statistics

### Obter Estatísticas de Concessões

**Request:**
```bash
curl -X GET "http://localhost:3000/api/gamification/xp-grants/statistics?period=30d" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "value": "30d",
      "days": 30,
      "label": "Últimos 30 dias"
    },
    "overview": {
      "totalGrants": 125,
      "totalPoints": 6250,
      "averagePoints": 50,
      "dailyAverageGrants": 4.17,
      "dailyAveragePoints": 208
    },
    "grantsByType": [
      {
        "typeId": "clx987654321",
        "typeName": "Excelência no Atendimento",
        "count": 45,
        "totalPoints": 2250,
        "averagePoints": 50,
        "percentage": 36
      }
    ],
    "grantsByGranter": [
      {
        "granterId": "clx555666777",
        "granterName": "Maria Admin",
        "count": 30,
        "totalPoints": 1500,
        "averagePoints": 50,
        "percentage": 24
      }
    ],
    "trends": {
      "mostUsedType": "Excelência no Atendimento",
      "mostActiveGranter": "Maria Admin",
      "averageGrantsPerGranter": 25
    }
  }
}
```

### Parâmetros Disponíveis:

- `period` (string): Período para estatísticas (7d, 30d, 90d) - padrão: 30d

**Períodos Válidos:**
- `7d`: Últimos 7 dias
- `30d`: Últimos 30 dias  
- `90d`: Últimos 90 dias

## Resumo dos Endpoints Implementados

### ✅ Funcionalidades Completas:

1. **POST /api/gamification/xp-grants**
   - Concessão de XP avulso
   - Validação completa de dados
   - Integração com sistema de gamificação
   - Logs de auditoria
   - Rate limiting

2. **GET /api/gamification/xp-grants**
   - Histórico com filtros avançados
   - Paginação e ordenação
   - Múltiplos critérios de filtro
   - Rate limiting

3. **GET /api/gamification/xp-grants/attendant/{id}**
   - Concessões por atendente
   - Estatísticas individuais
   - Agrupamento por tipo
   - Paginação opcional
   - Concessões recentes

4. **GET /api/gamification/xp-grants/statistics**
   - Estatísticas agregadas
   - Múltiplos períodos
   - Métricas calculadas
   - Tendências e insights

### 🔒 Segurança Implementada:

- Autenticação obrigatória
- Controle de acesso por roles
- Rate limiting diferenciado
- Validação de dados
- Logs de auditoria
- Limites de concessão

### 📊 Integração com Gamificação:

- Criação automática de XpEvent
- Atualização de XP total
- Verificação de conquistas
- Aplicação de multiplicadores
- Atualização de rankings