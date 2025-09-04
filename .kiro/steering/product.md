---
inclusion: always
---

# Sistema de Pesquisa de Satisfação e Gamificação

Sistema para gerenciar avaliações de atendentes com mecânicas de gamificação para engajamento.

## Modelos de Domínio

### Core Entities
- **User**: Sistema de autenticação com roles (SUPERADMIN, ADMIN, SUPERVISOR, USUARIO)
- **Attendant**: Funcionários sendo avaliados, vinculados a usuários
- **Evaluation**: Avaliações com notas 1-5 e comentários opcionais
- **XpEvent**: Eventos que geram pontos de experiência
- **GamificationSeason**: Campanhas temporais com multiplicadores
- **AchievementConfig**: Configurações de conquistas desbloqueáveis

### Relacionamentos
- Users podem ter múltiplos Attendants
- Evaluations pertencem a um Attendant específico
- XpEvents são gerados por Evaluations e outras ações
- Achievements são desbloqueadas baseadas em critérios configuráveis

## Regras de Negócio

### Avaliações
- Notas obrigatórias de 1-5 (escala Likert)
- Comentários opcionais para contexto adicional
- Cada avaliação gera XpEvent automaticamente
- Validação de integridade de dados obrigatória

### Gamificação
- XP base por avaliação: configurável por temporada
- Multiplicadores sazonais aplicados automaticamente
- Conquistas verificadas em tempo real após ações
- Níveis calculados baseados em XP acumulado

### Controle de Acesso
- SUPERADMIN: Acesso total ao sistema
- ADMIN: Gerenciamento de atendentes e configurações
- SUPERVISOR: Visualização de métricas e relatórios
- USUARIO: Acesso limitado a funcionalidades básicas

## Padrões Arquiteturais

### Serviços
- Separação clara entre services (lógica de negócio) e components (UI)
- Services retornam dados tipados com tratamento de erro
- Hooks customizados para estado e efeitos colaterais

### Importação/Exportação
- Suporte a CSV para dados de atendentes e avaliações
- Validação de integridade antes de importação
- Scripts de verificação e correção de dados

### Gamificação
- Sistema de eventos para tracking de ações
- Verificação automática de conquistas
- Cálculos de XP e níveis em tempo real

## Convenções de Desenvolvimento
- Interface em português brasileiro
- Validação de dados obrigatória em todas as operações
- Logs detalhados para auditoria de gamificação
- Testes unitários para lógica de negócio crítica