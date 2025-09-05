# Sistema de Pesquisa de Satisfação e Gamificação

Sistema para gerenciar avaliações de atendentes com mecânicas de gamificação para engajamento, incluindo sistema de XP avulso para reconhecimento personalizado.

## Funcionalidades Principais

### Sistema de Avaliações
- Avaliações de atendentes com notas de 1-5
- Comentários opcionais para contexto adicional
- Geração automática de XP baseada nas avaliações

### Sistema de Gamificação
- **XP e Níveis**: Sistema de pontos de experiência com progressão de níveis
- **Conquistas**: Desbloqueio automático baseado em critérios configuráveis
- **Rankings**: Classificação de atendentes por temporada
- **Temporadas**: Campanhas com multiplicadores e metas específicas

### Sistema de XP Avulso ⚡
- **Tipos Pré-cadastrados**: 6 tipos padrão + criação personalizada de tipos de XP
- **Concessão Manual**: Reconhecimento imediato por ações excepcionais com justificativas
- **Histórico Completo**: Auditoria de todas as concessões com filtros avançados
- **Integração Total**: XP avulso conta para rankings, conquistas e progressão
- **Controles de Segurança**: Limites por administrador e logs completos de auditoria
- **Notificações**: Sistema automático de notificação para atendentes
- **Estatísticas**: Dashboard com métricas de uso e relatórios detalhados

## Stack Tecnológico

- **Next.js 15.3.3** com App Router
- **React 18** e **TypeScript**
- **PostgreSQL** com **Prisma** ORM
- **NextAuth.js** para autenticação
- **Tailwind CSS** e **shadcn/ui** para interface

## Começando

Para iniciar o desenvolvimento, execute:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação.

## Configuração do Banco de Dados

1. Configure a variável `DATABASE_URL` no arquivo `.env`
2. Execute as migrações:
```bash
npx prisma migrate dev
```
3. Popule o banco com dados iniciais:
```bash
npm run db:seed
```

## Credenciais Padrão

Após executar o seed, você pode acessar com:
- **SUPERADMIN**: `superadmin@sistema.com` / `admin123`
- **ADMIN**: `admin@sistema.com` / `admin123`

## Sistema de XP Avulso

O sistema de XP avulso permite que administradores concedam pontos extras aos atendentes através de tipos pré-cadastrados:

### Tipos Padrão Disponíveis
- **Excelência no Atendimento** (10 pontos) - Atendimento excepcional ao cliente
- **Iniciativa** (8 pontos) - Tomar iniciativa em situações importantes
- **Trabalho em Equipe** (6 pontos) - Colaboração excepcional com colegas
- **Melhoria de Processo** (12 pontos) - Sugerir ou implementar melhorias
- **Pontualidade Exemplar** (5 pontos) - Pontualidade consistente
- **Resolução de Problemas** (15 pontos) - Resolver problemas complexos

### Funcionalidades Principais
- **Gerenciamento de Tipos**: Criar, editar e desativar tipos de XP
- **Concessão Controlada**: Limites por administrador e auditoria completa
- **Histórico Detalhado**: Filtros avançados e exportação para CSV
- **Integração Completa**: XP avulso conta para rankings e conquistas
- **Notificações**: Atendentes são notificados automaticamente

### Acesso às Funcionalidades
- **Configuração**: `/dashboard/gamificacao/configuracoes/tipos-xp`
- **Concessão**: `/dashboard/gamificacao/conceder-xp`
- **Histórico**: `/dashboard/gamificacao/historico-xp`

## API Endpoints

### Autenticação
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Gamificação
- `GET /api/gamification/stats` - Estatísticas gerais
- `GET /api/gamification/rankings` - Rankings por temporada

### XP Avulso
- `GET /api/gamification/xp-types` - Listar tipos de XP
- `POST /api/gamification/xp-types` - Criar tipo de XP (ADMIN+)
- `PUT /api/gamification/xp-types/[id]` - Atualizar tipo (ADMIN+)
- `DELETE /api/gamification/xp-types/[id]` - Desativar tipo (ADMIN+)
- `POST /api/gamification/xp-grants` - Conceder XP avulso (ADMIN+)
- `GET /api/gamification/xp-grants` - Histórico de concessões com filtros
- `GET /api/gamification/xp-grants/attendant/[id]` - Concessões por atendente
- `GET /api/gamification/xp-grants/daily-stats` - Estatísticas diárias de uso

### Atendentes
- `GET /api/attendants` - Listar atendentes
- `POST /api/attendants` - Criar atendente
- `GET /api/attendants/[id]` - Detalhes do atendente

### Avaliações
- `GET /api/evaluations` - Listar avaliações
- `POST /api/evaluations` - Criar avaliação
- `GET /api/evaluations/[id]` - Detalhes da avaliação

## Documentação Completa

### Documentação do Sistema de XP Avulso
- **[API Reference](docs/api-xp-avulso.md)** - Documentação completa da API
- **[Guia do Administrador](docs/guia-xp-avulso.md)** - Manual de uso para administradores
- **[Guia de Desenvolvimento](docs/desenvolvimento-xp-avulso.md)** - Documentação técnica para desenvolvedores
- **[Endpoints Técnicos](docs/endpoints-xp-avulso.md)** - Detalhes de implementação dos endpoints

### Documentação Geral
- **[Documentação Completa](DOCUMENTACAO-COMPLETA-PROJETO.md)** - Visão geral completa do sistema
- **[Documentação do Projeto](DOCUMENTACAO_PROJETO.md)** - Estrutura e funcionalidades principais
