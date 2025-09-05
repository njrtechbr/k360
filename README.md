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
- **Tipos Pré-cadastrados**: Administradores podem criar tipos de XP com valores específicos
- **Concessão Manual**: Reconhecimento imediato por ações excepcionais
- **Histórico Completo**: Auditoria de todas as concessões com justificativas
- **Integração Total**: XP avulso conta para rankings, conquistas e progressão

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
- `GET /api/gamification/xp-grants` - Histórico de concessões
- `GET /api/gamification/xp-grants/attendant/[id]` - Concessões por atendente

### Atendentes
- `GET /api/attendants` - Listar atendentes
- `POST /api/attendants` - Criar atendente
- `GET /api/attendants/[id]` - Detalhes do atendente

### Avaliações
- `GET /api/evaluations` - Listar avaliações
- `POST /api/evaluations` - Criar avaliação
- `GET /api/evaluations/[id]` - Detalhes da avaliação
