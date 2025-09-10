# Requirements Document

## Introduction

O projeto atualmente possui uma arquitetura inconsistente onde o Prisma ORM é usado diretamente em vários componentes, providers e serviços, ao invés de seguir um padrão de API centralizado. Esta abordagem cria problemas de manutenibilidade, testabilidade e escalabilidade. É necessário refatorar a arquitetura para que toda comunicação com o banco de dados seja feita através de APIs REST padronizadas.

## Requirements

### Requirement 1

**User Story:** Como desenvolvedor, eu quero que toda comunicação com o banco de dados seja feita através de APIs REST, para que o sistema tenha uma arquitetura mais limpa e manutenível.

#### Acceptance Criteria

1. WHEN um componente React precisa de dados THEN ele SHALL usar hooks que consomem APIs REST
2. WHEN um serviço precisa acessar dados THEN ele SHALL usar fetch/axios para chamar endpoints de API
3. WHEN o PrismaProvider é usado THEN ele SHALL ser refatorado para usar APIs ao invés de Prisma direto
4. IF um endpoint de API não existir THEN ele SHALL ser criado antes da refatoração do consumidor

### Requirement 2

**User Story:** Como desenvolvedor, eu quero que todos os serviços existentes sejam convertidos para usar APIs, para que não haja acesso direto ao Prisma fora das rotas de API.

#### Acceptance Criteria

1. WHEN userService.ts é refatorado THEN ele SHALL usar /api/users endpoints
2. WHEN attendantService.ts é refatorado THEN ele SHALL usar /api/attendants endpoints  
3. WHEN evaluationService.ts é refatorado THEN ele SHALL usar /api/evaluations endpoints
4. WHEN gamificationService.ts é refatorado THEN ele SHALL usar /api/gamification endpoints
5. WHEN moduleService.ts é refatorado THEN ele SHALL usar /api/modules endpoints
6. WHEN rhService.ts é refatorado THEN ele SHALL usar /api/funcoes e /api/setores endpoints
7. WHEN xpAvulsoService.ts é refatorado THEN ele SHALL usar /api/xp-avulso endpoints

### Requirement 3

**User Story:** Como desenvolvedor, eu quero que o PrismaProvider seja refatorado para usar APIs, para que ele não tenha dependência direta do Prisma client.

#### Acceptance Criteria

1. WHEN PrismaProvider busca dados THEN ele SHALL usar fetch para chamar APIs REST
2. WHEN PrismaProvider cria/atualiza dados THEN ele SHALL usar POST/PUT requests para APIs
3. WHEN PrismaProvider deleta dados THEN ele SHALL usar DELETE requests para APIs
4. WHEN uma operação falha THEN o provider SHALL tratar erros de API adequadamente
5. IF uma API não estiver disponível THEN o provider SHALL mostrar erro apropriado

### Requirement 4

**User Story:** Como desenvolvedor, eu quero que todos os hooks customizados usem APIs, para que tenham uma interface consistente com o backend.

#### Acceptance Criteria

1. WHEN useUsersData é usado THEN ele SHALL consumir /api/users
2. WHEN useEvaluationsData é usado THEN ele SHALL consumir /api/evaluations  
3. WHEN useModulesData é usado THEN ele SHALL consumir /api/modules
4. WHEN useRhConfigData é usado THEN ele SHALL consumir /api/funcoes e /api/setores
5. WHEN useActiveSeason é usado THEN ele SHALL consumir /api/gamification/seasons

### Requirement 5

**User Story:** Como desenvolvedor, eu quero que APIs faltantes sejam criadas, para que todos os serviços tenham endpoints correspondentes.

#### Acceptance Criteria

1. IF /api/funcoes não existir THEN ele SHALL ser criado com CRUD completo
2. IF /api/setores não existir THEN ele SHALL ser criado com CRUD completo
3. IF /api/xp-avulso não existir THEN ele SHALL ser criado com operações necessárias
4. IF /api/gamification/seasons não existir THEN ele SHALL ser criado
5. WHEN uma nova API é criada THEN ela SHALL seguir padrões REST consistentes

### Requirement 6

**User Story:** Como desenvolvedor, eu quero que o sistema tenha tratamento de erro consistente, para que falhas de API sejam tratadas uniformemente.

#### Acceptance Criteria

1. WHEN uma API retorna erro THEN o cliente SHALL mostrar mensagem apropriada
2. WHEN há erro de rede THEN o sistema SHALL tentar reconectar automaticamente
3. WHEN há erro de autenticação THEN o usuário SHALL ser redirecionado para login
4. WHEN há erro de validação THEN os campos SHALL mostrar mensagens específicas
5. IF uma operação crítica falha THEN o sistema SHALL manter estado consistente

### Requirement 7

**User Story:** Como desenvolvedor, eu quero que apenas as rotas de API tenham acesso direto ao Prisma, para que haja uma separação clara de responsabilidades.

#### Acceptance Criteria

1. WHEN código é executado no cliente THEN ele SHALL NOT importar Prisma diretamente
2. WHEN um serviço é executado THEN ele SHALL NOT instanciar PrismaClient
3. WHEN uma rota de API é executada THEN ela SHALL poder usar Prisma diretamente
4. IF código cliente precisa de dados THEN ele SHALL fazer requisição HTTP para API
5. WHEN refatoração é completa THEN apenas /src/app/api/ SHALL importar Prisma

### Requirement 8

**User Story:** Como desenvolvedor, eu quero que a migração seja feita incrementalmente, para que o sistema continue funcionando durante a refatoração.

#### Acceptance Criteria

1. WHEN um serviço é refatorado THEN a funcionalidade existente SHALL continuar funcionando
2. WHEN uma API é criada THEN ela SHALL ser testada antes de migrar consumidores
3. WHEN PrismaProvider é refatorado THEN ele SHALL manter interface pública compatível
4. IF uma refatoração quebra funcionalidade THEN ela SHALL ser revertida
5. WHEN migração é completa THEN todos os testes SHALL passar