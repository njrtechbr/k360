# 📋 Documentação Completa do Projeto

## Sistema de Pesquisa de Satisfação e Gamificação

---

## 🎯 1. Visão Geral do Sistema

### Descrição do Propósito
O **Sistema de Pesquisa de Satisfação e Gamificação** é uma plataforma web desenvolvida para gerenciar avaliações de atendentes com mecânicas de gamificação para engajamento. O sistema permite coletar feedback de clientes, processar avaliações com análise de sentimento por IA, e motivar funcionários através de um sistema completo de pontos, conquistas e rankings.

### Principais Funcionalidades
- **Gestão de Atendentes**: Cadastro e gerenciamento de funcionários
- **Pesquisa de Satisfação**: Coleta e análise de avaliações de clientes (1-5 estrelas)
- **Análise de Sentimento**: Processamento automático de comentários com IA (Google Gemini)
- **Sistema de Gamificação**: XP, níveis, conquistas, temporadas e rankings
- **Dashboard em Tempo Real**: Monitoramento via WebSocket
- **Controle de Acesso**: Sistema de autenticação com múltiplos níveis de permissão
- **Importação de Dados**: Suporte a CSV para dados em lote
- **Auditoria Completa**: Logs detalhados de todas as operações

### Stack Tecnológico Utilizado

#### Frontend
- **Next.js 15.3.3** - Framework React com App Router
- **React 18** - Biblioteca de interface de usuário
- **TypeScript** - Linguagem de programação tipada
- **Tailwind CSS** - Framework CSS utility-first
- **Radix UI + shadcn/ui** - Sistema de componentes acessíveis
- **Lucide React** - Biblioteca de ícones
- **Recharts** - Gráficos e visualizações

#### Backend
- **Next.js API Routes** - Endpoints de API
- **Prisma ORM** - Toolkit de banco de dados
- **PostgreSQL** - Banco de dados relacional
- **NextAuth.js** - Sistema de autenticação
- **bcryptjs** - Hash de senhas
- **Zod** - Validação de schemas

#### IA e Análise
- **Google AI Genkit** - Toolkit de integração com IA
- **Google Gemini API** - Análise de sentimento de comentários

#### Desenvolvimento e Testes
- **Jest** - Framework de testes
- **React Testing Library** - Testes de componentes
- **ESLint** - Linting de código
- **WebSocket (ws)** - Comunicação em tempo real

---

## 🏗️ 2. Arquitetura do Projeto

### Estrutura de Pastas Detalhada

```
projeto/
├── src/                          # Código fonte principal
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # Endpoints de API
│   │   │   ├── attendants/       # APIs de atendentes
│   │   │   ├── auth/             # Autenticação
│   │   │   ├── evaluations/      # APIs de avaliações
│   │   │   ├── gamification/     # APIs de gamificação
│   │   │   ├── users/            # APIs de usuários
│   │   │   └── ...
│   │   ├── dashboard/            # Páginas do painel administrativo
│   │   │   ├── gamificacao/      # Módulo de gamificação
│   │   │   ├── rh/               # Módulo de recursos humanos
│   │   │   ├── pesquisa-satisfacao/ # Módulo de pesquisas
│   │   │   └── usuarios/         # Gestão de usuários
│   │   ├── login/                # Página de login
│   │   └── survey/               # Formulário público de avaliação
│   ├── components/               # Componentes React reutilizáveis
│   │   ├── ui/                   # Componentes base (shadcn/ui)
│   │   ├── gamification/         # Componentes de gamificação
│   │   ├── rh/                   # Componentes de RH
│   │   └── survey/               # Componentes de pesquisa
│   ├── hooks/                    # Hooks React customizados
│   │   ├── gamification/         # Hooks de gamificação
│   │   └── survey/               # Hooks de pesquisa
│   ├── lib/                      # Utilitários e configurações
│   │   ├── websocket/            # Configuração WebSocket
│   │   ├── auth.ts               # Configuração NextAuth
│   │   ├── prisma.ts             # Cliente Prisma
│   │   └── types.ts              # Definições de tipos
│   ├── providers/                # Provedores de contexto React
│   │   ├── AuthProvider.tsx      # Contexto de autenticação
│   │   ├── NotificationProvider.tsx # Sistema de notificações
│   │   └── PrismaProvider.tsx    # Contexto de dados
│   ├── services/                 # Lógica de negócio
│   │   ├── gamification/         # Serviços de gamificação
│   │   ├── survey/               # Serviços de pesquisa
│   │   ├── userService.ts        # Gestão de usuários
│   │   └── attendantService.ts   # Gestão de atendentes
│   ├── ai/                       # Integração com IA
│   │   └── flows/                # Fluxos de análise
│   └── types/                    # Tipos TypeScript específicos
├── prisma/                       # Configuração do banco de dados
│   ├── schema.prisma             # Schema do banco
│   ├── migrations/               # Migrações
│   └── seed.ts                   # Dados iniciais
├── .kiro/                        # Configurações do Kiro IDE
│   ├── specs/                    # Especificações de funcionalidades
│   └── steering/                 # Diretrizes de desenvolvimento
└── dados/                        # Dados de exemplo e testes
```

### Padrões Arquiteturais Utilizados

#### 1. **Separação de Responsabilidades**
- **Pages (app/)**: Roteamento e layout
- **Components**: Renderização de UI
- **Services**: Lógica de negócio e integração com APIs
- **Hooks**: Estado e efeitos colaterais
- **Providers**: Estado global da aplicação

#### 2. **Arquitetura em Camadas**
```
┌─────────────────┐
│   Presentation  │ ← Components, Pages
├─────────────────┤
│    Business     │ ← Services, Hooks
├─────────────────┤
│   Data Access   │ ← Prisma, Database
└─────────────────┘
```

#### 3. **Padrão Repository**
- Services abstraem acesso aos dados
- Prisma ORM como camada de abstração do banco
- Validação centralizada com Zod

### Fluxo de Dados Entre Componentes

```mermaid
graph TD
    A[User Interface] --> B[React Components]
    B --> C[Custom Hooks]
    C --> D[Services Layer]
    D --> E[Prisma ORM]
    E --> F[PostgreSQL Database]
    
    G[API Routes] --> D
    H[NextAuth] --> I[Auth Middleware]
    I --> G
    
    J[WebSocket] --> K[Real-time Updates]
    K --> C
```

---

## 🗄️ 3. Modelos de Dados

### Schema do Banco de Dados (Prisma)

#### Entidades Principais

##### **User** - Sistema de Usuários
```prisma
model User {
  id                String             @id @default(cuid())
  name              String
  email             String             @unique
  password          String?
  role              Role               @default(USUARIO)
  modules           Module[]           @relation("UserModules")
  // Relacionamentos com importações e concessões
}

enum Role {
  SUPERADMIN  // Acesso total ao sistema
  ADMIN       // Gerenciamento de atendentes e configurações
  SUPERVISOR  // Visualização de métricas e relatórios
  USUARIO     // Acesso limitado a funcionalidades básicas
}
```

##### **Attendant** - Funcionários Avaliados
```prisma
model Attendant {
  id                   String                @id @default(cuid())
  name                 String
  email                String                @unique
  funcao               String                // Cargo/função
  setor                String                // Departamento
  status               String                // Ativo, Inativo, etc.
  telefone             String
  dataAdmissao         DateTime
  dataNascimento       DateTime
  rg                   String
  cpf                  String                @unique
  evaluations          Evaluation[]          // Avaliações recebidas
  unlockedAchievements UnlockedAchievement[] // Conquistas desbloqueadas
  xpGrants             XpGrant[]             // XP avulso recebido
}
```

##### **Evaluation** - Avaliações de Satisfação
```prisma
model Evaluation {
  id          String            @id @default(cuid())
  attendantId String
  nota        Int               // 1-5 estrelas
  comentario  String            // Comentário do cliente
  data        DateTime          // Data da avaliação
  xpGained    Float             // XP calculado
  attendant   Attendant         @relation(fields: [attendantId], references: [id])
}
```

##### **XpEvent** - Eventos de Pontuação
```prisma
model XpEvent {
  id          String              @id @default(cuid())
  attendantId String
  points      Float               // Pontos finais (com multiplicador)
  basePoints  Float               // Pontos base
  multiplier  Float               // Multiplicador aplicado
  reason      String              // Motivo da pontuação
  date        DateTime
  type        String              // 'evaluation', 'achievement', 'manual'
  relatedId   String              // ID do objeto relacionado
  seasonId    String?             // Temporada associada
  season      GamificationSeason? @relation(fields: [seasonId], references: [id])
}
```

##### **GamificationSeason** - Temporadas de Gamificação
```prisma
model GamificationSeason {
  id                   String                @id @default(cuid())
  name                 String                // Nome da temporada
  startDate            DateTime              // Data de início
  endDate              DateTime              // Data de fim
  active               Boolean               // Se está ativa
  xpMultiplier         Float                 // Multiplicador de XP
  xpEvents             XpEvent[]             // Eventos da temporada
  unlockedAchievements UnlockedAchievement[] // Conquistas da temporada
}
```

##### **AchievementConfig** - Configuração de Conquistas
```prisma
model AchievementConfig {
  id          String   @id                   // ID único da conquista
  title       String                         // Título da conquista
  description String                         // Descrição
  xp          Int                           // XP bônus ao desbloquear
  active      Boolean  @default(true)       // Se está ativa
  icon        String                        // Ícone (emoji ou classe CSS)
  color       String                        // Cor temática
}
```

##### **UnlockedAchievement** - Conquistas Desbloqueadas
```prisma
model UnlockedAchievement {
  id            String              @id @default(cuid())
  attendantId   String
  achievementId String              // Referência à configuração
  unlockedAt    DateTime            @default(now())
  xpGained      Float?              @default(0)
  seasonId      String?             // Temporada onde foi desbloqueada
  attendant     Attendant           @relation(fields: [attendantId], references: [id])
  season        GamificationSeason? @relation(fields: [seasonId], references: [id])
  
  @@unique([attendantId, achievementId, seasonId])
}
```

##### **XpTypeConfig** - Tipos de XP Avulso
```prisma
model XpTypeConfig {
  id          String     @id @default(cuid())
  name        String     @unique           // Nome do tipo
  description String                       // Descrição
  points      Int                         // Pontos padrão
  active      Boolean    @default(true)   // Se está ativo
  category    String     @default("general") // Categoria
  icon        String     @default("star")  // Ícone
  color       String     @default("#3B82F6") // Cor
  createdBy   String                      // Quem criou
  creator     User       @relation("XpTypeCreator", fields: [createdBy], references: [id])
  xpGrants    XpGrant[]                   // Concessões deste tipo
}
```

##### **XpGrant** - Concessões de XP Avulso
```prisma
model XpGrant {
  id            String       @id @default(cuid())
  attendantId   String
  typeId        String                    // Tipo de XP usado
  points        Int                      // Pontos concedidos
  justification String?                  // Justificativa opcional
  grantedBy     String                   // Quem concedeu
  grantedAt     DateTime     @default(now())
  xpEventId     String       @unique     // Evento XP associado
  attendant     Attendant    @relation(fields: [attendantId], references: [id])
  type          XpTypeConfig @relation(fields: [typeId], references: [id])
  granter       User         @relation("XpGranter", fields: [grantedBy], references: [id])
  xpEvent       XpEvent      @relation(fields: [xpEventId], references: [id])
}
```

### Relacionamentos Entre Entidades

#### Relacionamentos Principais
1. **User → Attendant**: Um usuário pode gerenciar múltiplos atendentes
2. **Attendant → Evaluation**: Um atendente recebe múltiplas avaliações
3. **Evaluation → XpEvent**: Cada avaliação gera um evento XP
4. **Attendant → UnlockedAchievement**: Atendentes desbloqueiam conquistas
5. **GamificationSeason → XpEvent**: Eventos XP pertencem a temporadas
6. **User → XpGrant**: Usuários podem conceder XP avulso

#### Integridade Referencial
- **Cascade Delete**: Remoção de atendente remove suas avaliações
- **Set Null**: Remoção de temporada mantém eventos XP
- **Restrict**: Tipos de XP com concessões não podem ser removidos

### Regras de Negócio Principais

#### Sistema de Pontuação
- **Avaliações 1-5 estrelas** geram XP baseado em configuração
- **Multiplicadores sazonais** aplicados automaticamente
- **XP avulso** pode ser concedido por administradores
- **Conquistas** geram XP bônus ao serem desbloqueadas

#### Sistema de Conquistas
- **Verificação automática** após cada evento XP
- **Critérios configuráveis** (contagem, sequências, médias)
- **Conquistas únicas** por atendente por temporada
- **XP bônus** adicionado ao desbloquear

#### Controle de Temporadas
- **Apenas uma temporada ativa** por vez
- **Multiplicadores** aplicados a todo XP da temporada
- **Rankings** calculados por temporada
- **Conquistas** podem ser específicas por temporada

---

## ⚙️ 4. Funcionalidades Principais

### Sistema de Autenticação e Autorização

#### NextAuth.js Configuration
```typescript
// Configuração em src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Verificação com UserService
        const user = await UserService.verifyPassword(
          credentials.email,
          credentials.password
        );
        return user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } : null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      // Adicionar role à sessão
      session.user.role = token.role;
      return session;
    }
  }
};
```

#### Níveis de Acesso
- **SUPERADMIN**: Acesso total, gestão de usuários e configurações globais
- **ADMIN**: Gestão de atendentes, avaliações e gamificação
- **SUPERVISOR**: Visualização de relatórios e métricas
- **USUARIO**: Acesso limitado a funcionalidades básicas

#### Middleware de Proteção
```typescript
// src/lib/auth-middleware.ts
export async function requireAuth(req: NextRequest, allowedRoles: Role[]) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Não autorizado');
  }
  
  if (!allowedRoles.includes(session.user.role as Role)) {
    throw new Error('Permissão insuficiente');
  }
  
  return session.user;
}
```

### Gestão de Atendentes e Avaliações

#### Cadastro de Atendentes
- **Formulário completo** com dados pessoais e profissionais
- **Validação de CPF e email** únicos
- **Importação em lote** via CSV
- **Histórico de alterações** mantido

#### Sistema de Avaliações
- **Escala 1-5 estrelas** obrigatória
- **Comentários opcionais** dos clientes
- **Análise de sentimento** automática com IA
- **Cálculo automático de XP** baseado na nota

#### Análise de Sentimento com IA
```typescript
// src/ai/flows/analyze-evaluation-flow.ts
export const analyzeEvaluationFlow = defineFlow(
  {
    name: 'analyzeEvaluation',
    inputSchema: AnalyzeEvaluationInputSchema,
    outputSchema: AnalyzeEvaluationOutputSchema,
  },
  async (input) => {
    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: `Analise o sentimento do comentário: "${input.comment}"
               Nota dada: ${input.rating} estrelas
               
               Classifique como: Positivo, Negativo ou Neutro
               Forneça um resumo de uma frase.`,
    });
    
    return {
      sentiment: llmResponse.sentiment,
      summary: llmResponse.summary
    };
  }
);
```

### Sistema de Gamificação Completo

#### Pontuação (XP)
- **XP por avaliação** baseado na nota (configurável)
- **Multiplicadores sazonais** aplicados automaticamente
- **XP avulso** concedido por administradores através de tipos pré-cadastrados
- **XP de conquistas** ao desbloquear achievements

#### Sistema de XP Avulso
- **Tipos pré-cadastrados** com valores específicos de pontos
- **6 tipos padrão**: Excelência no Atendimento (10pts), Iniciativa (8pts), Trabalho em Equipe (6pts), Melhoria de Processo (12pts), Pontualidade Exemplar (5pts), Resolução de Problemas (15pts)
- **Concessão manual** por administradores com justificativa opcional
- **Auditoria completa** de todas as concessões
- **Integração total** com rankings, conquistas e progressão de níveis
- **Interface dedicada** para gerenciamento e histórico

#### Sistema de Níveis
```typescript
// src/lib/xp.ts
export function getLevelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForCurrentLevel = (level - 1) ** 2 * 100;
  const xpForNextLevel = level ** 2 * 100;
  const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
  
  return {
    level,
    title: getLevelTitle(level),
    xpRequired: xpForNextLevel,
    progress: Math.min(100, Math.max(0, progress))
  };
}
```

#### Conquistas (Achievements)
- **13 conquistas implementadas** com critérios variados
- **Verificação automática** após eventos XP
- **Conquistas por progressão**: 1ª avaliação, 10, 50, 100 avaliações
- **Conquistas por XP**: 100, 1.000, 5.000, 10.000 XP
- **Conquistas de qualidade**: sequências de 5 estrelas, média alta
- **Conquistas especiais**: campeão mensal, vencedor de temporada

#### Temporadas de Gamificação
- **Períodos definidos** com início e fim
- **Multiplicadores de XP** específicos por temporada
- **Rankings independentes** por temporada
- **Conquistas sazonais** específicas

#### Leaderboards e Rankings
```typescript
// Cálculo de ranking por temporada
export async function calculateSeasonRankings(seasonId: string) {
  const rankings = await prisma.xpEvent.groupBy({
    by: ['attendantId'],
    where: { seasonId },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } }
  });
  
  return rankings.map((item, index) => ({
    position: index + 1,
    attendantId: item.attendantId,
    totalXp: item._sum.points || 0
  }));
}
```

### Dashboard em Tempo Real

#### WebSocket Implementation
```typescript
// src/lib/websocket/dashboardSocket.ts
export class DashboardSocket {
  private ws: WebSocket | null = null;
  
  connect() {
    this.ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }
  
  private handleMessage(data: any) {
    switch (data.type) {
      case 'NEW_EVALUATION':
        this.updateEvaluationStats(data.payload);
        break;
      case 'XP_GRANTED':
        this.updateXpStats(data.payload);
        break;
      case 'ACHIEVEMENT_UNLOCKED':
        this.showAchievementNotification(data.payload);
        break;
    }
  }
}
```

#### Métricas em Tempo Real
- **Avaliações recentes** com análise de sentimento
- **Concessões de XP** em tempo real
- **Conquistas desbloqueadas** com notificações
- **Rankings atualizados** automaticamente

---

## 🔌 5. APIs e Serviços

### Endpoints Principais

#### Autenticação
```
POST /api/auth/signin          # Login de usuário
POST /api/auth/signout         # Logout
GET  /api/auth/session         # Verificar sessão atual
```

#### Usuários
```
GET    /api/users              # Listar usuários (ADMIN+)
POST   /api/users              # Criar usuário (ADMIN+)
PUT    /api/users              # Atualizar usuário (ADMIN+)
DELETE /api/users              # Remover usuário (ADMIN+)
```

#### Atendentes
```
GET    /api/attendants         # Listar atendentes
POST   /api/attendants         # Criar atendente
PUT    /api/attendants/[id]    # Atualizar atendente
DELETE /api/attendants/[id]    # Remover atendente
POST   /api/attendants/import  # Importar CSV
```

#### Avaliações
```
GET    /api/evaluations        # Listar avaliações
POST   /api/evaluations        # Criar avaliação
PUT    /api/evaluations/[id]   # Atualizar avaliação
DELETE /api/evaluations/[id]   # Remover avaliação
POST   /api/evaluations/import # Importar CSV
```

#### Gamificação
```
GET    /api/gamification                    # Configuração geral
PUT    /api/gamification                    # Atualizar configuração

GET    /api/gamification/seasons           # Listar temporadas
POST   /api/gamification/seasons           # Criar temporada
PUT    /api/gamification/seasons/[id]      # Atualizar temporada
DELETE /api/gamification/seasons/[id]      # Remover temporada

GET    /api/gamification/achievements      # Listar conquistas
POST   /api/gamification/achievements      # Criar conquista
GET    /api/gamification/achievements/unlocked # Conquistas desbloqueadas

GET    /api/gamification/xp-events         # Eventos XP
POST   /api/gamification/xp-events         # Criar evento XP

GET    /api/gamification/xp-grants         # Histórico XP avulso
POST   /api/gamification/xp-grants         # Conceder XP avulso
GET    /api/gamification/xp-grants/statistics # Estatísticas
GET    /api/gamification/xp-grants/attendant/[id] # XP por atendente

GET    /api/gamification/xp-types          # Tipos de XP avulso
POST   /api/gamification/xp-types          # Criar tipo XP
PUT    /api/gamification/xp-types/[id]     # Atualizar tipo XP
DELETE /api/gamification/xp-types/[id]     # Remover tipo XP
```

### Serviços de Negócio

#### UserService
```typescript
export class UserService {
  static async findAll(): Promise<User[]>
  static async findById(id: string): Promise<User | null>
  static async create(userData: CreateUserData): Promise<User>
  static async update(id: string, userData: UpdateUserData): Promise<User>
  static async delete(id: string): Promise<void>
  static async verifyPassword(email: string, password: string): Promise<User | null>
}
```

#### AttendantService
```typescript
export class AttendantService {
  static async findAll(): Promise<Attendant[]>
  static async findById(id: string): Promise<Attendant | null>
  static async create(attendantData: CreateAttendantData): Promise<Attendant>
  static async update(id: string, attendantData: UpdateAttendantData): Promise<Attendant>
  static async delete(id: string): Promise<void>
  static async createBatch(attendants: CreateAttendantData[], importId?: string): Promise<Attendant[]>
}
```

#### GamificationService
```typescript
export class GamificationService {
  // Temporadas
  static async findAllSeasons(): Promise<GamificationSeason[]>
  static async findActiveSeason(): Promise<GamificationSeason | null>
  static async createSeason(seasonData: CreateSeasonData): Promise<GamificationSeason>
  
  // Eventos XP
  static async findXpEventsByAttendant(attendantId: string): Promise<XpEvent[]>
  static async calculateTotalXp(attendantId: string, seasonId?: string): Promise<number>
  static async createXpEvent(data: CreateXpEventData): Promise<XpEvent>
  
  // Conquistas
  static async findAllAchievements(): Promise<AchievementConfig[]>
  static async findUnlockedAchievements(attendantId: string): Promise<UnlockedAchievement[]>
  static async checkAchievements(attendantId: string): Promise<UnlockedAchievement[]>
  
  // Rankings
  static async calculateSeasonRankings(seasonId?: string): Promise<RankingEntry[]>
}
```

#### XpAvulsoService
```typescript
export class XpAvulsoService {
  static async grantXp(data: GrantXpData): Promise<XpGrant>
  static async findGrantHistory(filters: GrantHistoryFilters): Promise<XpGrant[]>
  static async validateGrantLimits(userId: string, date: Date): Promise<boolean>
  static async findXpTypes(): Promise<XpTypeConfig[]>
  static async createXpType(data: CreateXpTypeData): Promise<XpTypeConfig>
}
```

### Integrações Externas

#### Google AI (Gemini)
- **Análise de sentimento** de comentários de avaliações
- **Sugestões automáticas** para melhorias
- **Processamento em lote** de comentários históricos

#### WebSocket para Tempo Real
- **Notificações instantâneas** de novas avaliações
- **Atualizações de rankings** em tempo real
- **Alertas de conquistas** desbloqueadas

---

## 🚀 6. Configuração e Deploy

### Variáveis de Ambiente Necessárias

```bash
# .env
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Google AI (Gemini)
GOOGLE_API_KEY="sua_chave_da_api_google"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Autenticação NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu_secret_super_seguro_aqui"

# Ambiente
NODE_ENV="development"
```

### Comandos de Desenvolvimento

#### Instalação e Setup
```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma generate
npx prisma db push

# Popular dados iniciais
npm run db:seed
```

#### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Iniciar desenvolvimento com IA
npm run genkit:dev

# Iniciar Genkit com observação de arquivos
npm run genkit:watch
```

#### Banco de Dados
```bash
# Gerar cliente Prisma (executa automaticamente no postinstall)
npx prisma generate

# Aplicar migrações
npx prisma db push

# Visualizar dados (Prisma Studio)
npx prisma studio

# Popular banco com dados iniciais
npm run db:seed
```

#### Testes
```bash
# Executar todos os testes
npm test

# Executar testes em modo observação
npm run test:watch

# Executar testes com relatório de cobertura
npm run test:coverage

# Executar testes para ambiente CI
npm run test:ci
```

### Processo de Build e Deploy

#### Build para Produção
```bash
# Verificar tipos TypeScript
npm run typecheck

# Executar linting
npm run lint

# Build da aplicação
npm run build

# Iniciar servidor de produção
npm run start
```

#### Deploy (Exemplo com Vercel)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy para produção
vercel --prod
```

#### Configurações de Produção
- **Variáveis de ambiente** configuradas no provedor de hosting
- **Banco PostgreSQL** em produção (ex: Supabase, Railway, Neon)
- **Domínio personalizado** configurado
- **SSL/HTTPS** habilitado automaticamente

---

## 👨‍💻 7. Guias de Desenvolvimento

### Como Configurar o Ambiente

#### Pré-requisitos
- **Node.js 18+** instalado
- **PostgreSQL** rodando localmente ou em nuvem
- **Git** para controle de versão
- **Editor de código** (recomendado: VS Code com extensões TypeScript e Prisma)

#### Setup Passo a Passo
1. **Clonar o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd projeto
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Editar .env com suas configurações
   ```

4. **Configurar banco de dados**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

5. **Iniciar desenvolvimento**
   ```bash
   npm run dev
   ```

### Convenções de Código

#### Estrutura de Arquivos
- **PascalCase** para componentes React (`UserProfile.tsx`)
- **camelCase** para utilitários e serviços (`userService.ts`)
- **kebab-case** para páginas Next.js (`criar-usuario/page.tsx`)
- **UPPER_CASE** para constantes (`INITIAL_MODULES`)

#### Imports e Exports
```typescript
// ✅ Use alias @/ para imports
import { Button } from '@/components/ui/button';
import { UserService } from '@/services/userService';

// ✅ Exports nomeados preferenciais
export const UserProfile = () => { ... };
export { UserService };

// ✅ Default export apenas para páginas
export default function UserPage() { ... }
```

#### Componentes React
```typescript
// ✅ Estrutura padrão de componente
interface UserProfileProps {
  userId: string;
  showActions?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  userId, 
  showActions = true 
}) => {
  // Hooks no topo
  const { user, loading } = useUser(userId);
  const [isEditing, setIsEditing] = useState(false);
  
  // Early returns para loading/error
  if (loading) return <Skeleton />;
  if (!user) return <NotFound />;
  
  // Render principal
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Conteúdo */}
      </CardContent>
    </Card>
  );
};
```

#### Services e APIs
```typescript
// ✅ Estrutura padrão de service
export class UserService {
  static async findById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { modules: true }
      });
      
      return user;
    } catch (error) {
      logError(error as Error, 'UserService.findById');
      throw handlePrismaError(error);
    }
  }
}

// ✅ Estrutura padrão de API route
export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const user = await requireAuth(request, ['ADMIN', 'SUPERADMIN']);
    
    // Lógica de negócio
    const users = await UserService.findAll();
    
    // Resposta
    return NextResponse.json(users);
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

### Como Executar Testes

#### Configuração de Testes
- **Jest** como test runner
- **React Testing Library** para testes de componentes
- **jsdom** como ambiente de teste
- **Cobertura mínima**: 70% em todas as métricas

#### Executar Testes
```bash
# Todos os testes
npm test

# Testes específicos
npm test UserProfile

# Modo watch (desenvolvimento)
npm run test:watch

# Com cobertura
npm run test:coverage
```

#### Estrutura de Testes
```typescript
// ✅ Exemplo de teste de componente
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfile } from '../UserProfile';

describe('UserProfile', () => {
  it('should render user information', () => {
    const mockUser = {
      id: '1',
      name: 'João Silva',
      email: 'joao@example.com',
      role: 'ADMIN'
    };
    
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
  });
  
  it('should handle edit action', async () => {
    const mockOnEdit = jest.fn();
    
    render(<UserProfile user={mockUser} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockUser.id);
  });
});
```

#### Testes de API
```typescript
// ✅ Exemplo de teste de API
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/services/userService');

describe('/api/users', () => {
  it('should return users for authenticated admin', async () => {
    const mockUsers = [{ id: '1', name: 'Test User' }];
    (UserService.findAll as jest.Mock).mockResolvedValue(mockUsers);
    
    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockUsers);
  });
});
```

### Debugging e Troubleshooting

#### Scripts de Verificação
```bash
# Verificar integridade do sistema
node verify-system-integrity.js

# Verificar usuários
node verify-user-integrity.js

# Verificar gamificação
node check-achievements.js
node check-seasons.js

# Debug de sessão NextAuth
node debug-nextauth-session.js
```

#### Logs e Monitoramento
- **Console logs** estruturados em desenvolvimento
- **Error boundaries** para capturar erros React
- **Middleware de auditoria** para operações críticas
- **Rate limiting** com logs de tentativas

#### Problemas Comuns
1. **Erro de sessão NextAuth**: Verificar NEXTAUTH_SECRET e URL
2. **Problemas de banco**: Verificar DATABASE_URL e conexão
3. **Imports não encontrados**: Verificar aliases no tsconfig.json
4. **Testes falhando**: Verificar mocks e setup do Jest

---

## 📚 Recursos Adicionais

### Documentação de Referência
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth.js**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com

### Estrutura de Especificações (.kiro/specs/)
- **xp-avulso/**: Sistema de concessão de XP manual
- **dashboard-tempo-real/**: Dashboard com WebSocket
- **plataforma-ajuda-ia/**: Integração com IA para suporte

### Scripts Utilitários
- **Importação de dados**: Scripts para CSV de atendentes e avaliações
- **Processamento de conquistas**: Scripts para verificação retroativa
- **Verificação de integridade**: Scripts de diagnóstico do sistema
- **Correção de dados**: Scripts para fix de problemas específicos

---

## 🎯 Conclusão

Este sistema representa uma solução completa para pesquisa de satisfação com gamificação, integrando tecnologias modernas como Next.js 15, React 18, TypeScript, Prisma e IA. A arquitetura modular e bem estruturada permite fácil manutenção e extensão de funcionalidades.

**Principais Diferenciais:**
- ✅ **Gamificação completa** com XP, níveis, conquistas e temporadas
- ✅ **Análise de sentimento** automática com IA
- ✅ **Dashboard em tempo real** com WebSocket
- ✅ **Sistema de permissões** robusto e flexível
- ✅ **Importação de dados** em lote via CSV
- ✅ **Auditoria completa** de todas as operações
- ✅ **Testes automatizados** com boa cobertura
- ✅ **Documentação detalhada** e código bem estruturado

O sistema está pronto para uso em produção e pode ser facilmente adaptado para diferentes contextos de avaliação e gamificação.