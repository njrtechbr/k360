# API Endpoints de Backup

Esta documentação descreve os endpoints implementados para o sistema de backup do banco de dados.

## Endpoints Disponíveis

### POST /api/backup/create
Cria um novo backup do banco de dados.

**Permissões:** ADMIN, SUPERADMIN

**Body (opcional):**
```json
{
  "options": {
    "filename": "meu-backup.sql",
    "directory": "./backups/custom",
    "includeData": true,
    "includeSchema": true,
    "compress": false
  }
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "backup": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "filename": "backup_2025-01-09_14-30-00.sql",
    "size": 1048576,
    "checksum": "abc123def456",
    "duration": 5000,
    "createdAt": "2025-01-09T14:30:00.000Z",
    "createdBy": "user-id"
  }
}
```

**Rate Limiting:** Máximo 3 backups por minuto por usuário.

### GET /api/backup/list
Lista todos os backups disponíveis com paginação e filtros.

**Permissões:** ADMIN, SUPERADMIN, SUPERVISOR

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 10, máximo: 100)
- `status` (opcional): Filtrar por status (`success`, `failed`, `in_progress`)
- `startDate` (opcional): Data de início (ISO string)
- `endDate` (opcional): Data de fim (ISO string)
- `sortBy` (opcional): Campo de ordenação (`createdAt`, `size`, `filename`)
- `sortOrder` (opcional): Ordem (`asc`, `desc`)

**Exemplo:** `/api/backup/list?page=1&limit=20&status=success&sortBy=createdAt&sortOrder=desc`

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup-id",
        "filename": "backup_2025-01-09_14-30-00.sql",
        "size": 1048576,
        "checksum": "abc123",
        "createdAt": "2025-01-09T14:30:00.000Z",
        "status": "success",
        "duration": 5000
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "status": "success",
      "sortBy": "createdAt",
      "sortOrder": "desc"
    }
  }
}
```

### GET /api/backup/download/[id]
Faz download de um arquivo de backup específico.

**Permissões:** ADMIN, SUPERADMIN, SUPERVISOR

**Parâmetros:**
- `id`: ID do backup

**Resposta:** Arquivo binário com headers apropriados para download.

**Headers de Resposta:**
- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment; filename="backup_2025-01-09_14-30-00.sql"`
- `Content-Length: 1048576`

**Recursos:**
- Validação de integridade antes do download
- Streaming para arquivos grandes (>50MB)
- Log de auditoria de downloads

### DELETE /api/backup/[id]
Exclui um backup específico.

**Permissões:** ADMIN, SUPERADMIN

**Parâmetros:**
- `id`: ID do backup

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Backup excluído com sucesso",
  "deletedBackup": {
    "id": "backup-id",
    "filename": "backup_2025-01-09_14-30-00.sql",
    "deletedAt": "2025-01-09T15:00:00.000Z",
    "deletedBy": "user-id"
  }
}
```

### GET /api/backup/[id]
Obtém informações detalhadas de um backup específico.

**Permissões:** ADMIN, SUPERADMIN, SUPERVISOR

**Parâmetros:**
- `id`: ID do backup

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "backup": {
    "id": "backup-id",
    "filename": "backup_2025-01-09_14-30-00.sql",
    "filepath": "/app/backups/files/backup_2025-01-09_14-30-00.sql",
    "size": 1048576,
    "checksum": "abc123",
    "createdAt": "2025-01-09T14:30:00.000Z",
    "createdBy": "user-id",
    "status": "success",
    "duration": 5000,
    "databaseVersion": "PostgreSQL 15.0",
    "schemaVersion": "1.0.0"
  }
}
```

### GET /api/backup/status/[id]
Obtém o status em tempo real de uma operação de backup.

**Permissões:** ADMIN, SUPERADMIN, SUPERVISOR

**Parâmetros:**
- `id`: ID do backup

**Resposta para Backup em Progresso (200):**
```json
{
  "success": true,
  "status": "in_progress",
  "progress": 75,
  "message": "Validando integridade...",
  "elapsedTime": {
    "total": 45000,
    "formatted": "0:45"
  },
  "lastUpdate": "2025-01-09T14:30:45.000Z"
}
```

**Resposta para Backup Concluído (200):**
```json
{
  "success": true,
  "status": "completed",
  "progress": 100,
  "message": "Backup concluído com sucesso",
  "backup": {
    "id": "backup-id",
    "filename": "backup_2025-01-09_14-30-00.sql",
    "size": 1048576,
    "createdAt": "2025-01-09T14:30:00.000Z",
    "duration": 5000
  }
}
```

## Códigos de Erro Comuns

### 401 - Não Autenticado
```json
{
  "error": "Não autenticado"
}
```

### 403 - Permissões Insuficientes
```json
{
  "error": "Permissões insuficientes para [operação]"
}
```

### 404 - Backup Não Encontrado
```json
{
  "error": "Backup não encontrado"
}
```

### 429 - Rate Limit Excedido
```json
{
  "error": "Muitas tentativas de backup. Tente novamente em alguns minutos.",
  "retryAfter": 60
}
```

### 500 - Erro Interno
```json
{
  "error": "Erro interno do servidor",
  "message": "Detalhes do erro (apenas em desenvolvimento)"
}
```

## Recursos de Segurança

### Controle de Acesso
- **SUPERADMIN/ADMIN:** Acesso completo (criar, listar, baixar, excluir)
- **SUPERVISOR:** Apenas visualização (listar, baixar)
- **USUARIO:** Sem acesso

### Rate Limiting
- Máximo 3 operações de backup por minuto por usuário
- Implementado em memória (resetado a cada reinicialização)

### Validação de Integridade
- Checksum MD5 calculado para cada backup
- Validação automática antes do download
- Detecção de arquivos corrompidos

### Logs de Auditoria
- Todas as operações são logadas com:
  - ID do usuário
  - Role do usuário
  - Timestamp da operação
  - Detalhes da ação realizada

## Exemplos de Uso

### Criar Backup Simples
```bash
curl -X POST http://localhost:3000/api/backup/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>"
```

### Criar Backup Comprimido
```bash
curl -X POST http://localhost:3000/api/backup/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"options": {"compress": true, "filename": "backup-comprimido.sql"}}'
```

### Listar Backups com Filtros
```bash
curl "http://localhost:3000/api/backup/list?status=success&limit=5&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <token>"
```

### Fazer Download de Backup
```bash
curl -O -J "http://localhost:3000/api/backup/download/backup-id" \
  -H "Authorization: Bearer <token>"
```

### Verificar Status de Backup
```bash
curl "http://localhost:3000/api/backup/status/backup-id" \
  -H "Authorization: Bearer <token>"
```

### Excluir Backup
```bash
curl -X DELETE "http://localhost:3000/api/backup/backup-id" \
  -H "Authorization: Bearer <token>"
```

## Notas de Implementação

1. **Progresso em Tempo Real:** O sistema mantém um mapa em memória para rastrear o progresso de operações em andamento.

2. **Streaming de Arquivos:** Arquivos maiores que 50MB são transmitidos via streaming para otimizar o uso de memória.

3. **Limpeza Automática:** Informações de progresso são automaticamente removidas após 30 segundos da conclusão.

4. **Validação Robusta:** Todos os parâmetros de entrada são validados antes do processamento.

5. **Tratamento de Erros:** Erros são capturados e retornados com mensagens apropriadas para cada contexto.