# Testes de Integração da API de Backup

Este diretório contém testes de integração completos para o sistema de backup do banco de dados.

## 📋 Suites de Teste

### 1. Testes E2E de Endpoints (`backup-api.integration.test.ts`)
- **Objetivo**: Testar todos os endpoints de backup de ponta a ponta
- **Cobertura**:
  - POST `/api/backup/create` - Criação de backups
  - GET `/api/backup/list` - Listagem de backups
  - GET `/api/backup/download/[id]` - Download de arquivos
  - DELETE `/api/backup/[id]` - Exclusão de backups
  - GET `/api/backup/status/[id]` - Status de operações

### 2. Testes de Autenticação e Autorização (`backup-auth.integration.test.ts`)
- **Objetivo**: Verificar controle de acesso e segurança
- **Cobertura**:
  - Controle de acesso por role (SUPERADMIN, ADMIN, SUPERVISOR, USUARIO)
  - Validação de sessão e autenticação
  - Proteção contra ataques (path traversal, XSS, injection)
  - Rate limiting e proteção contra abuso
  - Headers de segurança

### 3. Testes de Operações de Arquivo (`backup-file-operations.integration.test.ts`)
- **Objetivo**: Testar upload, download e validação de arquivos
- **Cobertura**:
  - Download de arquivos de diferentes tamanhos
  - Streaming eficiente para arquivos grandes
  - Validação de integridade (checksums)
  - Suporte a compressão
  - Detecção de arquivos corrompidos
  - Segurança de arquivos

### 4. Testes de Performance (`backup-performance.integration.test.ts`)
- **Objetivo**: Avaliar performance com diferentes cenários
- **Cobertura**:
  - Performance de criação de backup
  - Performance de download e streaming
  - Performance de listagem com muitos arquivos
  - Validação de integridade eficiente
  - Métricas de tempo de resposta e uso de memória

## 🚀 Executando os Testes

### Executar Todos os Testes
```bash
# Usando o script personalizado
node src/app/api/backup/__tests__/run-integration-tests.js

# Ou usando Jest diretamente
npx jest --config=src/app/api/backup/__tests__/jest.integration.config.js
```

### Executar Suite Específica
```bash
# Testes E2E
npx jest backup-api.integration.test.ts

# Testes de Autenticação
npx jest backup-auth.integration.test.ts

# Testes de Arquivos
npx jest backup-file-operations.integration.test.ts

# Testes de Performance
npx jest backup-performance.integration.test.ts
```

### Executar com Cobertura
```bash
npx jest --config=src/app/api/backup/__tests__/jest.integration.config.js --coverage
```

### Debug e Desenvolvimento
```bash
# Executar com logs detalhados
npx jest --verbose --no-cache

# Executar apenas testes rápidos
npx jest --testNamePattern="pequeno|rápido"

# Executar em modo watch
npx jest --watch
```

## ⚙️ Configuração

### Variáveis de Ambiente Necessárias
```env
DATABASE_URL=postgresql://user:password@localhost:5432/testdb
BACKUP_DIRECTORY=/path/to/test/backups
BACKUP_MAX_SIZE_GB=1
BACKUP_RETENTION_DAYS=7
```

### Dependências de Teste
- Jest com ambiente Node.js
- Mocks do NextAuth para autenticação
- Mocks dos serviços BackupService e BackupStorage
- Utilitários para criação de arquivos de teste

## 📊 Métricas e Benchmarks

### Tempos de Resposta Esperados
- **Arquivo pequeno (1KB)**: < 1 segundo
- **Arquivo médio (1MB)**: < 5 segundos
- **Arquivo grande (10MB)**: < 30 segundos
- **Listagem (1000 itens)**: < 2 segundos

### Limites de Performance
- **Criação de backup**: < 5 segundos para arquivos pequenos
- **Download streaming**: Primeiro byte em < 2 segundos
- **Validação de integridade**: < 500ms para arquivos pequenos
- **Uso de memória**: < 100MB de aumento durante operações

## 🔧 Troubleshooting

### Problemas Comuns

#### Testes de Arquivo Falhando
```bash
# Verificar permissões do diretório
ls -la test-backups/

# Limpar cache do Jest
npx jest --clearCache
```

#### Timeouts em Testes de Performance
```bash
# Aumentar timeout no Jest
npx jest --testTimeout=60000
```

#### Problemas de Memória
```bash
# Executar com menos workers
npx jest --maxWorkers=1
```

### Logs de Debug
Os testes incluem logs detalhados que podem ser habilitados:
```javascript
// No arquivo de teste
console.log = jest.fn(); // Desabilitar
console.log = originalConsole.log; // Habilitar
```

## 📈 Relatórios

### Cobertura de Código
Os testes visam atingir:
- **Linhas**: 80%
- **Funções**: 80%
- **Branches**: 70%
- **Statements**: 80%

### Relatório de Performance
Após executar os testes, métricas são coletadas:
- Tempo médio de resposta por endpoint
- Throughput de download por tamanho de arquivo
- Uso de memória durante operações
- Taxa de erro por tipo de operação

## 🔄 Integração Contínua

### Pipeline de CI/CD
```yaml
# Exemplo para GitHub Actions
- name: Run Integration Tests
  run: |
    npm run test:integration
    npm run test:coverage
```

### Critérios de Aprovação
- Todos os testes devem passar
- Cobertura mínima de 80%
- Tempo de execução < 5 minutos
- Sem vazamentos de memória

## 📚 Referências

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Node.js Performance Hooks](https://nodejs.org/api/perf_hooks.html)
- [Backup System Design](../design.md)
- [Backup Requirements](../requirements.md)