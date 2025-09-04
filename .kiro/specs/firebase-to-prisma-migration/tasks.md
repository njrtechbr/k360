# Plano de Implementação - Migração Firebase para Prisma

- [ ] 1. Configurar infraestrutura base para Prisma e NextAuth
  - Configurar cliente Prisma otimizado para produção
  - Implementar configuração NextAuth com CredentialsProvider
  - Criar middleware de autenticação para proteção de rotas
  - _Requisitos: 1.1, 2.1_

- [ ] 2. Implementar serviços Prisma para substituir operações Firebase
- [ ] 2.1 Criar serviço de usuários com operações CRUD
  - Implementar UserService com métodos findAll, findById, create, update, delete
  - Adicionar validação de dados com Zod schemas
  - Implementar tratamento de erros específicos para operações de usuário
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.2 Criar serviço de módulos com operações CRUD
  - Implementar ModuleService com métodos para gerenciar módulos
  - Adicionar lógica para relacionamento many-to-many com usuários
  - Implementar operações de ativação/desativação de módulos
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2.3 Criar serviço de atendentes com operações CRUD
  - Implementar AttendantService com operações completas
  - Adicionar suporte para importação em lote com AttendantImport
  - Implementar validação de dados únicos (email, CPF)
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2.4 Criar serviço de avaliações com operações CRUD
  - Implementar EvaluationService com operações completas
  - Adicionar suporte para importação em lote com EvaluationImport
  - Implementar lógica de cálculo de XP integrada
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2.5 Criar serviço de gamificação com operações completas
  - Implementar GamificationService para XpEvent, conquistas e temporadas
  - Adicionar lógica de cálculo de XP com multiplicadores sazonais
  - Implementar sistema de desbloqueio de conquistas
  - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.6 Criar serviço de RH para funções e setores
  - Implementar RHService para gerenciar Funcao e Setor
  - Adicionar operações CRUD para ambas as entidades
  - Implementar validação de nomes únicos
  - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 3. Refatorar AuthProvider para usar NextAuth e Prisma
- [ ] 3.1 Remover dependências Firebase do AuthProvider
  - Remover todos os imports Firebase (auth, firestore)
  - Remover configurações e inicializações Firebase
  - Limpar código relacionado ao Firebase Auth
  - _Requisitos: 1.1, 1.2, 1.3_

- [ ] 3.2 Implementar autenticação com NextAuth
  - Substituir onAuthStateChanged por useSession do NextAuth
  - Implementar login usando signIn do NextAuth
  - Implementar logout usando signOut do NextAuth
  - Implementar registro de usuário com hash de senha
  - _Requisitos: 2.1, 2.2, 2.3, 2.4_

- [ ] 3.3 Substituir operações Firestore por Prisma nos métodos de usuário
  - Refatorar fetchAllData para usar serviços Prisma
  - Substituir operações de usuário (create, update, delete) por UserService
  - Implementar verificação de super admin via Prisma
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.4 Substituir operações Firestore por Prisma nos métodos de módulos
  - Refatorar operações de módulo para usar ModuleService
  - Implementar relacionamento usuário-módulo via Prisma
  - Atualizar lógica de ativação/desativação de módulos
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.5 Substituir operações Firestore por Prisma nos métodos de atendentes
  - Refatorar operações de atendente para usar AttendantService
  - Implementar importação de atendentes via Prisma
  - Atualizar lógica de exclusão em lote
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.6 Substituir operações Firestore por Prisma nos métodos de avaliações
  - Refatorar operações de avaliação para usar EvaluationService
  - Implementar importação de avaliações via Prisma
  - Atualizar lógica de exclusão com eventos XP relacionados
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3.7 Substituir operações Firestore por Prisma nos métodos de gamificação
  - Refatorar operações de gamificação para usar GamificationService
  - Implementar gestão de temporadas via Prisma
  - Atualizar lógica de reset de eventos XP
  - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 3.8 Substituir operações Firestore por Prisma nos métodos de RH
  - Refatorar operações de funções e setores para usar RHService
  - Implementar CRUD completo para Funcao e Setor
  - Atualizar lógica de validação de nomes únicos
  - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 4. Implementar tratamento de erros robusto
- [ ] 4.1 Criar sistema de tratamento de erros Prisma
  - Implementar classe DatabaseError personalizada
  - Criar função handlePrismaError para converter códigos de erro
  - Adicionar tratamento específico para erros de constraint
  - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 4.2 Implementar tratamento de erros nos serviços
  - Adicionar try-catch em todos os métodos dos serviços
  - Implementar logging de erros para debugging
  - Criar mensagens de erro amigáveis para usuários
  - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 4.3 Atualizar AuthProvider com tratamento de erros NextAuth
  - Implementar tratamento de erros de autenticação
  - Adicionar tratamento para erros de sessão
  - Criar fallbacks para falhas de conexão
  - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 5. Configurar e implementar rotas API NextAuth
- [ ] 5.1 Configurar rota de autenticação NextAuth
  - Criar arquivo [...nextauth]/route.ts com configuração completa
  - Implementar CredentialsProvider com validação de senha
  - Configurar callbacks para sessão e JWT
  - _Requisitos: 2.1, 2.2, 2.3_

- [ ] 5.2 Implementar middleware de proteção de rotas
  - Criar middleware.ts para proteger rotas do dashboard
  - Implementar verificação de roles para autorização
  - Adicionar redirecionamento para login quando necessário
  - _Requisitos: 2.1, 2.2_

- [ ] 6. Remover arquivos e dependências Firebase
- [ ] 6.1 Remover arquivo de configuração Firebase
  - Localizar e remover arquivo firebase.ts/js se existir
  - Remover variáveis de ambiente Firebase
  - Limpar configurações Firebase do projeto
  - _Requisitos: 1.1, 1.3, 1.4_

- [ ] 6.2 Limpar dependências Firebase do package.json
  - Remover pacotes Firebase das dependencies
  - Executar npm install para limpar node_modules
  - Verificar se não há referências residuais
  - _Requisitos: 1.3_

- [ ] 7. Implementar testes para validar migração
- [ ] 7.1 Criar testes unitários para serviços Prisma
  - Implementar testes para UserService com banco em memória
  - Criar testes para AttendantService e EvaluationService
  - Adicionar testes para GamificationService e RHService
  - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.2 Criar testes de integração para AuthProvider
  - Implementar testes para fluxos de login/logout
  - Testar operações CRUD através do AuthProvider
  - Validar funcionamento do sistema de gamificação
  - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.3 Criar script de validação de integridade de dados
  - Implementar verificação de relacionamentos no banco
  - Validar dados de gamificação e XP
  - Criar relatório de integridade dos dados
  - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8. Validar funcionamento completo do sistema
- [ ] 8.1 Testar fluxos de autenticação
  - Validar login com credenciais corretas e incorretas
  - Testar logout e limpeza de sessão
  - Verificar proteção de rotas e redirecionamentos
  - _Requisitos: 10.1, 10.2_

- [ ] 8.2 Testar operações CRUD de todas as entidades
  - Validar criação, leitura, atualização e exclusão de usuários
  - Testar operações de atendentes, avaliações e módulos
  - Verificar funcionamento de importações e reversões
  - _Requisitos: 10.2, 10.3, 10.5_

- [ ] 8.3 Validar sistema de gamificação
  - Testar cálculo de XP em avaliações
  - Verificar funcionamento de temporadas e multiplicadores
  - Validar desbloqueio de conquistas
  - _Requisitos: 10.4_

- [ ] 8.4 Testar performance e otimizações
  - Verificar tempo de carregamento das páginas
  - Testar operações em lote com grandes volumes
  - Validar eficiência das consultas Prisma
  - _Requisitos: 10.1, 10.2, 10.3_

- [ ] 9. Documentar mudanças e criar guia de migração
- [ ] 9.1 Atualizar documentação técnica
  - Documentar nova arquitetura Prisma/NextAuth
  - Atualizar guias de desenvolvimento
  - Criar documentação de troubleshooting
  - _Requisitos: 10.1_

- [ ] 9.2 Criar guia de deployment
  - Documentar variáveis de ambiente necessárias
  - Criar checklist de deployment
  - Documentar processo de rollback se necessário
  - _Requisitos: 10.1_