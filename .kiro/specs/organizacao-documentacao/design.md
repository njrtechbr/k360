# Documento de Design - Organização da Documentação

## Visão Geral

Este design estabelece uma arquitetura hierárquica para organizar toda a documentação do projeto, criando uma estrutura lógica, navegável e extensível. A solução migra 35+ arquivos .md da raiz do projeto para uma estrutura organizada na pasta `docs/`, implementando convenções de nomenclatura e sistemas de navegação.

## Arquitetura

### Estrutura de Diretórios Proposta

```
docs/
├── README.md                    # Índice principal da documentação
├── features/                    # Documentação de funcionalidades
│   ├── conquistas/             # Sistema de conquistas/achievements
│   │   ├── README.md           # Índice das conquistas
│   │   ├── desbloqueadas-sucesso.md
│   │   ├── interface-sincronizadas.md
│   │   ├── perfil-melhorado.md
│   │   ├── por-temporada.md
│   │   ├── sincronizadas.md
│   │   └── sistema-automatico.md
│   ├── galeria/                # Sistema de galeria
│   │   ├── README.md
│   │   ├── selos-demo.md
│   │   ├── selos-melhorada.md
│   │   └── trofeus-corrigida.md
│   ├── gamificacao/            # Sistema de gamificação
│   │   ├── README.md
│   │   ├── sistema-trofeus.md
│   │   └── vencedor-temporada.md
│   ├── perfil/                 # Sistema de perfil
│   │   ├── README.md
│   │   ├── atendente-refatorado.md
│   │   └── historico-temporadas.md
│   └── xp-avulso/              # Sistema XP Avulso (já existe)
│       ├── api-xp-avulso.md
│       ├── desenvolvimento-xp-avulso.md
│       ├── endpoints-xp-avulso.md
│       └── guia-xp-avulso.md
├── implementations/            # Documentação de implementações
│   ├── README.md
│   ├── attendant-xp-display.md
│   ├── endpoints-historico-xp-avulso.md
│   ├── endpoints-xp-avulso.md
│   ├── interface-gerenciar-conquistas.md
│   └── notificacoes-xp-avulso.md
├── troubleshooting/           # Correções e resolução de problemas
│   ├── README.md
│   ├── erro-eval.md
│   ├── erro-sortedseasons.md
│   ├── porcentagem-conquistas.md
│   ├── problema-processamento-resolvido.md
│   ├── solucao-historico-temporadas.md
│   └── usuarios.md
├── project/                   # Documentação geral do projeto
│   ├── README.md
│   ├── documentacao-completa.md
│   ├── documentacao-projeto.md
│   ├── migration-summary.md
│   ├── gamification-fix-summary.md
│   └── importacao-setembro.md
└── operations/               # Comandos e operações
    ├── README.md
    ├── database-commands.md
    └── error-logs.md
```

### Convenções de Nomenclatura

#### Padrões de Nomes de Arquivos
- **Usar kebab-case**: `sistema-conquistas.md` em vez de `SISTEMA-CONQUISTAS.md`
- **Remover prefixos repetitivos**: `desbloqueadas-sucesso.md` em vez de `CONQUISTAS-DESBLOQUEADAS-SUCESSO.md`
- **Nomes descritivos**: `erro-eval.md` em vez de `CORRECAO-ERRO-EVAL.md`
- **Consistência por categoria**: todos os arquivos de uma pasta seguem o mesmo padrão

#### Mapeamento de Migração
```
# Conquistas
CONQUISTAS-DESBLOQUEADAS-SUCESSO.md → features/conquistas/desbloqueadas-sucesso.md
CONQUISTAS-INTERFACE-SINCRONIZADAS.md → features/conquistas/interface-sincronizadas.md
CONQUISTAS-PERFIL-MELHORADO.md → features/conquistas/perfil-melhorado.md
CONQUISTAS-POR-TEMPORADA.md → features/conquistas/por-temporada.md
CONQUISTAS-SINCRONIZADAS.md → features/conquistas/sincronizadas.md
SISTEMA-AUTOMATICO-CONQUISTAS.md → features/conquistas/sistema-automatico.md

# Galeria
galeria-selos-demo.md → features/galeria/selos-demo.md
GALERIA-SELOS-MELHORADA.md → features/galeria/selos-melhorada.md
GALERIA-TROFEUS-CORRIGIDA.md → features/galeria/trofeus-corrigida.md

# Implementações
IMPLEMENTACAO-ATTENDANT-XP-DISPLAY.md → implementations/attendant-xp-display.md
IMPLEMENTACAO-ENDPOINTS-HISTORICO-XP-AVULSO.md → implementations/endpoints-historico-xp-avulso.md
IMPLEMENTACAO-ENDPOINTS-XP-AVULSO.md → implementations/endpoints-xp-avulso.md
IMPLEMENTACAO-NOTIFICACOES-XP-AVULSO.md → implementations/notificacoes-xp-avulso.md

# Troubleshooting
CORRECAO-ERRO-EVAL.md → troubleshooting/erro-eval.md
CORRECAO-ERRO-SORTEDSEASONS.md → troubleshooting/erro-sortedseasons.md
CORRECAO-PORCENTAGEM-CONQUISTAS.md → troubleshooting/porcentagem-conquistas.md
PROBLEMA-PROCESSAMENTO-RESOLVIDO.md → troubleshooting/problema-processamento-resolvido.md
TROUBLESHOOTING-USUARIOS.md → troubleshooting/usuarios.md
```

## Componentes e Interfaces

### Sistema de Navegação

#### README Principal (`docs/README.md`)
```markdown
# Documentação do Sistema de Gamificação

## 📋 Índice Geral

### 🎯 Funcionalidades
- [Conquistas](./features/conquistas/) - Sistema de achievements e desbloqueios
- [Galeria](./features/galeria/) - Visualização de selos e troféus
- [Gamificação](./features/gamificacao/) - Mecânicas de pontuação e ranking
- [Perfil](./features/perfil/) - Sistema de perfil do atendente
- [XP Avulso](./features/xp-avulso/) - Sistema de pontuação manual

### 🔧 Implementações
- [Implementações](./implementations/) - Documentação de desenvolvimento

### 🚨 Troubleshooting
- [Resolução de Problemas](./troubleshooting/) - Correções e soluções

### 📁 Projeto
- [Documentação Geral](./project/) - Informações gerais do projeto

### ⚙️ Operações
- [Comandos e Operações](./operations/) - Scripts e comandos úteis
```

#### READMEs de Categoria
Cada pasta terá um README.md específico listando seus documentos com descrições breves.

### Templates de Documentação

#### Template Padrão para Funcionalidades
```markdown
# [Nome da Funcionalidade]

## Visão Geral
[Descrição breve da funcionalidade]

## Funcionalidades
- [Lista de recursos]

## Implementação
[Detalhes técnicos]

## Relacionados
- [Links para documentos relacionados]

## Histórico
- [Changelog ou versões]
```

#### Template para Troubleshooting
```markdown
# [Título do Problema]

## Problema
[Descrição do problema]

## Causa
[Causa raiz identificada]

## Solução
[Passos para resolução]

## Prevenção
[Como evitar no futuro]

## Relacionados
- [Links para problemas similares]
```

## Modelos de Dados

### Estrutura de Metadados
Cada documento incluirá metadados no cabeçalho:

```yaml
---
title: "Título do Documento"
category: "features|implementations|troubleshooting|project|operations"
subcategory: "conquistas|galeria|etc"
tags: ["tag1", "tag2"]
created: "2025-01-XX"
updated: "2025-01-XX"
related: ["doc1.md", "doc2.md"]
---
```

### Índice de Documentos
Arquivo JSON para facilitar buscas e navegação programática:

```json
{
  "documents": [
    {
      "path": "features/conquistas/sistema-automatico.md",
      "title": "Sistema Automático de Conquistas",
      "category": "features",
      "subcategory": "conquistas",
      "tags": ["automação", "achievements"],
      "description": "Implementação do sistema automático de desbloqueio de conquistas"
    }
  ]
}
```

## Tratamento de Erros

### Validação de Links
- Verificação automática de links internos durante migração
- Atualização de referências cruzadas entre documentos
- Validação de integridade da estrutura de navegação

### Backup e Rollback
- Backup completo dos arquivos originais antes da migração
- Script de rollback para reverter alterações se necessário
- Validação de conteúdo preservado após migração

### Detecção de Duplicatas
- Identificação de conteúdo duplicado entre arquivos
- Estratégia de consolidação preservando informações únicas
- Mapeamento de redirecionamentos para conteúdo consolidado

## Estratégia de Testes

### Testes de Migração
- Verificação de que todos os arquivos foram movidos corretamente
- Validação de que o conteúdo permanece íntegro
- Teste de links e referências internas

### Testes de Navegação
- Verificação de que todos os READMEs estão funcionais
- Teste de links do índice principal
- Validação da estrutura hierárquica

### Testes de Convenções
- Verificação de nomenclatura consistente
- Validação de estrutura de metadados
- Teste de templates aplicados corretamente

## Considerações de Performance

### Estrutura Otimizada
- Máximo de 3 níveis de profundidade para facilitar navegação
- Agrupamento lógico reduz tempo de busca
- Índices facilitam localização rápida de conteúdo

### Manutenibilidade
- Convenções claras facilitam adição de nova documentação
- Templates padronizados reduzem tempo de criação
- Estrutura extensível permite crescimento organizado

## Extensibilidade

### Adição de Novas Categorias
- Processo definido para criar novas pastas de categoria
- Templates para novos tipos de documentação
- Atualização automática de índices principais

### Integração com Ferramentas
- Estrutura compatível com geradores de documentação
- Metadados preparados para indexação automática
- Formato compatível com sistemas de busca