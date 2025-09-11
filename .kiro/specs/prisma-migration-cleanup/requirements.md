# Requirements Document

## Introduction

Este documento define os requisitos para a migração completa do uso direto do Prisma no frontend para uma arquitetura baseada em APIs. O sistema atualmente possui 178 itens que precisam ser migrados, incluindo serviços que usam Prisma diretamente no frontend, múltiplas instâncias do PrismaClient, e serviços legados que devem ser removidos. Esta migração é crítica para manter a separação adequada entre frontend e backend, melhorar a performance e facilitar a manutenção do código.

## Requirements

### Requirement 1

**User Story:** Como desenvolvedor, eu quero que todos os serviços do frontend usem APIs ao invés de Prisma diretamente, para que haja uma separação clara entre frontend e backend.

#### Acceptance Criteria

1. WHEN o sistema for analisado THEN não deve haver nenhum import direto do Prisma em serviços do frontend
2. WHEN serviços de dashboard forem executados THEN eles devem usar API clients ao invés de instâncias diretas do Prisma
3. WHEN serviços de achievement forem processados THEN eles devem usar endpoints de API dedicados
4. IF um serviço do frontend precisar de dados THEN ele deve fazer chamadas HTTP para APIs ao invés de queries diretas no banco

### Requirement 2

**User Story:** Como desenvolvedor, eu quero que todas as APIs usem uma instância singleton do Prisma, para que não haja múltiplas conexões desnecessárias com o banco de dados.

#### Acceptance Criteria

1. WHEN uma API precisar acessar o banco THEN ela deve usar `import { prisma } from '@/lib/prisma'`
2. WHEN o código for analisado THEN não deve haver nenhuma instância `new PrismaClient()` nas APIs
3. WHEN múltiplas APIs forem executadas simultaneamente THEN elas devem compartilhar a mesma instância do Prisma
4. IF uma API criar uma nova instância do Prisma THEN o sistema deve falhar na validação

### Requirement 3

**User Story:** Como desenvolvedor, eu quero remover todos os serviços Prisma legados, para que o código seja mais limpo e mantenha apenas os padrões atuais.

#### Acceptance Criteria

1. WHEN os serviços legados forem removidos THEN `AttendantPrismaService`, `EvaluationPrismaService` e `UserPrismaService` não devem mais existir
2. WHEN APIs forem refatoradas THEN elas devem usar os novos API clients ao invés dos serviços Prisma legados
3. WHEN testes forem executados THEN não deve haver referências aos serviços Prisma removidos
4. IF alguma API tentar usar um serviço Prisma legado THEN o sistema deve falhar na compilação

### Requirement 4

**User Story:** Como desenvolvedor, eu quero criar API clients para dashboard e achievements, para que o frontend possa acessar esses dados através de APIs padronizadas.

#### Acceptance Criteria

1. WHEN um `DashboardApiClient` for criado THEN ele deve fornecer métodos para todas as métricas de dashboard
2. WHEN um `AchievementApiClient` for criado THEN ele deve fornecer métodos para processamento e verificação de conquistas
3. WHEN esses clients forem usados THEN eles devem fazer chamadas HTTP para endpoints específicos
4. IF um client falhar em uma chamada THEN ele deve retornar erros tipados e tratáveis

### Requirement 5

**User Story:** Como desenvolvedor, eu quero criar endpoints de API para dashboard e achievements, para que os dados sejam servidos de forma consistente.

#### Acceptance Criteria

1. WHEN endpoints de dashboard forem criados THEN eles devem incluir `/api/dashboard/realtime` e `/api/dashboard/metrics`
2. WHEN endpoints de achievements forem criados THEN eles devem incluir `/api/achievements/process` e `/api/achievements/check`
3. WHEN esses endpoints forem chamados THEN eles devem retornar dados no formato JSON padronizado
4. IF um endpoint falhar THEN ele deve retornar códigos de status HTTP apropriados e mensagens de erro claras

### Requirement 6

**User Story:** Como desenvolvedor, eu quero que todos os tipos do Prisma sejam organizados adequadamente, para que haja clareza sobre quais tipos são necessários em cada camada.

#### Acceptance Criteria

1. WHEN tipos do Prisma forem usados em APIs THEN eles podem ser importados diretamente do `@prisma/client`
2. WHEN tipos forem necessários no frontend THEN devem ser criados tipos locais específicos
3. WHEN o sistema for compilado THEN não deve haver imports desnecessários de tipos do Prisma
4. IF tipos locais forem criados THEN eles devem ser documentados e tipados adequadamente

### Requirement 7

**User Story:** Como desenvolvedor, eu quero que a migração seja feita de forma incremental, para que o sistema continue funcionando durante todo o processo.

#### Acceptance Criteria

1. WHEN uma fase da migração for iniciada THEN os serviços antigos devem continuar funcionando até a substituição completa
2. WHEN novos serviços forem implementados THEN eles devem ser testados antes da remoção dos antigos
3. WHEN testes forem executados THEN todos devem passar em cada etapa da migração
4. IF alguma funcionalidade quebrar durante a migração THEN deve ser possível reverter para o estado anterior

### Requirement 8

**User Story:** Como desenvolvedor, eu quero validação automática da migração, para que seja possível verificar se todos os problemas foram resolvidos.

#### Acceptance Criteria

1. WHEN a migração for concluída THEN o script `find-prisma-usage.js` deve reportar zero problemas críticos
2. WHEN o build for executado THEN não deve haver erros relacionados a imports do Prisma
3. WHEN testes forem executados THEN todos devem passar com 100% de sucesso
4. IF algum problema for detectado THEN deve ser reportado com localização específica e sugestão de correção