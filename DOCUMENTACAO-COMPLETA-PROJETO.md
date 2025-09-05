# 📋 Documentação Completa do Sistema de Pesquisa de Satisfação e Gamificação

## 📖 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Funcionalidades Principais](#funcionalidades-principais)
4. [Especificações e Desenvolvimento](#especificações-e-desenvolvimento)
5. [APIs e Endpoints](#apis-e-endpoints)
6. [Banco de Dados](#banco-de-dados)
7. [Interface do Usuário](#interface-do-usuário)
8. [Sistema de Gamificação](#sistema-de-gamificação)
9. [Segurança e Autenticação](#segurança-e-autenticação)
10. [Configuração e Deploy](#configuração-e-deploy)
11. [Testes](#testes)
12. [Guias de Desenvolvimento](#guias-de-desenvolvimento)

---

## 🎯 Visão Geral

### Descrição do Projeto
Sistema completo para gerenciar avaliações de atendentes com mecânicas de gamificação avançadas, desenvolvido para aumentar o engajamento e melhorar a qualidade do atendimento através de feedback estruturado e recompensas.

### Objetivos Principais
- **Coleta de Feedback**: Sistema de pesquisa de satisfação com notas de 1-5 estrelas
- **Gamificação**: Mecânicas de XP, níveis, conquistas e temporadas para engajamento
- **Gestão de RH**: Controle completo de atendentes e suas métricas de performance
- **Analytics**: Dashboard em tempo real com métricas e indicadores de performance
- **Auditoria**: Sistema completo de logs e rastreamento de ações

### Público-Alvo
- **Superadministradores**: Controle total do sistema
- **Administradores**: Gestão de atendentes e configurações
- **Supervisores**: Visualização de métricas e relatórios
- **Usuários**: Acesso limitado a funcionalidades básicas
- **Atendentes**: Visualização do próprio perfil e progresso

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

#### Frontend
- **Next.js 15.3.3** - Framework React com App Router
- **React 18** - Biblioteca de interface de usuário
- **TypeScript** - Linguagem principal para type safety
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Sistema de componentes baseado no Radix UI
- **Radix UI** - Biblioteca de componentes headless
- **Lucide React** - Biblioteca de ícones
- **Recharts** - Biblioteca para gráficos e visualizações

#### Backend
- **Next.js API Routes** - Endpoints de API
- **PostgreSQL** - Banco de dados principal
- **Prisma** - ORM e toolkit de banco de dados
- **NextAuth.js** - Sistema de autenticação
- **WebSockets** - Comunicação em tempo real

#### Ferramentas de Desenvolvimento
- **Jest** - Framework de testes com React Testing Library
- **ESLint** - Linting de código
- **TypeScript** - Verificação de tipos
- **Prisma Studio** - Interface visual para banco de dados

#### IA e Serviços Externos
- **Google AI Genkit** - Toolkit de integração com IA
- **Firebase** - Serviços de backend e hospedagem

### Estrutura de Pastas

```
src/
├── app/                    # Páginas e layouts (Next.js App Router)
│   ├── api/               # Endpoints de API
│   ├── dashboard/         # Páginas do dashboard
│   ├── login/            # Autenticação
│   └── survey/           # Pesquisa de satisfação
├── components/            # Componentes React reutilizáveis
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── dashboard/        # Componentes do dashboard
│   ├── gamification/     # Componentes de gamificação
│   └── rh/              # Componentes de RH
├── hooks/                # Hooks React customizados
├── lib/                  # Funções utilitárias e configurações
├── providers/            # Provedores de contexto React
├── services/             # Serviços de API e lógica de negócio
├── types/               # Definições de tipos TypeScript
└── middleware.ts        # Middleware do Next.js
```

### Padrões Arquiteturais

#### Separação de Responsabilidades
- **Páginas** (`app/`): Roteamento e layout
- **Componentes** (`components/`): Renderização de UI
- **Serviços** (`services/`): Lógica de negócio e API calls
- **Hooks** (`hooks/`): Estado e efeitos colaterais
- **Provedores** (`providers/`): Estado global

#### Convenções de Nomenclatura
- **Componentes React**: PascalCase (`UserProfile.tsx`)
- **Serviços e utilitários**: camelCase (`userService.ts`)
- **Páginas**: minúsculas com hífens (convenção App Router)
- **Tipos**: PascalCase com sufixo Type (`UserType`)

---

## ⚙️ Funcionalidades Principais

### 1. Sistema de Avaliações
- **Pesquisa de Satisfação**: Notas de 1-5 estrelas com comentários opcionais
- **Importação em Lote**: Upload de CSV com validação de dados
- **Histórico Completo**: Rastreamento de todas as avaliações por atendente
- **Métricas Automáticas**: Cálculo de médias, distribuição de notas e tendências

### 2. Gestão de Atendentes
- **Cadastro Completo**: Informações profissionais (sem dados sensíveis na visualização)
- **Perfil Gamificado**: XP, nível, conquistas e histórico de temporadas
- **Status de Atividade**: Controle de atendentes ativos/inativos
- **Importação de Dados**: Sistema de importação com mapeamento automático

### 3. Sistema de Gamificação Completo

#### XP (Pontos de Experiência)
- **XP por Avaliação**: Pontos baseados na nota recebida
- **XP Avulso**: Sistema de concessão manual de pontos extras
- **Multiplicadores Sazonais**: Bônus por temporada ativa
- **Histórico Detalhado**: Rastreamento de todos os eventos de XP

#### Níveis e Progressão
- **Sistema de Níveis**: Progressão baseada em XP acumulado
- **Títulos Personalizados**: Cada nível tem um título específico
- **Barra de Progresso**: Visualização do progresso para o próximo nível

#### Conquistas e Troféus
- **13 Conquistas Ativas**: Critérios variados de desbloqueio
- **Verificação Automática**: Conquistas desbloqueadas automaticamente
- **XP Bônus**: Pontos extras por conquistas desbloqueadas
- **Galeria Visual**: Interface clara para visualizar conquistas

#### Temporadas
- **Campanhas Temporais**: Períodos com multiplicadores específicos
- **Rankings Sazonais**: Competição entre atendentes por temporada
- **Histórico de Temporadas**: Acompanhamento de performance temporal
- **Vencedores**: Sistema de premiação por temporada

### 4. Dashboard em Tempo Real
- **Métricas Live**: Atualização automática via WebSockets
- **KPIs Principais**: XP total, usuários ativos, conquistas desbloqueadas
- **Gráficos Interativos**: Evolução de XP, distribuição de notas
- **Alertas**: Notificações para eventos importantes

### 5. Sistema de Usuários e Permissões
- **4 Níveis de Acesso**: SUPERADMIN, ADMIN, SUPERVISOR, USUARIO
- **Autenticação Segura**: NextAuth.js com sessões
- **Controle Granular**: Permissões específicas por funcionalidade
- **Auditoria**: Logs de todas as ações administrativas

---

## 📋 Especificações e Desenvolvimento

### Especificações Ativas

#### 1. XP Avulso (Implementado)
**Localização**: `.kiro/specs/xp-avulso/`

**Funcionalidades**:
- Gerenciamento de tipos de XP pré-cadastrados
- Concessão manual de XP para atendentes
- Histórico completo de concessões
- Integração com sistema de gamificação
- Controles de segurança e auditoria

**Status**: ✅ Completamente implementado

#### 2. Dashboard Tempo Real (Implementado)
**Localização**: `.kiro/specs/dashboard-tempo-real/`

**Funcionalidades**:
- Métricas de gamificação em tempo real
- Indicadores de satisfação atualizados
- Performance consolidada
- Interface responsiva
- Configuração personalizável
- Sistema de notificações

**Status**: ✅ Completamente implementado

### Metodologia de Desenvolvimento

#### Workflow de Especificações
1. **Requirements**: Definição de requisitos em formato EARS
2. **Design**: Arquitetura e componentes detalhados
3. **Tasks**: Lista de tarefas de implementação
4. **Execution**: Implementação incremental com testes

#### Padrões de Qualidade
- **Test-Driven Development**: Testes unitários obrigatórios
- **Code Review**: Revisão de código antes de merge
- **Documentação**: Documentação inline e externa
- **Type Safety**: TypeScript em todo o projeto

---

## 🔌 APIs e Endpoints

### Autenticação e Usuários

#### `/api/auth/*` (NextAuth.js)
- **POST** `/api/auth/signin` - Login de usuário
- **POST** `/api/auth/signout` - Logout de usuário
- **GET** `/api/auth/session` - Sessão atual

#### `/api/users`
- **GET** `/api/users` - Listar usuários (paginado)
- **POST** `/api/users` - Criar novo usuário
- **PUT** `/api/users/[id]` - Atualizar usuário
- **DELETE** `/api/users/[id]` - Remover usuário

### Atendentes e RH

#### `/api/attendants`
- **GET** `/api/attendants` - Listar atendentes
- **POST** `/api/attendants` - Criar atendente
- **GET** `/api/attendants/[id]` - Detalhes do atendente
- **PUT** `/api/attendants/[id]` - Atualizar atendente
- **DELETE** `/api/attendants/[id]` - Remover atendente

#### `/api/attendants/import`
- **POST** `/api/attendants/import` - Importar atendentes via CSV

### Avaliações

#### `/api/evaluations`
- **GET** `/api/evaluations` - Listar avaliações
- **POST** `/api/evaluations` - Criar avaliação
- **GET** `/api/evaluations/[id]` - Detalhes da avaliação

#### `/api/evaluations/import`
- **POST** `/api/evaluations/import` - Importar avaliações via CSV

### Gamificação

#### `/api/gamification/config`
- **GET** `/api/gamification/config` - Configurações de gamificação
- **PUT** `/api/gamification/config` - Atualizar configurações

#### `/api/gamification/seasons`
- **GET** `/api/gamification/seasons` - Listar temporadas
- **POST** `/api/gamification/seasons` - Criar temporada
- **PUT** `/api/gamification/seasons/[id]` - Atualizar temporada

#### `/api/gamification/achievements`
- **GET** `/api/gamification/achievements` - Listar conquistas
- **POST** `/api/gamification/achievements` - Criar conquista
- **POST** `/api/gamification/achievements/auto-process` - Processar conquistas automaticamente

#### `/api/gamification/xp-types`
- **GET** `/api/gamification/xp-types` - Listar tipos de XP
- **POST** `/api/gamification/xp-types` - Criar tipo de XP
- **PUT** `/api/gamification/xp-types/[id]` - Atualizar tipo de XP

#### `/api/gamification/xp-grants`
- **GET** `/api/gamification/xp-grants` - Histórico de concessões de XP
- **POST** `/api/gamification/xp-grants` - Conceder XP avulso
- **GET** `/api/gamification/xp-grants/attendant/[id]` - Concessões por atendente
- **GET** `/api/gamification/xp-grants/statistics` - Estatísticas de concessões

### Características das APIs

#### Segurança
- **Autenticação**: Middleware de autenticação em todas as rotas protegidas
- **Autorização**: Verificação de roles por endpoint
- **Rate Limiting**: Controle de taxa de requests
- **Validação**: Schemas Zod para validação de dados
- **Auditoria**: Logs de todas as operações sensíveis

#### Performance
- **Paginação**: Implementada em endpoints de listagem
- **Filtros**: Suporte a filtros avançados
- **Cache**: Estratégias de cache para dados frequentes
- **Otimização**: Queries otimizadas com Prisma

#### Padrões
- **REST**: Seguindo convenções REST
- **JSON**: Formato padrão de dados
- **HTTP Status**: Códigos de status apropriados
- **Error Handling**: Tratamento consistente de erros

---

## 🗄️ Banco de Dados

### Modelo de Dados Principal

#### Entidades Core

**User** - Usuários do sistema
```sql
- id: String (CUID)
- name: String
- email: String (unique)
- password: String?
- role: Role (SUPERADMIN, ADMIN, SUPERVISOR, USUARIO)
- createdAt: DateTime
- updatedAt: DateTime
```

**Attendant** - Atendentes avaliados
```sql
- id: String (CUID)
- name: String
- email: String (unique)
- funcao: String
- setor: String
- status: String
- dataAdmissao: DateTime
- telefone: String
- rg: String
- cpf: String (unique)
```

**Evaluation** - Avaliações de satisfação
```sql
- id: String (CUID)
- attendantId: String (FK)
- nota: Int (1-5)
- comentario: String
- data: DateTime
- xpGained: Float
```

#### Sistema de Gamificação

**XpEvent** - Eventos de XP
```sql
- id: String (CUID)
- attendantId: String
- points: Float
- basePoints: Float
- multiplier: Float
- reason: String
- date: DateTime
- type: String
- seasonId: String? (FK)
```

**XpTypeConfig** - Tipos de XP configuráveis
```sql
- id: String (CUID)
- name: String (unique)
- description: String
- points: Int
- active: Boolean
- category: String
- icon: String
- color: String
```

**XpGrant** - Concessões de XP avulso
```sql
- id: String (CUID)
- attendantId: String (FK)
- typeId: String (FK)
- points: Int
- justification: String?
- grantedBy: String (FK)
- grantedAt: DateTime
- xpEventId: String (FK unique)
```

**GamificationSeason** - Temporadas de gamificação
```sql
- id: String (CUID)
- name: String
- startDate: DateTime
- endDate: DateTime
- active: Boolean
- xpMultiplier: Float
```

**AchievementConfig** - Configurações de conquistas
```sql
- id: String
- title: String
- description: String
- xp: Int
- active: Boolean
- icon: String
- color: String
```

**UnlockedAchievement** - Conquistas desbloqueadas
```sql
- id: String (CUID)
- attendantId: String (FK)
- achievementId: String
- unlockedAt: DateTime
- xpGained: Float?
- seasonId: String? (FK)
```

#### Configurações

**GamificationConfig** - Configurações globais
```sql
- id: String (default: "main")
- ratingScore1: Int (default: -5)
- ratingScore2: Int (default: -2)
- ratingScore3: Int (default: 1)
- ratingScore4: Int (default: 3)
- ratingScore5: Int (default: 5)
- globalXpMultiplier: Float (default: 1)
```

**LevelTrackConfig** - Configuração de níveis
```sql
- level: Int (PK)
- title: String
- description: String
- active: Boolean
- icon: String
- color: String
```

### Relacionamentos Principais

- **User** → **Attendant** (1:N via imports)
- **Attendant** → **Evaluation** (1:N)
- **Attendant** → **XpEvent** (1:N via attendantId)
- **Attendant** → **UnlockedAchievement** (1:N)
- **Attendant** → **XpGrant** (1:N)
- **GamificationSeason** → **XpEvent** (1:N)
- **GamificationSeason** → **UnlockedAchievement** (1:N)
- **XpTypeConfig** → **XpGrant** (1:N)
- **XpGrant** → **XpEvent** (1:1)

### Índices e Performance

#### Índices Principais
- `User.email` (unique)
- `Attendant.email` (unique)
- `Attendant.cpf` (unique)
- `XpEvent.attendantId` + `XpEvent.date`
- `UnlockedAchievement.attendantId` + `UnlockedAchievement.achievementId`

#### Estratégias de Otimização
- **Paginação**: Implementada em queries de listagem
- **Eager Loading**: Relacionamentos carregados quando necessário
- **Índices Compostos**: Para queries frequentes
- **Soft Delete**: Para manter integridade histórica

---

## 🎨 Interface do Usuário

### Design System

#### Cores Principais
- **Primária**: Azul suave (#A0BFE0) - Confiabilidade e profissionalismo
- **Fundo**: Branco (#FAFAFA) - Interface limpa e organizada
- **Destaque**: Laranja vibrante (#FFB347) - Botões de ação e notificações
- **Fonte**: PT Sans (sans-serif) - Leitura clara e moderna

#### Componentes Base (shadcn/ui)
- **Button**: Botões com variantes (primary, secondary, destructive)
- **Card**: Containers para conteúdo
- **Dialog**: Modais e pop-ups
- **Form**: Formulários com validação
- **Table**: Tabelas de dados
- **Tabs**: Navegação por abas
- **Progress**: Barras de progresso
- **Badge**: Indicadores e tags
- **Avatar**: Imagens de perfil
- **Tooltip**: Informações contextuais

### Páginas Principais

#### Dashboard (`/dashboard`)
- **Visão Geral**: Métricas principais e gráficos
- **Tempo Real**: Dashboard com atualizações automáticas
- **Navegação**: Sidebar com módulos organizados

#### Gamificação (`/dashboard/gamificacao`)
- **Visão Geral**: Estatísticas de gamificação
- **Conceder XP**: Interface para concessão de XP avulso
- **Histórico XP**: Histórico completo de eventos XP
- **Configurações**: Gestão de tipos XP, conquistas, temporadas
- **Histórico Temporadas**: Acompanhamento de temporadas passadas

#### RH (`/dashboard/rh`)
- **Atendentes**: Listagem e gestão de atendentes
- **Perfil do Atendente**: Visualização completa com gamificação
- **Importação**: Upload de dados via CSV

#### Usuários (`/dashboard/usuarios`)
- **Gestão de Usuários**: CRUD completo de usuários
- **Permissões**: Controle de roles e acessos

#### Pesquisa (`/survey`)
- **Formulário de Avaliação**: Interface pública para avaliações
- **QR Code**: Geração de códigos para acesso rápido

### Características da Interface

#### Responsividade
- **Mobile First**: Design otimizado para dispositivos móveis
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Grid Adaptativo**: Layouts que se ajustam ao tamanho da tela
- **Touch Friendly**: Elementos adequados para toque

#### Acessibilidade
- **ARIA Labels**: Rótulos para leitores de tela
- **Contraste**: Cores com contraste adequado
- **Navegação por Teclado**: Suporte completo
- **Focus Indicators**: Indicadores visuais de foco

#### Interatividade
- **Animações Sutis**: Transições suaves
- **Loading States**: Indicadores de carregamento
- **Error States**: Tratamento visual de erros
- **Success Feedback**: Confirmações visuais

---

## 🎮 Sistema de Gamificação

### Mecânicas Implementadas

#### 1. Pontos de Experiência (XP)

**XP por Avaliação**
- Nota 1: -5 XP
- Nota 2: -2 XP  
- Nota 3: +1 XP
- Nota 4: +3 XP
- Nota 5: +5 XP

**XP Avulso**
- Tipos configuráveis de XP
- Concessão manual por administradores
- Justificativas obrigatórias
- Limites diários por administrador

**Multiplicadores Sazonais**
- Aplicados automaticamente por temporada ativa
- Configuráveis por temporada
- Afetam tanto XP de avaliações quanto XP avulso

#### 2. Sistema de Níveis

**Cálculo de Níveis**
- Baseado em XP total acumulado
- Fórmula progressiva para próximo nível
- Títulos personalizados por nível
- Barra de progresso visual

**Níveis Exemplo**
- Nível 1: Iniciante (0-100 XP)
- Nível 2: Aprendiz (101-250 XP)
- Nível 3: Praticante (251-500 XP)
- Nível 4: Experiente (501-1000 XP)
- Nível 5: Especialista (1001-2000 XP)

#### 3. Sistema de Conquistas

**13 Conquistas Ativas**

**Progressão de Avaliações**
- 🌟 **Primeira Impressão** (1 avaliação) - +50 XP
- 🎖️ **Veterano** (10 avaliações) - +100 XP
- 🏅 **Experiente** (50 avaliações) - +250 XP
- 🏆 **Centurião** (100 avaliações) - +500 XP

**Progressão de XP**
- ⭐ **Primeiros Passos** (100 XP) - +25 XP
- 💎 **Milionário de XP** (1.000 XP) - +100 XP
- 👑 **Lenda Viva** (5.000 XP) - +250 XP
- 🔥 **Mestre Supremo** (10.000 XP) - +500 XP

**Conquistas de Qualidade**
- ✨ **Sequência Dourada** (5 cinco estrelas seguidas) - +200 XP
- 🌟 **Perfeição Absoluta** (10 cinco estrelas seguidas) - +500 XP
- 📈 **Excelência Consistente** (média 4.5+ com 50+ avaliações) - +300 XP

**Conquistas Especiais**
- 🥇 **Campeão do Mês** (1º lugar mensal) - +1000 XP
- 👑 **Vencedor da Temporada** (1º lugar temporada) - +2000 XP

**Verificação Automática**
- Conquistas verificadas após cada avaliação
- XP bônus adicionado automaticamente
- Notificações de novas conquistas
- Histórico completo mantido

#### 4. Temporadas

**Funcionalidades**
- Períodos definidos com início e fim
- Multiplicadores específicos por temporada
- Rankings isolados por temporada
- Histórico de performance temporal
- Sistema de premiação

**Gestão**
- Criação e edição de temporadas
- Ativação/desativação
- Configuração de multiplicadores
- Relatórios de encerramento

### Algoritmos de Gamificação

#### Cálculo de XP Total
```typescript
xpTotal = (xpAvaliacoes + xpConquistas + xpAvulso) * multiplicadorSazonal
```

#### Verificação de Conquistas
```typescript
// Executado automaticamente após cada avaliação
1. Buscar dados do atendente na temporada atual
2. Verificar critérios de cada conquista
3. Desbloquear conquistas elegíveis
4. Criar eventos XP para conquistas
5. Atualizar XP total do atendente
```

#### Cálculo de Nível
```typescript
// Fórmula progressiva baseada em XP
nivel = Math.floor(Math.sqrt(xpTotal / 100)) + 1
xpProximoNivel = (nivel * nivel * 100) - xpTotal
```

### Estatísticas do Sistema

**Dados Atuais** (baseado nos documentos)
- **35 atendentes** processados
- **146 conquistas** desbloqueadas
- **Taxa de desbloqueio**: 32.1%
- **XP bônus total**: ~21.000 XP distribuído
- **2889+ eventos XP** registrados

---

## 🔒 Segurança e Autenticação

### Sistema de Autenticação

#### NextAuth.js
- **Provedores**: Credenciais (email/senha)
- **Sessões**: JWT com dados do usuário
- **Middleware**: Proteção automática de rotas
- **Callbacks**: Customização de sessão e JWT

#### Níveis de Acesso

**SUPERADMIN**
- Acesso total ao sistema
- Gestão de usuários e permissões
- Configurações globais
- Auditoria completa

**ADMIN**
- Gestão de atendentes
- Configurações de gamificação
- Concessão de XP avulso
- Relatórios e métricas

**SUPERVISOR**
- Visualização de métricas
- Relatórios de performance
- Histórico de avaliações
- Dashboard em tempo real

**USUARIO**
- Acesso limitado
- Funcionalidades básicas
- Visualização própria

### Middleware de Segurança

#### Autenticação (`auth-middleware.ts`)
```typescript
- Verificação de sessão válida
- Validação de roles por endpoint
- Redirecionamento para login
- Headers de segurança
```

#### Rate Limiting (`rate-limit.ts`)
```typescript
- Limites por IP e endpoint
- Configuração diferenciada por tipo de operação
- Headers informativos sobre limites
- Bloqueio temporário em caso de abuso
```

### Controles de Segurança

#### Validação de Dados
- **Schemas Zod**: Validação rigorosa de entrada
- **Sanitização**: Limpeza de dados de entrada
- **Type Safety**: TypeScript em todo o projeto
- **Validação de Negócio**: Regras específicas por operação

#### Auditoria e Logs
- **Logs de Ações**: Todas as operações sensíveis
- **Rastreamento**: IP, User-Agent, timestamp
- **Histórico**: Manutenção de trilha de auditoria
- **Alertas**: Notificações para ações suspeitas

#### Proteção de Dados
- **Dados Sensíveis**: RG, CPF removidos da visualização
- **Criptografia**: Senhas hasheadas com bcrypt
- **Sessões Seguras**: Tokens JWT com expiração
- **HTTPS**: Comunicação criptografada

### Limites e Controles

#### XP Avulso
- **50 concessões** por administrador por dia
- **1000 pontos** máximo por administrador por dia
- **Justificativa obrigatória** para concessões
- **Logs completos** de todas as ações

#### APIs
- **Rate Limiting**: 10-30 requests por minuto por IP
- **Paginação**: Máximo 100 itens por página
- **Filtros**: Validação de parâmetros de filtro
- **Timeouts**: Limites de tempo para operações

---

## ⚙️ Configuração e Deploy

### Variáveis de Ambiente

#### Essenciais
```env
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Firebase (opcional)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"
```

### Comandos de Desenvolvimento

#### Desenvolvimento
```bash
npm run dev              # Servidor de desenvolvimento
npm run genkit:dev       # Desenvolvimento Genkit AI
npm run genkit:watch     # Genkit com observação de arquivos
```

#### Banco de Dados
```bash
npm run postinstall      # Gerar cliente Prisma
npm run db:seed          # Popular banco com dados iniciais
npx prisma studio        # Interface visual do banco
npx prisma migrate dev   # Executar migrações
```

#### Build e Deploy
```bash
npm run build            # Build para produção
npm run start            # Servidor de produção
npm run lint             # Executar ESLint
npm run typecheck        # Verificação de tipos
```

### Configurações do Sistema

#### Next.js (`next.config.ts`)
- **TypeScript**: Erros ignorados durante build
- **ESLint**: Erros ignorados durante build
- **Imagens**: Suporte a domínios remotos
- **Otimizações**: Configurações de performance

#### Tailwind CSS (`tailwind.config.ts`)
- **Fonte**: PT Sans como padrão
- **Cores**: Sistema de cores customizado
- **Componentes**: Integração com shadcn/ui
- **Animações**: Animações customizadas

#### Prisma (`prisma/schema.prisma`)
- **Provider**: PostgreSQL
- **Geração**: Cliente auto-gerado
- **Migrações**: Controle de versão do schema
- **Seed**: Dados iniciais automatizados

### Deploy em Produção

#### Requisitos
- **Node.js**: Versão 18+
- **PostgreSQL**: Versão 12+
- **Memória**: Mínimo 512MB RAM
- **Storage**: Espaço para uploads e logs

#### Checklist de Deploy
1. ✅ Configurar variáveis de ambiente
2. ✅ Executar migrações do banco
3. ✅ Popular dados iniciais (seed)
4. ✅ Configurar HTTPS
5. ✅ Configurar backup do banco
6. ✅ Monitoramento e logs
7. ✅ Testes de funcionalidade

---

## 🧪 Testes

### Framework de Testes

#### Jest + React Testing Library
```bash
npm test                 # Executar testes
npm run test:watch       # Testes em modo observação
npm run test:coverage    # Relatório de cobertura
npm run test:ci          # Testes para CI/CD
```

### Estrutura de Testes

#### Testes Unitários
```
src/
├── components/
│   └── __tests__/           # Testes de componentes
├── services/
│   └── __tests__/           # Testes de serviços
├── hooks/
│   └── __tests__/           # Testes de hooks
└── app/api/
    └── **/__tests__/        # Testes de APIs
```

#### Configuração (`jest.config.js`)
- **Ambiente**: jsdom para testes de componentes
- **Setup**: Configuração automática do Testing Library
- **Polyfills**: Suporte a APIs modernas
- **Coverage**: Relatórios de cobertura detalhados

### Tipos de Testes Implementados

#### Componentes React
- **Renderização**: Testes de renderização correta
- **Interação**: Testes de eventos e interações
- **Props**: Validação de propriedades
- **Estados**: Testes de mudanças de estado

#### Serviços e APIs
- **Lógica de Negócio**: Testes de regras de negócio
- **Integração**: Testes de integração com banco
- **Validação**: Testes de validação de dados
- **Erros**: Testes de tratamento de erros

#### Hooks Customizados
- **Estado**: Testes de gerenciamento de estado
- **Efeitos**: Testes de efeitos colaterais
- **Performance**: Testes de otimização
- **Cleanup**: Testes de limpeza de recursos

### Exemplos de Testes

#### Teste de Componente
```typescript
// XpGrantInterface.test.tsx
describe('XpGrantInterface', () => {
  it('should render grant form correctly', () => {
    render(<XpGrantInterface />);
    expect(screen.getByText('Conceder XP')).toBeInTheDocument();
  });
});
```

#### Teste de Serviço
```typescript
// xpAvulsoService.test.ts
describe('XpAvulsoService', () => {
  it('should grant XP successfully', async () => {
    const result = await XpAvulsoService.grantXp(grantData);
    expect(result.success).toBe(true);
  });
});
```

#### Teste de API
```typescript
// xp-grants.test.ts
describe('/api/gamification/xp-grants', () => {
  it('should create XP grant with valid data', async () => {
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

---

## 📚 Guias de Desenvolvimento

### Configuração do Ambiente

#### Pré-requisitos
1. **Node.js** 18+ instalado
2. **PostgreSQL** configurado
3. **Git** para controle de versão
4. **VS Code** (recomendado) com extensões:
   - TypeScript
   - Prisma
   - Tailwind CSS
   - Jest

#### Setup Inicial
```bash
# 1. Clonar repositório
git clone <repository-url>
cd projeto

# 2. Instalar dependências
npm install

# 3. Configurar banco de dados
cp .env.example .env
# Editar .env com suas configurações

# 4. Executar migrações
npx prisma migrate dev

# 5. Popular dados iniciais
npm run db:seed

# 6. Iniciar desenvolvimento
npm run dev
```

### Padrões de Desenvolvimento

#### Estrutura de Arquivos
```typescript
// Componente React
export default function ComponentName() {
  return <div>Content</div>;
}

// Serviço
export class ServiceName {
  static async methodName() {
    // Implementation
  }
}

// Hook customizado
export function useCustomHook() {
  // Hook logic
  return { data, loading, error };
}
```

#### Convenções de Código
- **Imports**: Usar alias `@/` para imports src
- **Tipos**: Definir interfaces TypeScript
- **Componentes**: PascalCase para nomes
- **Funções**: camelCase para nomes
- **Constantes**: UPPER_CASE para constantes

#### Git Workflow
```bash
# 1. Criar branch para feature
git checkout -b feature/nome-da-feature

# 2. Fazer commits descritivos
git commit -m "feat: adicionar funcionalidade X"

# 3. Push e criar PR
git push origin feature/nome-da-feature

# 4. Code review e merge
```

### Adicionando Novas Funcionalidades

#### 1. Criar Especificação
```bash
# Criar pasta da spec
mkdir .kiro/specs/nova-funcionalidade

# Criar arquivos de spec
touch .kiro/specs/nova-funcionalidade/requirements.md
touch .kiro/specs/nova-funcionalidade/design.md
touch .kiro/specs/nova-funcionalidade/tasks.md
```

#### 2. Implementar Backend
```typescript
// 1. Atualizar schema Prisma se necessário
// 2. Criar serviço
// 3. Criar API endpoints
// 4. Adicionar testes
// 5. Atualizar tipos TypeScript
```

#### 3. Implementar Frontend
```typescript
// 1. Criar componentes
// 2. Criar hooks se necessário
// 3. Adicionar páginas
// 4. Integrar com APIs
// 5. Adicionar testes
```

#### 4. Documentar
```markdown
# Atualizar documentação
- README.md
- Comentários no código
- Testes de exemplo
- Guias de uso
```

### Debugging e Troubleshooting

#### Logs do Sistema
```typescript
// Usar console.log para desenvolvimento
console.log('Debug info:', data);

// Usar logs estruturados para produção
logger.info('Operation completed', { userId, action });
```

#### Ferramentas de Debug
- **Prisma Studio**: Interface visual do banco
- **Next.js DevTools**: Debug de páginas e APIs
- **React DevTools**: Debug de componentes
- **Network Tab**: Debug de requests

#### Problemas Comuns

**Erro de Autenticação**
```bash
# Verificar variáveis de ambiente
echo $NEXTAUTH_SECRET

# Limpar sessões
rm -rf .next
npm run dev
```

**Erro de Banco de Dados**
```bash
# Resetar banco
npx prisma migrate reset

# Regenerar cliente
npx prisma generate
```

**Erro de Build**
```bash
# Verificar tipos
npm run typecheck

# Limpar cache
rm -rf .next
npm run build
```

### Contribuindo para o Projeto

#### Checklist de Contribuição
- [ ] Código segue padrões estabelecidos
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Types TypeScript definidos
- [ ] Sem erros de lint/typecheck
- [ ] Funcionalidade testada manualmente

#### Code Review
- **Funcionalidade**: Código faz o que deveria fazer?
- **Qualidade**: Código é limpo e legível?
- **Performance**: Não há problemas de performance?
- **Segurança**: Não há vulnerabilidades?
- **Testes**: Cobertura adequada de testes?

---

## 📈 Métricas e Monitoramento

### KPIs do Sistema

#### Gamificação
- **Taxa de Engajamento**: % de atendentes ativos na gamificação
- **XP Médio por Atendente**: Distribuição de pontos
- **Conquistas Desbloqueadas**: Taxa de desbloqueio por tipo
- **Progressão de Níveis**: Distribuição de atendentes por nível

#### Satisfação
- **Nota Média Geral**: Média de todas as avaliações
- **Distribuição de Notas**: Percentual por nota (1-5)
- **Tendência Temporal**: Evolução da satisfação
- **Atendentes Top**: Ranking por performance

#### Sistema
- **Usuários Ativos**: Logins únicos por período
- **Avaliações por Dia**: Volume de feedback
- **Tempo de Resposta**: Performance das APIs
- **Erros**: Taxa de erro por endpoint

### Relatórios Disponíveis

#### Dashboard Executivo
- Visão geral de KPIs
- Gráficos de tendência
- Alertas de performance
- Comparativos temporais

#### Relatório de Gamificação
- Estatísticas de XP por atendente
- Conquistas desbloqueadas
- Rankings por temporada
- Análise de engajamento

#### Relatório de Satisfação
- Médias por atendente/setor
- Comentários negativos
- Tendências de melhoria
- Análise de feedback

---

## 🔮 Roadmap e Melhorias Futuras

### Funcionalidades Planejadas

#### Curto Prazo (1-3 meses)
- **Notificações Push**: Alertas em tempo real
- **Relatórios Avançados**: Exportação em PDF/Excel
- **API Mobile**: Endpoints otimizados para mobile
- **Conquistas IA**: Análise de comentários com IA

#### Médio Prazo (3-6 meses)
- **App Mobile**: Aplicativo nativo
- **Integração WhatsApp**: Pesquisas via WhatsApp
- **Analytics Avançado**: Machine Learning para insights
- **Multi-tenancy**: Suporte a múltiplas empresas

#### Longo Prazo (6+ meses)
- **Gamificação Social**: Interações entre atendentes
- **Realidade Aumentada**: Visualização de conquistas em AR
- **Blockchain**: Certificados de conquistas em blockchain
- **IA Preditiva**: Previsão de performance

### Melhorias Técnicas

#### Performance
- **Cache Redis**: Cache distribuído
- **CDN**: Distribuição de conteúdo
- **Lazy Loading**: Carregamento sob demanda
- **Otimização de Queries**: Melhoria de performance do banco

#### Escalabilidade
- **Microserviços**: Arquitetura distribuída
- **Load Balancer**: Distribuição de carga
- **Auto Scaling**: Escalabilidade automática
- **Monitoring**: Monitoramento avançado

#### Segurança
- **2FA**: Autenticação de dois fatores
- **Audit Trail**: Trilha de auditoria completa
- **Encryption**: Criptografia de dados sensíveis
- **Compliance**: Adequação a LGPD/GDPR

---

## 📞 Suporte e Contato

### Documentação Adicional
- **README.md**: Guia de início rápido
- **Specs**: Documentação detalhada de funcionalidades
- **API Docs**: Documentação de endpoints
- **Changelog**: Histórico de versões

### Recursos de Desenvolvimento
- **Prisma Studio**: Interface visual do banco de dados
- **Storybook**: Catálogo de componentes (futuro)
- **Swagger**: Documentação interativa de APIs (futuro)
- **Monitoring**: Dashboard de monitoramento (futuro)

### Estrutura de Suporte
- **Issues**: Reportar bugs e solicitar funcionalidades
- **Discussions**: Discussões sobre arquitetura e melhorias
- **Wiki**: Documentação colaborativa
- **Code Review**: Processo de revisão de código

---

**Última atualização**: Janeiro 2025  
**Versão do documento**: 1.0  
**Status do projeto**: Em desenvolvimento ativo

---

*Esta documentação é um documento vivo e deve ser atualizada conforme o projeto evolui. Contribuições e melhorias são sempre bem-vindas.*