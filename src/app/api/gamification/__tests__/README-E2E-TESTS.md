# Testes E2E do Sistema de XP Avulso

Este documento descreve os testes End-to-End (E2E) implementados para o sistema de XP avulso, que cobrem o fluxo completo desde a criação de tipos de XP até a concessão e verificação de conquistas desbloqueadas.

## Estrutura dos Testes

### Arquivo Principal: `xp-avulso-e2e.test.ts`

Os testes E2E estão organizados em grupos que cobrem diferentes aspectos do sistema:

## 1. Fluxo Completo: Criação → Concessão → Verificação

### 1.1 Teste de Fluxo Completo com Conquistas
**Objetivo**: Testar o fluxo completo desde a criação de um tipo de XP até a concessão e verificação de conquistas desbloqueadas.

**Etapas testadas**:
1. **Criação de Tipo de XP**: Testa o endpoint `POST /api/gamification/xp-types`
2. **Concessão de XP**: Testa o endpoint `POST /api/gamification/xp-grants`
3. **Verificação de Histórico Geral**: Testa o endpoint `GET /api/gamification/xp-grants`
4. **Verificação de Histórico do Atendente**: Testa o endpoint `GET /api/gamification/xp-grants/attendant/[id]`
5. **Verificação de Integração**: Confirma que os serviços foram chamados corretamente
6. **Verificação de Auditoria**: Confirma que os logs de auditoria foram registrados

**Conquistas testadas**:
- "Primeiro Reconhecimento" - primeira concessão de XP avulso
- "Excelência Reconhecida" - XP por excelência no atendimento

### 1.2 Teste de Experiência com Mudança de Nível
**Objetivo**: Testar o cenário onde uma concessão de XP resulta em mudança de nível do atendente.

**Aspectos testados**:
- Concessão de XP que resulta em mudança de nível
- Verificação de conquistas relacionadas à mudança de nível
- Dados de notificação incluindo informações de nível anterior e novo
- Conquistas desbloqueadas por marcos de XP total

### 1.3 Teste de Integração com Sistema de Conquistas
**Objetivo**: Verificar que diferentes tipos de conquistas são desbloqueadas corretamente.

**Tipos de conquistas testadas**:
- **Baseadas em XP total**: Conquistas desbloqueadas ao atingir determinado XP
- **Baseadas em contagem de concessões**: Conquistas por número de reconhecimentos
- **Baseadas em tipo específico**: Conquistas por receber XP de tipos específicos

### 1.4 Teste de Múltiplas Concessões
**Objetivo**: Testar o acúmulo de XP através de múltiplas concessões para o mesmo atendente.

**Aspectos testados**:
- Concessões sequenciais com diferentes tipos de XP
- Acumulação correta de pontos
- Histórico consolidado ordenado por data
- Conquistas desbloqueadas em cada concessão

## 2. Testes de Performance e Escalabilidade

### 2.1 Teste de Paginação Eficiente
**Objetivo**: Verificar que o sistema lida corretamente com grandes volumes de dados usando paginação.

**Aspectos testados**:
- Simulação de histórico com 1000 concessões
- Paginação correta (20 itens por página)
- Parâmetros de paginação (página atual, total de páginas, etc.)
- Ordenação por data (mais recente primeiro)

## Estrutura dos Mocks

### Serviços Mockados
- **XpAvulsoService**: Todas as operações CRUD e de concessão
- **GamificationService**: Cálculo de XP total
- **AuthMiddleware**: Autenticação e autorização
- **AuditLogger**: Logs de auditoria
- **Rate Limiter**: Controle de taxa de requisições

### Estratégia de Mock
Os mocks são configurados para:
1. **Manter os schemas de validação**: Os schemas Zod não são mockados para garantir validação real
2. **Simular respostas realistas**: Os dados mockados seguem a estrutura real dos modelos
3. **Incluir dados de notificação**: Conquistas e mudanças de nível são incluídas nas respostas
4. **Preservar relacionamentos**: Dados relacionados (attendant, type, granter) são incluídos

## Cobertura de Requisitos

Os testes E2E cobrem os seguintes requisitos do sistema:

### Requirement 2.3: Integração com Sistema de Gamificação
- ✅ Verificação automática de conquistas após concessão
- ✅ Atualização de XP total do atendente
- ✅ Integração com sistema de níveis

### Requirement 4.4: Experiência do Atendente
- ✅ Notificação sobre XP recebido
- ✅ Informações sobre conquistas desbloqueadas
- ✅ Dados sobre mudança de nível

### Requirement 5.4: Integração com Gamificação Existente
- ✅ XP avulso contabilizado em rankings
- ✅ Conquistas verificadas com XP avulso
- ✅ Multiplicadores sazonais aplicados

## Cenários de Teste Cobertos

### Cenários de Sucesso
1. **Fluxo completo básico**: Criação → Concessão → Verificação
2. **Mudança de nível**: Concessão que resulta em level up
3. **Múltiplas conquistas**: Diferentes critérios de conquistas desbloqueadas
4. **Múltiplas concessões**: Acúmulo de XP ao longo do tempo
5. **Histórico grande**: Paginação com muitos registros

### Cenários de Integração
1. **Sistema de conquistas**: Verificação automática após concessão
2. **Sistema de níveis**: Cálculo de mudança de nível
3. **Sistema de auditoria**: Logs de todas as ações
4. **Sistema de autenticação**: Verificação de permissões

## Execução dos Testes

### Comando para executar apenas os testes E2E:
```bash
npm test -- --testPathPattern="xp-avulso-e2e.test.ts"
```

### Comando para executar todos os testes do XP Avulso:
```bash
npm test -- --testPathPattern="xp-avulso"
```

## Métricas de Cobertura

Os testes E2E garantem cobertura dos seguintes aspectos:

### Endpoints Testados
- ✅ `POST /api/gamification/xp-types` - Criação de tipos
- ✅ `POST /api/gamification/xp-grants` - Concessão de XP
- ✅ `GET /api/gamification/xp-grants` - Histórico geral
- ✅ `GET /api/gamification/xp-grants/attendant/[id]` - Histórico por atendente

### Funcionalidades Testadas
- ✅ Validação de dados de entrada
- ✅ Autenticação e autorização
- ✅ Concessão de XP com integração
- ✅ Verificação automática de conquistas
- ✅ Cálculo de mudança de nível
- ✅ Histórico e paginação
- ✅ Logs de auditoria
- ✅ Notificações para atendentes

### Cenários de Erro (implícitos nos mocks)
- ✅ Dados inválidos (validação Zod)
- ✅ Usuário não autorizado
- ✅ Rate limiting
- ✅ Erros de serviço

## Manutenção dos Testes

### Quando atualizar os testes:
1. **Mudanças na API**: Novos campos ou endpoints
2. **Mudanças nos schemas**: Validações adicionais
3. **Novas funcionalidades**: Tipos de conquistas, etc.
4. **Mudanças na estrutura de dados**: Modelos do banco

### Boas práticas:
1. **Manter mocks realistas**: Dados devem refletir a estrutura real
2. **Testar cenários completos**: Fluxos end-to-end reais
3. **Verificar integrações**: Chamadas entre serviços
4. **Documentar mudanças**: Atualizar este README quando necessário

## Conclusão

Os testes E2E implementados fornecem cobertura abrangente do sistema de XP avulso, garantindo que:

1. **O fluxo completo funciona**: Da criação à concessão
2. **As integrações funcionam**: Com conquistas, níveis e auditoria
3. **A experiência do usuário é testada**: Notificações e feedback
4. **A performance é verificada**: Paginação e grandes volumes
5. **A segurança é mantida**: Autenticação e autorização

Estes testes servem como documentação viva do comportamento esperado do sistema e garantem que mudanças futuras não quebrem funcionalidades existentes.