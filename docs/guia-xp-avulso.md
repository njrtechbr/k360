# Guia de Uso - Sistema de XP Avulso

## Visão Geral

O sistema de XP avulso permite que administradores concedam pontos de experiência extras aos atendentes através de tipos pré-cadastrados, oferecendo flexibilidade para reconhecer ações e comportamentos específicos que não são capturados automaticamente pelas avaliações regulares.

## Acesso ao Sistema

### Permissões Necessárias
- **ADMIN** ou **SUPERADMIN**: Acesso completo ao sistema
- **SUPERVISOR**: Apenas visualização de histórico
- **USUARIO**: Sem acesso às funcionalidades administrativas

### Navegação
- **Configuração de Tipos**: `/dashboard/gamificacao/configuracoes/tipos-xp`
- **Concessão de XP**: `/dashboard/gamificacao/conceder-xp`
- **Histórico**: `/dashboard/gamificacao/historico-xp`

## Gerenciamento de Tipos de XP

### Tipos Padrão Disponíveis

1. **Excelência no Atendimento** (10 pontos)
   - Reconhecimento por atendimento excepcional ao cliente
   - Categoria: Atendimento
   - Ícone: ⭐ (star)

2. **Iniciativa** (8 pontos)
   - Reconhecimento por tomar iniciativa em situações importantes
   - Categoria: Liderança
   - Ícone: 💡 (lightbulb)

3. **Trabalho em Equipe** (6 pontos)
   - Reconhecimento por colaboração excepcional com colegas
   - Categoria: Colaboração
   - Ícone: 👥 (users)

4. **Melhoria de Processo** (12 pontos)
   - Reconhecimento por sugerir ou implementar melhorias
   - Categoria: Inovação
   - Ícone: ⚙️ (settings)

5. **Pontualidade Exemplar** (5 pontos)
   - Reconhecimento por pontualidade consistente
   - Categoria: Disciplina
   - Ícone: 🕐 (clock)

6. **Resolução de Problemas** (15 pontos)
   - Reconhecimento por resolver problemas complexos
   - Categoria: Competência
   - Ícone: 🧩 (puzzle)

### Criando Novos Tipos

1. Acesse **Configurações > Tipos de XP**
2. Clique em **"Novo Tipo"**
3. Preencha os campos obrigatórios:
   - **Nome**: Identificação única do tipo
   - **Descrição**: Explicação detalhada do critério
   - **Pontos**: Valor de XP a ser concedido (1-50 recomendado)
   - **Categoria**: Agrupamento lógico
   - **Ícone**: Representação visual
   - **Cor**: Código hexadecimal para identificação

### Editando Tipos Existentes

1. Na lista de tipos, clique no ícone de edição
2. Modifique os campos desejados
3. **Importante**: Alterações não afetam concessões já realizadas

### Desativando Tipos

1. Use o toggle "Ativo/Inativo" na lista
2. Tipos inativos não aparecem na interface de concessão
3. Histórico de concessões é preservado

## Concedendo XP Avulso

### Processo de Concessão

1. Acesse **Gamificação > Conceder XP**
2. **Selecione o Atendente**:
   - Use a busca por nome ou ID
   - Visualize informações básicas do atendente
3. **Escolha o Tipo de XP**:
   - Veja a lista de tipos ativos
   - Preview dos pontos que serão concedidos
4. **Adicione Justificativa** (opcional):
   - Explique o motivo da concessão
   - Recomendado para auditoria
5. **Confirme a Concessão**:
   - Revise os dados antes de confirmar
   - Ação não pode ser desfeita

### Validações Automáticas

- **Temporada Ativa**: Só é possível conceder XP durante temporadas ativas
- **Atendente Válido**: Verificação de existência e status ativo
- **Tipo Ativo**: Apenas tipos ativos podem ser utilizados
- **Limites**: Sistema pode implementar limites por período (configurável)

### Efeitos da Concessão

Após a concessão, o sistema automaticamente:
1. **Atualiza XP Total**: Soma os pontos ao XP do atendente na temporada atual
2. **Verifica Conquistas**: Checa se novas conquistas foram desbloqueadas
3. **Atualiza Rankings**: Recalcula posição nos rankings
4. **Registra Auditoria**: Salva log completo da ação
5. **Notifica Atendente**: Informa sobre o reconhecimento recebido

## Histórico e Auditoria

### Visualizando Histórico

1. Acesse **Gamificação > Histórico XP**
2. Use os filtros disponíveis:
   - **Período**: Data inicial e final
   - **Atendente**: Filtrar por pessoa específica
   - **Tipo de XP**: Filtrar por categoria
   - **Administrador**: Quem concedeu o XP

### Exportando Relatórios

1. Configure os filtros desejados
2. Clique em **"Exportar CSV"**
3. Arquivo contém todas as informações das concessões

### Informações do Histórico

Cada registro mostra:
- **Data e Hora**: Timestamp da concessão
- **Atendente**: Nome e ID do beneficiário
- **Tipo**: Nome e pontos do tipo de XP
- **Administrador**: Quem concedeu
- **Justificativa**: Motivo informado (se houver)
- **Impacto**: XP total antes e depois da concessão

## Integração com Gamificação

### Impacto nos Rankings

- XP avulso é somado ao XP de avaliações
- Conta para classificação nas temporadas
- Multiplicadores sazonais se aplicam

### Desbloqueio de Conquistas

- Sistema verifica automaticamente após cada concessão
- Conquistas baseadas em XP total incluem XP avulso
- Notificações são enviadas para conquistas desbloqueadas

### Perfil do Atendente

No perfil, o atendente visualiza:
- **XP Total**: Separado por fonte (avaliações vs. avulso)
- **Histórico**: Lista de XP avulso recebido
- **Conquistas**: Destacando as desbloqueadas via XP avulso

## Boas Práticas

### Para Administradores

1. **Use Justificativas**: Sempre explique o motivo da concessão
2. **Seja Consistente**: Aplique critérios uniformes para situações similares
3. **Monitore Uso**: Acompanhe relatórios para evitar desequilíbrios
4. **Comunique Critérios**: Deixe claro para a equipe os critérios de reconhecimento

### Critérios de Concessão

- **Excelência no Atendimento**: Feedback excepcional de clientes
- **Iniciativa**: Ações proativas que beneficiam a equipe/empresa
- **Trabalho em Equipe**: Colaboração que vai além das responsabilidades
- **Melhoria de Processo**: Sugestões implementadas com impacto positivo
- **Pontualidade Exemplar**: Consistência excepcional em horários
- **Resolução de Problemas**: Soluções criativas para desafios complexos

### Frequência Recomendada

- **Não exagere**: XP avulso deve ser especial, não rotineiro
- **Seja justo**: Distribua reconhecimento de forma equilibrada
- **Documente padrões**: Mantenha critérios claros e transparentes

## Segurança e Controles

### Auditoria Completa

- Todos os registros são permanentes
- Logs incluem quem, quando, quanto e por quê
- Relatórios permitem análise de padrões de uso

### Controles de Acesso

- Apenas ADMIN e SUPERADMIN podem conceder XP
- Histórico é visível para SUPERVISOR+
- Atendentes veem apenas seu próprio histórico

### Limites e Validações

- Sistema pode implementar limites por período
- Validações impedem concessões inválidas
- Alertas para uso suspeito (configurável)

## Troubleshooting

### Problemas Comuns

**"Não consigo conceder XP"**
- Verifique se há temporada ativa
- Confirme se o tipo de XP está ativo
- Verifique suas permissões de usuário

**"Atendente não aparece na busca"**
- Confirme se o atendente está ativo
- Verifique a grafia do nome
- Tente buscar por ID

**"XP não apareceu no perfil"**
- Aguarde alguns segundos para atualização
- Recarregue a página do perfil
- Verifique se a concessão foi confirmada

### Suporte

Para problemas técnicos ou dúvidas sobre critérios:
1. Consulte este guia primeiro
2. Verifique com outros administradores
3. Entre em contato com o suporte técnico

## Limites e Controles de Segurança

### Limites por Administrador
- **50 concessões** por dia por administrador
- **1000 pontos** máximo por dia por administrador
- **Rate limiting**: 10 concessões por minuto
- **Auditoria completa**: Todos os logs são permanentes

### Validações Automáticas
- Verificação de temporada ativa
- Validação de atendente ativo
- Confirmação de tipo de XP ativo
- Limites de pontos por tipo (1-50 recomendado)

### Alertas de Segurança
- Concessões suspeitas (muito XP em pouco tempo)
- Tentativas de concessão fora dos limites
- Uso de tipos inativos
- Falhas de autenticação

## Relatórios e Estatísticas

### Métricas Disponíveis
- **Total de concessões** por período
- **Distribuição por tipo** de XP
- **Uso por administrador** com rankings
- **Impacto nas conquistas** desbloqueadas
- **Evolução temporal** do uso do sistema

### Exportação de Dados
- **CSV completo** com todas as concessões
- **Filtros avançados** para relatórios específicos
- **Dados inclusos**: Data, atendente, tipo, pontos, administrador, justificativa
- **Formato padronizado** para análise externa

## Integração com Outros Sistemas

### Sistema de Gamificação
- XP avulso soma ao XP total do atendente
- Multiplicadores sazonais se aplicam automaticamente
- Conquistas são verificadas após cada concessão
- Rankings incluem XP avulso no cálculo

### Sistema de Notificações
- Atendentes recebem notificação automática
- Administradores recebem confirmação da concessão
- Notificações especiais para conquistas desbloqueadas
- Histórico de notificações no perfil

### Dashboard em Tempo Real
- Métricas de XP avulso atualizadas automaticamente
- Gráficos de evolução de concessões
- Indicadores de uso por administrador
- Alertas para atividades suspeitas

## Changelog

### Versão 1.2 (Atual)
- **Estatísticas diárias**: Endpoint para métricas de uso
- **Melhorias de segurança**: Rate limiting aprimorado
- **Notificações automáticas**: Sistema completo implementado
- **Dashboard integrado**: Métricas em tempo real

### Versão 1.1
- **Filtros avançados**: Histórico com múltiplos filtros
- **Exportação CSV**: Relatórios detalhados
- **Validações aprimoradas**: Controles de segurança
- **Interface melhorada**: UX otimizada

### Versão 1.0
- Implementação inicial do sistema de XP avulso
- 6 tipos padrão de reconhecimento
- Interface completa de gerenciamento
- Integração total com sistema de gamificação