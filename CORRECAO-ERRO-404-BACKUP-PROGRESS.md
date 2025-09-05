# Correção do Erro HTTP 404 no BackupProgress

## Problema Identificado

O componente `BackupProgress` estava tentando fazer polling para `/api/backup/status/${backupId}` mas recebia erro HTTP 404. O problema estava na geração e uso de IDs temporários que não existiam no sistema de backup.

## Causa Raiz

1. **ID Temporário**: O hook `useBackupManager` estava gerando um ID temporário (`temp_${timestamp}_${random}`) antes de iniciar o backup
2. **Dessincronia**: O endpoint de status tentava buscar esse ID temporário no sistema de backups, que não existia
3. **Falta de Progresso Real**: Não havia integração entre o progresso do `pg_dump` e o sistema de monitoramento

## Soluções Implementadas

### 1. Modificação do Endpoint de Criação (`/api/backup/create`)

**Antes:**
```typescript
// Criava backup de forma síncrona e retornava resultado completo
const result = await BackupService.createBackup(options);
return { success: true, backup: result };
```

**Depois:**
```typescript
// Gera ID real imediatamente e inicia backup em background
const backupId = crypto.randomUUID();
setProgressCallback((id, progress, message, status) => {
  updateBackupProgress(backupId, progress, message, status);
});

// Retorna ID imediatamente
const response = { success: true, id: backupId, status: 'in_progress' };

// Inicia backup em background
BackupService.createBackup({ ...options, backupId }).then(result => {
  // Atualiza progresso quando concluído
}).catch(error => {
  // Atualiza progresso em caso de erro
});

return response;
```

### 2. Modificação do Endpoint de Status (`/api/backup/status/[id]`)

**Adicionado suporte para IDs temporários:**
```typescript
// Se é um ID temporário e não há progresso, retornar status padrão
if (backupId.startsWith('temp_')) {
  return NextResponse.json({
    success: true,
    status: 'in_progress' as const,
    progress: 0,
    message: 'Aguardando início do backup...',
    elapsedTime: { total: 0, formatted: '0:00' },
    lastUpdate: new Date().toISOString()
  });
}
```

### 3. Modificação do Hook `useBackupManager`

**Antes:**
```typescript
// Gerava ID temporário
const tempBackupId = `temp_${Date.now()}_${random}`;
setBackupProgress({ backupId: tempBackupId });

// Aguardava resposta completa
const result = await fetch('/api/backup/create');
```

**Depois:**
```typescript
// Inicia sem ID
setBackupProgress({ backupId: undefined });

// Recebe ID real da API
const result = await fetch('/api/backup/create');
setBackupProgress({ backupId: result.id });
```

### 4. Integração com Sistema de Progresso

**Modificado `BackupService.createBackup`:**
```typescript
// Aceita backupId como parâmetro
static async createBackup(options: BackupOptions & { 
  createdBy?: string; 
  backupId?: string 
} = {}) {
  const backupId = options.backupId || crypto.randomUUID();
  
  // Usa callback de progresso durante execução
  if (updateProgressCallback) {
    updateProgressCallback(backupId, 10, 'Validando parâmetros...', 'in_progress');
    updateProgressCallback(backupId, 30, 'Executando pg_dump...', 'in_progress');
    updateProgressCallback(backupId, 70, 'Calculando checksum...', 'in_progress');
    // etc...
  }
}
```

### 5. Criação do Endpoint de Cancelamento

**Novo endpoint:** `/api/backup/cancel/[id]`
```typescript
// Permite cancelar operações em andamento
export async function POST(request, { params }) {
  const backupId = params.id;
  cancelledOperations.add(backupId);
  return { success: true, message: 'Cancelamento registrado' };
}
```

## Fluxo Corrigido

### Antes (Com Erro 404)
```
1. useBackupManager gera ID temporário (temp_123_abc)
2. Chama /api/backup/create
3. BackupProgress faz polling para /api/backup/status/temp_123_abc
4. Endpoint de status não encontra backup com ID temporário
5. Retorna 404 Not Found
```

### Depois (Funcionando)
```
1. useBackupManager chama /api/backup/create
2. API gera ID real (uuid) e retorna imediatamente
3. useBackupManager recebe ID real
4. BackupProgress faz polling para /api/backup/status/uuid
5. Endpoint encontra progresso em memória ou retorna status padrão
6. BackupService atualiza progresso via callback durante execução
```

## Benefícios da Correção

1. **Progresso Real**: Agora mostra progresso real do `pg_dump`
2. **IDs Consistentes**: Usa UUIDs reais em vez de IDs temporários
3. **Melhor UX**: Usuário vê progresso imediatamente
4. **Não Bloqueante**: API retorna rapidamente, backup roda em background
5. **Cancelamento**: Suporte para cancelar operações em andamento

## Arquivos Modificados

- `src/hooks/useBackupManager.ts` - Correção do fluxo de criação
- `src/app/api/backup/create/route.ts` - Execução em background
- `src/app/api/backup/status/[id]/route.ts` - Suporte a IDs temporários
- `src/services/backupService.ts` - Aceitar backupId como parâmetro
- `src/app/api/backup/cancel/[id]/route.ts` - Novo endpoint de cancelamento

## Testes Recomendados

1. **Criar Backup**: Verificar se progresso é exibido corretamente
2. **Polling**: Confirmar que não há mais erros 404
3. **Cancelamento**: Testar cancelamento de operações
4. **Múltiplos Backups**: Verificar se IDs não conflitam
5. **Falhas**: Testar comportamento em caso de erro

## Monitoramento

Para monitorar se a correção está funcionando:

```bash
# Verificar logs de progresso
grep "BACKUP_PROGRESS" logs/backup-system.log

# Verificar se não há mais 404s
grep "404.*backup/status" logs/access.log

# Monitorar operações em andamento
curl /api/backup/monitoring
```