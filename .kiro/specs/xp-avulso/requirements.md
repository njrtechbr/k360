# Requirements Document

## Introduction

O sistema de XP avulso permitirá que administradores concedam pontos de experiência extras aos atendentes através de tipos pré-cadastrados de eventos, oferecendo flexibilidade para reconhecer ações e comportamentos específicos que não são capturados automaticamente pelas avaliações regulares. Este sistema complementa o sistema de gamificação existente, permitindo um controle mais granular sobre a distribuição de XP.

## Requirements

### Requirement 1

**User Story:** Como administrador, eu quero gerenciar tipos de XP avulso pré-cadastrados, para que eu possa ter opções padronizadas de reconhecimento com valores de pontos definidos.

#### Acceptance Criteria

1. WHEN um administrador acessa a interface de configuração THEN o sistema SHALL exibir uma lista de todos os tipos de XP avulso cadastrados
2. WHEN um administrador cria um novo tipo de XP avulso THEN o sistema SHALL validar que o nome é único e os pontos são positivos
3. WHEN um administrador edita um tipo existente THEN o sistema SHALL permitir alterar nome, descrição e pontos, mantendo o histórico de concessões anteriores
4. WHEN um administrador desativa um tipo THEN o sistema SHALL impedir novas concessões mas manter o histórico existente
5. IF um tipo de XP avulso tem concessões associadas THEN o sistema SHALL impedir a exclusão completa do tipo

### Requirement 2

**User Story:** Como administrador, eu quero conceder XP avulso para atendentes específicos, para que eu possa reconhecer comportamentos e ações excepcionais de forma imediata.

#### Acceptance Criteria

1. WHEN um administrador seleciona um atendente THEN o sistema SHALL exibir todos os tipos de XP avulso ativos disponíveis
2. WHEN um administrador concede XP avulso THEN o sistema SHALL registrar o evento com timestamp, tipo, atendente, valor e justificativa opcional
3. WHEN XP avulso é concedido THEN o sistema SHALL atualizar automaticamente o XP total do atendente na temporada atual
4. WHEN XP avulso é concedido THEN o sistema SHALL verificar automaticamente se novas conquistas foram desbloqueadas
5. IF não existe temporada ativa THEN o sistema SHALL impedir a concessão de XP avulso

### Requirement 3

**User Story:** Como supervisor, eu quero visualizar o histórico de XP avulso concedido, para que eu possa acompanhar e auditar as concessões realizadas.

#### Acceptance Criteria

1. WHEN um supervisor acessa o histórico THEN o sistema SHALL exibir todas as concessões com filtros por atendente, tipo, período e administrador
2. WHEN um supervisor visualiza uma concessão THEN o sistema SHALL mostrar todos os detalhes incluindo justificativa e impacto no XP total
3. WHEN um supervisor exporta o relatório THEN o sistema SHALL gerar arquivo CSV com todas as informações das concessões filtradas
4. IF existem muitas concessões THEN o sistema SHALL implementar paginação para melhor performance

### Requirement 4

**User Story:** Como atendente, eu quero visualizar o XP avulso que recebi, para que eu possa entender como contribuiu para meu progresso na gamificação.

#### Acceptance Criteria

1. WHEN um atendente acessa seu perfil THEN o sistema SHALL exibir o XP avulso recebido separado do XP de avaliações
2. WHEN um atendente visualiza seu histórico THEN o sistema SHALL mostrar cada concessão com tipo, data, pontos e justificativa
3. WHEN XP avulso é concedido THEN o sistema SHALL notificar o atendente sobre o reconhecimento recebido
4. IF o atendente desbloqueou conquistas pelo XP avulso THEN o sistema SHALL destacar essa informação

### Requirement 5

**User Story:** Como sistema, eu preciso integrar o XP avulso com a gamificação existente, para que os pontos sejam contabilizados corretamente em rankings e conquistas.

#### Acceptance Criteria

1. WHEN XP avulso é concedido THEN o sistema SHALL somar os pontos ao XP total do atendente na temporada atual
2. WHEN rankings são calculados THEN o sistema SHALL incluir XP avulso no cálculo total de cada atendente
3. WHEN conquistas são verificadas THEN o sistema SHALL considerar XP avulso nos critérios baseados em pontos totais
4. WHEN uma temporada encerra THEN o sistema SHALL incluir XP avulso nos relatórios finais e estatísticas
5. IF multiplicadores sazonais estão ativos THEN o sistema SHALL aplicá-los também ao XP avulso concedido

### Requirement 6

**User Story:** Como administrador, eu quero ter controles de segurança para XP avulso, para que o sistema não seja abusado e mantenha a integridade da gamificação.

#### Acceptance Criteria

1. WHEN XP avulso é concedido THEN o sistema SHALL registrar qual administrador realizou a ação
2. WHEN um administrador tenta conceder XP excessivo THEN o sistema SHALL implementar limites configuráveis por período
3. WHEN concessões suspeitas são detectadas THEN o sistema SHALL gerar alertas para superadministradores
4. IF um administrador é removido THEN o sistema SHALL manter o histórico de suas concessões para auditoria
5. WHEN relatórios são gerados THEN o sistema SHALL incluir métricas de uso por administrador