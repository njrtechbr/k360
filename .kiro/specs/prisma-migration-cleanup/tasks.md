# Implementation Plan

- [x] 1. Criar API clients para dashboard e achievements





  - Implementar DashboardApiClient seguindo padrão dos clients existentes
  - Implementar AchievementApiClient para processamento de conquistas
  - Criar tipos locais para evitar dependência do Prisma no frontend
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 1.1 Implementar DashboardApiClient


  - Criar arquivo `src/services/dashboardApiClient.ts`
  - Implementar métodos para estatísticas gerais (getGeneralStats, getEvaluationTrend, getRatingDistribution)
  - Implementar métodos para métricas de gamificação (getGamificationOverview, getTopPerformers)
  - Implementar métodos para métricas em tempo real (getRealtimeMetrics, getSatisfactionMetrics)
  - Adicionar tratamento de erros seguindo padrão HttpClientError
  - _Requirements: 1.1, 4.1_

- [x] 1.2 Implementar AchievementApiClient


  - Criar arquivo `src/services/achievementApiClient.ts`
  - Implementar métodos para processamento (processAchievementsForAttendant, processAllAchievements)
  - Implementar métodos para verificação (checkAchievementCriteria, getUnlockedAchievements)
  - Implementar métodos para estatísticas (getAchievementStats, getPopularAchievements)
  - Adicionar validação de entrada usando Zod
  - _Requirements: 1.2, 4.2_

- [x] 2. Criar endpoints de API para dashboard





  - Implementar endpoints REST para todas as funcionalidades do dashboard
  - Usar singleton do Prisma ao invés de new PrismaClient()
  - Adicionar autenticação e autorização apropriadas
  - _Requirements: 2.1, 2.2, 5.1, 5.2_

- [x] 2.1 Criar endpoints básicos de dashboard


  - Criar `src/app/api/dashboard/stats/route.ts` para estatísticas gerais
  - Criar `src/app/api/dashboard/evaluation-trend/route.ts` para tendência de avaliações
  - Criar `src/app/api/dashboard/rating-distribution/route.ts` para distribuição de notas
  - Criar `src/app/api/dashboard/top-performers/route.ts` para ranking de atendentes
  - Migrar lógica do DashboardService mantendo funcionalidade idêntica
  - _Requirements: 2.1, 5.1_

- [x] 2.2 Criar endpoints de métricas em tempo real


  - Criar `src/app/api/dashboard/realtime/route.ts` para métricas consolidadas
  - Criar `src/app/api/dashboard/gamification-metrics/route.ts` para métricas de gamificação
  - Criar `src/app/api/dashboard/satisfaction-metrics/route.ts` para métricas de satisfação
  - Criar `src/app/api/dashboard/alert-metrics/route.ts` para alertas do sistema
  - Migrar lógica do RealtimeDashboardService mantendo funcionalidade idêntica
  - _Requirements: 2.1, 5.1_

- [x] 3. Criar endpoints de API para achievements





  - Implementar endpoints para processamento e verificação de conquistas
  - Usar singleton do Prisma ao invés de new PrismaClient()
  - Adicionar validação de entrada e tratamento de erros
  - _Requirements: 2.1, 2.2, 5.1, 5.2_

- [x] 3.1 Criar endpoints de processamento de conquistas


  - Criar `src/app/api/achievements/process/route.ts` para processamento geral
  - Criar `src/app/api/achievements/process-attendant/route.ts` para atendente específico
  - Criar `src/app/api/achievements/process-season/route.ts` para temporada específica
  - Migrar lógica do AchievementProcessor mantendo funcionalidade idêntica
  - _Requirements: 2.1, 5.2_

- [x] 3.2 Criar endpoints de verificação de conquistas


  - Criar `src/app/api/achievements/check/route.ts` para verificação de critérios
  - Criar `src/app/api/achievements/unlocked/[attendantId]/route.ts` para conquistas desbloqueadas
  - Criar `src/app/api/achievements/stats/route.ts` para estatísticas de conquistas
  - Implementar validação de parâmetros e autenticação
  - _Requirements: 2.1, 5.2_

- [x] 4. Migrar serviços do frontend para usar API clients





  - Substituir uso direto do Prisma nos serviços do frontend
  - Atualizar imports e chamadas de métodos
  - Manter compatibilidade com código existente
  - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2_

- [x] 4.1 Migrar DashboardService para DashboardApiClient


  - Atualizar todas as referências ao DashboardService no frontend
  - Substituir chamadas diretas por chamadas HTTP via DashboardApiClient
  - Atualizar testes para mockar o httpClient ao invés do Prisma
  - Verificar que todas as funcionalidades continuam funcionando
  - _Requirements: 1.1, 7.1, 7.2_

- [x] 4.2 Migrar RealtimeDashboardService para DashboardApiClient


  - Atualizar todas as referências ao RealtimeDashboardService no frontend
  - Substituir chamadas diretas por chamadas HTTP via DashboardApiClient
  - Atualizar componentes que usam métricas em tempo real
  - Verificar que dashboards continuam funcionando corretamente
  - _Requirements: 1.1, 7.1, 7.2_

- [x] 4.3 Migrar AchievementProcessor para AchievementApiClient


  - Atualizar todas as referências ao AchievementProcessor no frontend
  - Substituir chamadas diretas por chamadas HTTP via AchievementApiClient
  - Atualizar lógica de processamento automático de conquistas
  - Verificar que conquistas continuam sendo processadas corretamente
  - _Requirements: 1.2, 7.1, 7.2_

- [x] 5. Padronizar uso do Prisma nas APIs





  - Substituir todas as instâncias de new PrismaClient() pelo singleton
  - Atualizar imports para usar import { prisma } from '@/lib/prisma'
  - Verificar que não há vazamentos de conexão
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5.1 Corrigir instâncias do PrismaClient em APIs de attendants


  - Atualizar `src/app/api/attendants/import-batch/route.ts`
  - Atualizar `src/app/api/attendants/imports-list/route.ts`
  - Atualizar todas as outras APIs de attendants que usam new PrismaClient()
  - Substituir por import { prisma } from '@/lib/prisma'
  - _Requirements: 2.1, 2.2_

- [x] 5.2 Corrigir instâncias do PrismaClient em APIs de evaluations


  - Atualizar `src/app/api/evaluations/analysis/route.ts`
  - Atualizar `src/app/api/evaluations/create/route.ts`
  - Atualizar `src/app/api/evaluations/import/route.ts`
  - Atualizar todas as outras APIs de evaluations que usam new PrismaClient()
  - Substituir por import { prisma } from '@/lib/prisma'
  - _Requirements: 2.1, 2.2_

- [x] 5.3 Corrigir instâncias do PrismaClient em APIs de gamification


  - Atualizar `src/app/api/gamification/achievements/route.ts`
  - Atualizar `src/app/api/gamification/leaderboard/route.ts`
  - Atualizar `src/app/api/gamification/xp-events/route.ts`
  - Atualizar todas as outras APIs de gamification que usam new PrismaClient()
  - Substituir por import { prisma } from '@/lib/prisma'
  - _Requirements: 2.1, 2.2_

- [x] 6. Remover serviços Prisma legados





  - Remover AttendantPrismaService, EvaluationPrismaService, UserPrismaService
  - Atualizar APIs que ainda usam esses serviços para usar API clients
  - Remover imports e referências aos serviços removidos
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6.1 Migrar APIs que usam AttendantPrismaService


  - Atualizar `src/app/api/attendants/route.ts` para usar AttendantApiClient
  - Atualizar `src/app/api/attendants/[id]/route.ts` para usar AttendantApiClient
  - Atualizar `src/app/api/attendants/import/reverse/route.ts`
  - Remover imports do AttendantPrismaService
  - _Requirements: 3.1, 3.3_

- [x] 6.2 Migrar APIs que usam EvaluationPrismaService


  - Atualizar `src/app/api/evaluations/route.ts` para usar EvaluationApiClient
  - Atualizar `src/app/api/evaluations/[id]/route.ts` para usar EvaluationApiClient
  - Atualizar `src/app/api/evaluations/import/reverse/route.ts`
  - Remover imports do EvaluationPrismaService
  - _Requirements: 3.1, 3.3_

- [x] 6.3 Migrar APIs que usam UserPrismaService


  - Atualizar `src/app/api/users/route.ts` para usar UserApiClient
  - Atualizar `src/app/api/users/[id]/route.ts` para usar UserApiClient
  - Atualizar `src/app/api/users/login/route.ts` para usar UserApiClient
  - Remover imports do UserPrismaService
  - _Requirements: 3.1, 3.3_

- [x] 6.4 Remover arquivos de serviços Prisma legados


  - Deletar `src/services/attendantPrismaService.ts`
  - Deletar `src/services/evaluationPrismaService.ts`
  - Deletar `src/services/userPrismaService.ts`
  - Deletar testes associados aos serviços removidos
  - _Requirements: 3.1, 3.2_

- [x] 7. Organizar tipos do Prisma




  - Avaliar quais tipos do Prisma são necessários em cada camada
  - Criar tipos locais para o frontend quando apropriado
  - Manter tipos do Prisma apenas nas APIs quando necessário
  - _Requirements: 6.1, 6.2, 6.3_



- [x] 7.1 Criar tipos locais para dashboard

  - Criar interfaces locais em `src/types/dashboard.ts`
  - Substituir imports de tipos do Prisma nos API clients
  - Manter compatibilidade com código existente
  - Documentar tipos criados
  - _Requirements: 6.2, 6.4_

- [x] 7.2 Criar tipos locais para achievements


  - Criar interfaces locais em `src/types/achievements.ts`
  - Substituir imports de tipos do Prisma no AchievementApiClient
  - Manter compatibilidade com código existente
  - Documentar tipos criados
  - _Requirements: 6.2, 6.4_

- [x] 8. Atualizar testes para nova arquitetura






  - Atualizar testes unitários para mockar httpClient ao invés do Prisma
  - Criar testes de integração para novos endpoints
  - Verificar cobertura de testes mantida ou melhorada
  - _Requirements: 7.3, 8.1, 8.2_

- [x] 8.1 Atualizar testes dos API clients



  - Atualizar testes do DashboardApiClient para mockar httpClient
  - Atualizar testes do AchievementApiClient para mockar httpClient
  - Criar novos testes para funcionalidades migradas
  - Verificar que todos os testes passam
  - _Requirements: 7.3, 8.2_

- [x] 8.2 Criar testes de integração para endpoints


  - Criar testes para endpoints de dashboard (`src/app/api/dashboard/__tests__/`)
  - Criar testes para endpoints de achievements (`src/app/api/achievements/__tests__/`)
  - Testar autenticação e autorização nos endpoints
  - Testar tratamento de erros e validação de entrada
  - _Requirements: 7.3, 8.2_

- [x] 9. Validar migração completa





  - Executar script de validação para verificar que todos os problemas foram resolvidos
  - Executar todos os testes para garantir que nada quebrou
  - Verificar que build de produção funciona corretamente
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9.1 Executar validação automática


  - Executar `node scripts/find-prisma-usage.js` e verificar zero problemas críticos
  - Executar `npm run build` e verificar que não há erros de compilação
  - Executar `npm run typecheck` e verificar que não há erros de tipos
  - Verificar que todas as métricas de sucesso foram atingidas
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 9.2 Executar testes completos


  - Executar `npm test` e verificar que todos os testes passam
  - Executar `npm run test:coverage` e verificar cobertura mantida
  - Testar funcionalidades críticas manualmente (dashboard, conquistas)
  - Verificar que performance não foi degradada
  - _Requirements: 8.2, 8.4_

- [x] 10. Limpeza final e documentação





  - Remover código morto e imports não utilizados
  - Atualizar documentação para refletir nova arquitetura
  - Criar guia de migração para futuras referências
  - _Requirements: 7.1, 7.2_

- [x] 10.1 Limpeza de código


  - Executar script de limpeza para remover imports não utilizados
  - Remover comentários e código comentado relacionado à migração
  - Verificar que não há arquivos órfãos ou não utilizados
  - Padronizar formatação de código migrado
  - _Requirements: 7.1, 7.2_

- [x] 10.2 Atualizar documentação


  - Atualizar README.md com informações sobre nova arquitetura
  - Atualizar documentação de APIs com novos endpoints
  - Criar guia de troubleshooting para problemas comuns
  - Documentar padrões estabelecidos para futuras implementações
  - _Requirements: 7.1, 7.2_