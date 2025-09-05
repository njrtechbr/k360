# BackupStorage

A classe `BackupStorage` é responsável pelo gerenciamento de metadados de backups do sistema. Ela fornece uma interface completa para operações CRUD, limpeza automática e validação de integridade dos registros de backup.

## Funcionalidades Principais

### 1. Gerenciamento de Metadados
- ✅ Adicionar novos backups ao registry
- ✅ Atualizar metadados de backups existentes
- ✅ Remover backups do registry
- ✅ Buscar backups por ID
- ✅ Listar backups com filtros e paginação

### 2. Busca e Filtros
- ✅ Filtrar por status (success, failed, in_progress)
- ✅ Filtrar por intervalo de datas
- ✅ Buscar por nome de arquivo ou criador
- ✅ Paginação com limit e offset
- ✅ Ordenação por data de criação

### 3. Limpeza Automática
- ✅ Remover backups antigos baseado em dias de retenção
- ✅ Remover backups excedentes baseado em limite máximo
- ✅ Remover backups falhados ou corrompidos
- ✅ Limpeza completa combinando todas as estratégias

### 4. Estatísticas e Monitoramento
- ✅ Calcular estatísticas gerais (total, sucessos, falhas)
- ✅ Calcular tamanho total ocupado
- ✅ Identificar backup mais antigo e mais recente
- ✅ Verificar necessidade de limpeza automática

### 5. Validação e Integridade
- ✅ Validar integridade do registry
- ✅ Detectar e corrigir entradas órfãs
- ✅ Verificar existência de arquivos físicos
- ✅ Reparar automaticamente inconsistências

## Estrutura do Registry

O sistema utiliza um arquivo `registry.json` para armazenar metadados:

```json
{
  "backups": [
    {
      "id": "backup-1641234567890",
      "filename": "backup_2025-01-09_14-30-00.sql",
      "filepath": "./backups/files/backup_2025-01-09_14-30-00.sql",
      "size": 5242880,
      "checksum": "sha256:abc123def456...",
      "createdAt": "2025-01-09T14:30:00.000Z",
      "createdBy": "admin@example.com",
      "status": "success",
      "duration": 30000,
      "databaseVersion": "15.0",
      "schemaVersion": "1.0"
    }
  ],
  "lastCleanup": "2025-01-09T10:00:00.000Z",
  "settings": {
    "maxBackups": 50,
    "retentionDays": 30,
    "defaultDirectory": "./backups"
  }
}
```

## Configuração via Variáveis de Ambiente

```env
BACKUP_DIRECTORY=./backups          # Diretório base para backups
BACKUP_RETENTION_DAYS=30           # Dias para manter backups
BACKUP_MAX_BACKUPS=50              # Número máximo de backups
```

## Exemplos de Uso

### Inicialização
```typescript
import { BackupStorage } from '@/services/backupStorage';

// Inicializar sistema (cria diretórios e registry se necessário)
await BackupStorage.initialize();
```

### Adicionar Backup
```typescript
const metadata: BackupMetadata = {
  id: 'backup-123',
  filename: 'backup_2025-01-09.sql',
  filepath: './backups/files/backup_2025-01-09.sql',
  size: 1024000,
  checksum: 'sha256:...',
  createdAt: new Date(),
  status: 'success',
  duration: 30000,
  databaseVersion: '15.0',
  schemaVersion: '1.0'
};

await BackupStorage.addBackup(metadata);
```

### Listar e Filtrar
```typescript
// Listar todos os backups
const allBackups = await BackupStorage.listBackups();

// Filtrar por status
const successfulBackups = await BackupStorage.listBackups({ 
  status: 'success' 
});

// Filtrar por data com paginação
const recentBackups = await BackupStorage.listBackups({
  startDate: new Date('2025-01-01'),
  limit: 10,
  offset: 0
});
```

### Buscar Backups
```typescript
// Buscar por ID
const backup = await BackupStorage.getBackup('backup-123');

// Buscar por termo
const searchResults = await BackupStorage.searchBackups('daily');
```

### Estatísticas
```typescript
const stats = await BackupStorage.getBackupStats();
console.log(`Total: ${stats.total}`);
console.log(`Sucessos: ${stats.successful}`);
console.log(`Tamanho total: ${stats.totalSize} bytes`);
```

### Limpeza Automática
```typescript
// Verificar se precisa de limpeza
const needsCleanup = await BackupStorage.shouldPerformCleanup();

if (needsCleanup) {
  // Executar limpeza completa
  const result = await BackupStorage.performFullCleanup();
  console.log(`Removidos: ${result.totalRemoved}`);
  console.log(`Espaço liberado: ${result.totalFreedSpace} bytes`);
}
```

### Validação de Integridade
```typescript
const validation = await BackupStorage.validateRegistry();

if (!validation.isValid) {
  console.log('Problemas encontrados:', validation.issues);
  console.log('Problemas corrigidos:', validation.fixedIssues);
}
```

### Gerenciar Configurações
```typescript
// Obter configurações atuais
const settings = await BackupStorage.getSettings();

// Atualizar configurações
await BackupStorage.updateSettings({
  maxBackups: 100,
  retentionDays: 60
});
```

## Tratamento de Erros

A classe implementa tratamento robusto de erros:

- **Inicialização**: Falha ao criar diretórios ou registry
- **Operações CRUD**: Backup não encontrado, ID duplicado
- **Limpeza**: Falha ao remover arquivos físicos
- **Validação**: Registry corrompido, arquivos órfãos

Todos os métodos retornam informações detalhadas sobre erros encontrados.

## Integração com Outros Serviços

O `BackupStorage` é projetado para trabalhar em conjunto com:

- **BackupService**: Criação e validação de backups
- **BackupValidator**: Verificação de integridade de arquivos
- **APIs de Backup**: Endpoints para operações via web
- **CLI de Backup**: Comandos de linha de comando

## Testes

A classe possui cobertura completa de testes unitários:

```bash
npm test -- --testPathPattern=backupStorage.test.ts
```

Os testes cobrem todos os cenários principais:
- Inicialização e configuração
- Operações CRUD completas
- Filtros e buscas
- Limpeza automática
- Validação de integridade
- Tratamento de erros

## Requisitos Atendidos

Esta implementação atende aos seguintes requisitos do sistema:

- **5.1**: Listagem de backups com metadados
- **5.2**: Filtros por data e status
- **5.3**: Busca e acesso a backups específicos
- **5.4**: Exclusão de backups com validação
- **5.5**: Limpeza automática de backups antigos