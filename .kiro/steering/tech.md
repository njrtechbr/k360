# Stack Tecnológico

## Framework & Runtime
- **Next.js 15.3.3** - Framework React com App Router
- **React 18** - Biblioteca de UI
- **TypeScript** - Linguagem principal
- **Node.js** - Ambiente de execução

## Banco de Dados & ORM
- **PostgreSQL** - Banco de dados principal
- **Prisma** - ORM e toolkit de banco de dados
- **Database URL**: Usa variável de ambiente `DATABASE_URL`

## Autenticação & Autorização
- **NextAuth.js** - Sistema de autenticação
- **Controle baseado em funções**: SUPERADMIN, ADMIN, SUPERVISOR, USUARIO

## UI & Estilização
- **Tailwind CSS** - Framework CSS utility-first
- **Radix UI** - Biblioteca de componentes headless
- **shadcn/ui** - Sistema de componentes baseado no Radix
- **Lucide React** - Biblioteca de ícones
- **PT Sans** - Família de fonte principal

## IA & Serviços Externos
- **Google AI Genkit** - Toolkit de integração com IA
- **Firebase** - Serviços de backend e hospedagem

## Ferramentas de Desenvolvimento
- **Jest** - Framework de testes com React Testing Library
- **ESLint** - Linting de código (erros de build ignorados)
- **TypeScript** - Verificação de tipos (erros de build ignorados)

## Comandos Comuns

### Desenvolvimento
```bash
npm run dev              # Iniciar servidor de desenvolvimento
npm run genkit:dev       # Iniciar desenvolvimento Genkit AI
npm run genkit:watch     # Iniciar Genkit com observação de arquivos
```

### Banco de Dados
```bash
npm run postinstall      # Gerar cliente Prisma (executa automaticamente)
npm run db:seed          # Popular banco com dados iniciais
```

### Testes
```bash
npm test                 # Executar testes
npm run test:watch       # Executar testes em modo observação
npm run test:coverage    # Executar testes com relatório de cobertura
npm run test:ci          # Executar testes para ambiente CI
```

### Build & Deploy
```bash
npm run build            # Build para produção
npm run start            # Iniciar servidor de produção
npm run lint             # Executar ESLint
npm run typecheck        # Executar verificação de tipos TypeScript
```

## Notas de Configuração
- Erros de TypeScript e ESLint são ignorados durante builds
- Imagens suportam padrões remotos para placehold.co, picsum.photos e todos os domínios HTTPS
- Usa aliases de caminho: `@/*` mapeia para `./src/*`