# Estrutura do Projeto

## Nível Raiz
- **Arquivos de configuração**: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `components.json`
- **Gerenciamento de pacotes**: `package.json`, `package-lock.json`
- **Ambiente**: `.env`, `.firebaserc`, `apphosting.yaml`
- **Testes**: `jest.config.js`, `jest.setup.js`, `jest.polyfills.js`

## Código Fonte (`src/`)
```
src/
├── app/           # Páginas e layouts do Next.js App Router
├── components/    # Componentes React reutilizáveis
├── hooks/         # Hooks React customizados
├── lib/           # Funções utilitárias e configurações
├── providers/     # Provedores de contexto React
├── services/      # Serviços de API e integrações externas
├── ai/            # Código relacionado a IA/Genkit
└── middleware.ts  # Middleware do Next.js
```

## Banco de Dados (`prisma/`)
- **`schema.prisma`** - Definição do schema do banco de dados
- **`seed.ts`** - Script de população do banco de dados
- **`migrations/`** - Arquivos de migração do banco de dados

## Convenções Principais

### Caminhos de Importação
- Use alias `@/` para todas as importações src: `import { Component } from '@/components/ui/component'`
- Importações relativas apenas para arquivos do mesmo diretório

### Organização de Componentes
- Componentes de UI seguem padrões shadcn/ui em `@/components/ui/`
- Componentes de lógica de negócio em `@/components/`
- Componentes específicos de página podem ser co-localizados com páginas

### Modelos do Banco de Dados
Entidades principais: `User`, `Attendant`, `Evaluation`, `XpEvent`, `GamificationConfig`, `AchievementConfig`, `GamificationSeason`

### Nomenclatura de Arquivos
- Componentes React: PascalCase (`UserProfile.tsx`)
- Utilitários e serviços: camelCase (`userService.ts`)
- Páginas: minúsculas com hífens (convenção App Router)

### Fluxo de Dados
1. **Páginas** (`src/app/`) lidam com roteamento e layout
2. **Serviços** (`src/services/`) gerenciam chamadas de API e lógica de negócio
3. **Componentes** (`src/components/`) lidam com renderização de UI
4. **Hooks** (`src/hooks/`) gerenciam estado e efeitos colaterais
5. **Provedores** (`src/providers/`) gerenciam estado global

## Arquivos de Desenvolvimento
- **`dados/`** - Dados de exemplo e arquivos CSV para testes
- **`scripts/`** - Scripts utilitários para importação/gerenciamento de dados
- **Scripts raiz** - Utilitários de banco de dados (`create-test-*.js`, `fix-*.js`)

## Notas de Configuração
- Componentes shadcn/ui configurados com variáveis CSS do Tailwind
- Cliente Prisma auto-gerado no `postinstall`
- Modo strict do TypeScript habilitado com mapeamento de caminhos