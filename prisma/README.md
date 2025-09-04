# Prisma Database Seeding

Este diretório contém os arquivos relacionados ao banco de dados Prisma e scripts de seed.

## Seed do Banco de Dados

O arquivo `seed.ts` popula o banco de dados com dados iniciais necessários para o funcionamento do sistema.

### Dados Incluídos no Seed:

#### 📦 Módulos do Sistema
- **RH (Recursos Humanos)**: Gerenciamento de atendentes e funcionários
- **Pesquisa de Satisfação**: Gerenciamento de pesquisas de satisfação e avaliações
- **Gamificação**: Acompanhe o ranking, o progresso e as recompensas da equipe

#### 👥 Funções Disponíveis
- Escrevente II
- Auxiliar de cartório
- Escrevente
- Admin
- Escrevente I
- Tabelião Substituto
- Escrevente Agile
- Atendente
- Assistente administrativo

#### 🏢 Setores Disponíveis
- escritura
- protesto
- procuração
- balcão
- agile
- administrativo

#### 🎮 Configuração de Gamificação
- Pontuações por avaliação (1-5 estrelas)
- Multiplicador global de XP
- Estrutura para conquistas e recompensas

## Como Executar o Seed

### Primeira vez (após clonar o projeto):
```bash
# Instalar dependências
npm install

# Gerar o cliente Prisma
npx prisma generate

# Executar migrações
npx prisma migrate dev

# Executar seed
npm run db:seed
```

### Para re-executar apenas o seed:
```bash
npm run db:seed
```

## Comandos Úteis do Prisma

```bash
# Ver o banco de dados no Prisma Studio
npx prisma studio

# Resetar o banco de dados (cuidado!)
npx prisma migrate reset

# Aplicar mudanças no schema
npx prisma db push

# Gerar cliente após mudanças no schema
npx prisma generate
```

## Estrutura dos Módulos

Cada módulo no sistema possui:
- **id**: Identificador único (usado nas URLs)
- **name**: Nome amigável do módulo
- **description**: Descrição do que o módulo faz
- **path**: Caminho da rota no sistema
- **active**: Se o módulo está ativo ou não

Os módulos são associados aos usuários através de uma relação many-to-many, permitindo que cada usuário tenha acesso apenas aos módulos necessários para sua função.

## Notas Importantes

- O seed usa `upsert` para evitar duplicação de dados
- É seguro executar o seed múltiplas vezes
- Os dados existentes não serão sobrescritos
- Para mudanças nos dados iniciais, edite o arquivo `seed.ts`