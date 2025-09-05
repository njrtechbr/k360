# Implementation Plan

- [x] 1. Configurar modelos de dados e migrações





  - Criar migração Prisma para modelo XpTypeConfig com campos name, description, points, active, category, icon, color, createdBy
  - Criar migração Prisma para modelo XpGrant com relacionamentos para Attendant, XpTypeConfig, User e XpEvent
  - Atualizar schema.prisma com os novos modelos e relacionamentos
  - Executar migrações e regenerar cliente Prisma
  - _Requirements: 1.1, 1.2, 2.1, 5.1_

- [x] 2. Implementar service layer para XP avulso





  - [x] 2.1 Criar XpAvulsoService com operações CRUD para tipos de XP


    - Implementar createXpType, updateXpType, findAllXpTypes, toggleXpTypeStatus
    - Adicionar validações Zod para dados de entrada
    - Implementar tratamento de erros específicos
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Implementar funcionalidades de concessão de XP


    - Criar método grantXp que integra com GamificationService.createXpEvent
    - Implementar findGrantHistory com filtros avançados
    - Criar findGrantsByAttendant para histórico individual
    - Adicionar validações de limites e segurança
    - _Requirements: 2.1, 2.2, 2.3, 6.2_

- [x] 3. Criar API endpoints para gerenciamento de tipos





  - [x] 3.1 Implementar CRUD endpoints para tipos de XP


    - Criar GET /api/gamification/xp-types com filtros
    - Implementar POST /api/gamification/xp-types com validação
    - Criar PUT /api/gamification/xp-types/[id] para atualizações
    - Implementar DELETE /api/gamification/xp-types/[id] para desativação
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Adicionar middleware de autenticação e autorização


    - Implementar verificação de roles ADMIN e SUPERADMIN
    - Adicionar validação de sessão em todos os endpoints
    - Criar middleware de rate limiting para segurança
    - _Requirements: 6.1, 6.2_

- [x] 4. Implementar API endpoints para concessão de XP







  - [x] 4.1 Criar endpoint de concessão de XP avulso



    - Implementar POST /api/gamification/xp-grants com validações completas




    - Integrar com XpAvulsoService.grantXp
    - Adicionar logs de auditoria para todas as concessões
    - _Requirements: 2.1, 2.2, 2.3, 6.1_













  - [x] 4.2 Implementar endpoints de histórico e consulta


















    - Criar GET /api/gamification/xp-grants com filtros avançados
    - Implementar GET /api/gamification/xp-grants/attendant/[id]


    - Adicionar paginação e ordenação nos resultados










    - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Desenvolver interface de gerenciamento de tipos







  - [x] 5.1 Criar página de configuração de tipos de XP








    - Implementar componente XpTypeManager com DataTable
    - Criar formulário de criação/edição usando shadcn/ui Form
    - Adicionar ações de ativar/desativar tipos
    - Implementar validação em tempo real no frontend
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 5.2 Integrar página ao sistema de navegação




  - [x] 5.2 Integrar página ao sistema de navegação




    - Adicionar rota em /dashboard/gamificacao/configuracoes/tipos-xp
    - Integrar com menu de navegação existente
    - Implementar breadcrumbs e título da página
    - _Requirements: 1.1_

- [x] 6. Criar interface de concessão de XP






  - [x] 6.1 Implementar componente XpGrantInterface





    - Criar seletor de atendente com busca
    - Implementar seletor de tipo de XP com preview de pontos
    - Adicionar campo de justificativa opcional
    - Criar confirmação visual antes da concessão
    - _Requirements: 2.1, 2.2_

  - [x] 6.2 Adicionar página de concessão de XP




    - Criar rota em /dashboard/gamificacao/conceder-xp
    - Implementar feedback visual para sucesso/erro
    - Adicionar validações de temporada ativa
    - _Requirements: 2.1, 2.2, 2.4_
-

- [x] 7. Desenvolver interface de histórico e auditoria



-

  - [x] 7.1 Criar componente XpGrantHistory






    - Implementar DataTable com filtros avançados
    - Adicionar exportação para CSV
    - Criar visualização detalhada de cada concessão
    - Implementar paginação e busca
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.2 Integrar histórico ao dashboard






    - Criar página em /dashboard/gamificacao/historico-xp
    - Adicionar métricas e estatísticas de uso
    - Implementar filtros por período e administrador

    - _Requirements: 3.1, 3.2, 6.1_

- [x] 8. Integrar XP avulso ao perfil do atendente














  - [x] 8.1 Atualizar componente AttendantXpDisplay







    - Modificar exibição para separar XP de avaliações e XP avulso


    - Adicionar seção de histórico de XP avulso recebido
    - Implementar indicadores visuais para diferentes tipos de XP
    - _Requirements: 4.1, 4.2_

  - [x] 8.2 Implementar notificações de XP recebido



    - Criar sistema de notificação para atendentes
    - Integrar com concessão de XP para notificar automaticamente
    - Adicionar destaque para conquistas desbloqueadas via XP avulso
    - _Requirements: 4.3, 4.4_

- [x] 9. Implementar testes unitários









  - [x] 9.1 Criar testes para XpAvulsoService




    - Testar todas as operações CRUD de tipos de XP



    - Implementar testes de concessão de XP com diferentes cenários
    - Testar validações e tratamento de erros
    - Verificar integração com GamificationService
    - _Requirements: 1.1, 1.2, 2.1, 2.2_










  - [x] 9.2 Testar API endpoints





    - Criar testes de integração para todos os endpoints
    - Testar autenticação e autorização
    - Verificar validações de dados e tratamento de erros
    - Testar rate limiting e segurança


    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 10. Criar dados iniciais e documentação


  - [ ] 10.1 Implementar seed de tipos padrão de XP


    - Criar tipos básicos como "Excelência no Atendimento", "Iniciativa", "Trabalho em Equipe"
    - Definir pontos apropriados para cada tipo
    - Configurar ícones e cores para cada categoria
    - _Requirements: 1.1_

  - [x] 10.2 Atualizar documentação do sistema




    - Documentar novos endpoints da API
    - Criar guia de uso para administradores
    - Atualizar README com novas funcionalidades
    - _Requirements: 6.1_

- [ ] 11. Implementar testes de integração e E2E


  - [ ] 11.1 Criar testes de fluxo completo


    - Testar criação de tipo de XP até concessão
    - Verificar integração com sistema de conquistas
    - Testar experiência do atendente ao receber XP
    - _Requirements: 2.3, 4.4, 5.4_

  - [ ] 11.2 Testar cenários de segurança


    - Verificar controle de acesso por roles
    - Testar limites de concessão
    - Validar auditoria e logs
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12. Finalizar integração e deploy

  - [ ] 12.1 Integrar com sistema de gamificação existente
    - Verificar compatibilidade com rankings e temporadas
    - Testar multiplicadores sazonais em XP avulso
    - Validar cálculos de conquistas com novo XP
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 12.2 Preparar para produção
    - Executar testes de performance
    - Verificar logs e monitoramento
    - Validar backup e recuperação de dados
    - _Requirements: 6.4_