# Guia do Usuário - Sistema de Backup

## Introdução

Este guia explica como usar a interface web do sistema de backup para criar, gerenciar e monitorar backups do banco de dados.

## Acessando o Sistema

### Requisitos de Acesso
- Conta de usuário ativa no sistema
- Role de ADMIN, SUPERADMIN ou SUPERVISOR
- Navegador web moderno (Chrome, Firefox, Safari, Edge)

### Como Acessar
1. Faça login no sistema principal
2. Navegue para `/dashboard/backup`
3. A página de backup será carregada automaticamente

## Interface Principal

### Visão Geral da Página
A página de backup é dividida em três seções principais:

```
┌─────────────────────────────────────┐
│           Criar Backup              │
│  [Formulário de criação]            │
├─────────────────────────────────────┤
│         Progresso Atual             │
│  [Barra de progresso]               │
├─────────────────────────────────────┤
│       Histórico de Backups          │
│  [Tabela com backups anteriores]    │
└─────────────────────────────────────┘
```

## Criando um Backup

### Passo a Passo

1. **Acesse a seção "Criar Backup"**
   - Localizada na parte superior da página
   - Disponível apenas para ADMIN e SUPERADMIN

2. **Configure as opções (opcional)**
   - **Nome personalizado**: Deixe em branco para nome automático
   - **Compressão**: Marque para reduzir o tamanho do arquivo
   - **Apenas estrutura**: Marque para backup sem dados
   - **Apenas dados**: Marque para backup sem estrutura

3. **Clique em "Criar Backup"**
   - O processo será iniciado imediatamente
   - Uma barra de progresso aparecerá

4. **Aguarde a conclusão**
   - O progresso é atualizado em tempo real
   - Você pode continuar usando outras partes do sistema

### Opções Avançadas

#### Compressão
- **Vantagem**: Reduz significativamente o tamanho do arquivo
- **Desvantagem**: Aumenta ligeiramente o tempo de criação
- **Recomendação**: Use sempre, exceto para backups muito pequenos

#### Backup Parcial
- **Apenas Estrutura**: Útil para criar schemas em outros ambientes
- **Apenas Dados**: Útil para migração de dados entre sistemas
- **Completo** (padrão): Inclui estrutura e dados

## Monitorando o Progresso

### Indicadores Visuais
- **Barra de Progresso**: Mostra percentual de conclusão
- **Status Textual**: Descreve a etapa atual
- **Tempo Estimado**: Estimativa de conclusão (quando disponível)

### Estados Possíveis
- 🔄 **Em Progresso**: Backup sendo criado
- ✅ **Concluído**: Backup criado com sucesso
- ❌ **Falhou**: Erro durante a criação
- ⏸️ **Pausado**: Operação temporariamente suspensa

## Gerenciando Backups Existentes

### Visualizando o Histórico
A tabela de histórico mostra:
- **Data/Hora**: Quando o backup foi criado
- **Nome**: Nome do arquivo de backup
- **Tamanho**: Tamanho do arquivo em MB/GB
- **Status**: Sucesso, falha ou em progresso
- **Criado por**: Usuário que criou o backup
- **Ações**: Botões para download e exclusão

### Fazendo Download

1. **Localize o backup desejado** na tabela
2. **Clique no botão "Download"** (ícone de seta para baixo)
3. **Aguarde a validação** (alguns segundos)
4. **O download iniciará automaticamente**

#### Dicas para Download
- Arquivos grandes podem demorar para iniciar
- O sistema verifica a integridade antes do download
- Use conexão estável para arquivos muito grandes

### Excluindo Backups

⚠️ **Atenção**: Exclusão é permanente e não pode ser desfeita!

1. **Localize o backup** que deseja excluir
2. **Clique no botão "Excluir"** (ícone de lixeira)
3. **Confirme a exclusão** na janela de confirmação
4. **O arquivo será removido** imediatamente

#### Permissões para Exclusão
- **SUPERADMIN**: Pode excluir qualquer backup
- **ADMIN**: Pode excluir backups próprios e de usuários subordinados
- **SUPERVISOR**: Não pode excluir backups

## Filtros e Busca

### Filtros Disponíveis
- **Por Data**: Selecione um período específico
- **Por Status**: Apenas sucessos, falhas ou em progresso
- **Por Usuário**: Backups criados por usuário específico
- **Por Tamanho**: Faixa de tamanho dos arquivos

### Como Usar os Filtros
1. **Clique em "Filtros"** acima da tabela
2. **Selecione os critérios** desejados
3. **Clique em "Aplicar"** para filtrar
4. **Use "Limpar"** para remover todos os filtros

## Notificações e Alertas

### Tipos de Notificação
- ✅ **Sucesso**: Backup criado com sucesso
- ❌ **Erro**: Falha na criação do backup
- ⚠️ **Aviso**: Problemas não críticos
- ℹ️ **Informação**: Atualizações de status

### Onde Aparecem
- **Toast notifications**: Canto superior direito
- **Email** (se configurado): Para operações importantes
- **Dashboard**: Resumo na página principal

## Solução de Problemas Comuns

### "Não tenho permissão para criar backup"
- **Causa**: Seu role não permite criar backups
- **Solução**: Contate um administrador para ajustar suas permissões

### "Backup está demorando muito"
- **Causa Normal**: Bancos grandes demoram mais
- **Verificação**: Veja o progresso na barra
- **Ação**: Aguarde ou contate suporte se parar completamente

### "Download não funciona"
- **Verificações**:
  - Conexão com internet estável
  - Espaço suficiente no disco
  - Navegador permite downloads
- **Solução**: Tente novamente ou use outro navegador

### "Arquivo de backup corrompido"
- **Identificação**: Status mostra "Falha na validação"
- **Ação**: Crie um novo backup
- **Prevenção**: Não interrompa o processo de criação

## Boas Práticas

### Frequência de Backup
- **Desenvolvimento**: Diário ou antes de mudanças importantes
- **Produção**: Múltiplos backups diários
- **Manutenção**: Backup antes de atualizações

### Organização
- Use nomes descritivos quando necessário
- Mantenha apenas backups necessários
- Exclua backups antigos regularmente

### Segurança
- Não compartilhe links de download
- Faça logout após usar o sistema
- Reporte problemas de acesso imediatamente

## Atalhos de Teclado

| Ação | Atalho | Descrição |
|------|--------|-----------|
| Criar Backup | `Ctrl + B` | Abre formulário de criação |
| Atualizar Lista | `F5` | Recarrega lista de backups |
| Buscar | `Ctrl + F` | Foca no campo de busca |
| Ajuda | `F1` | Abre esta documentação |

## Suporte

### Documentação Adicional
- **Guia CLI**: Para uso via linha de comando
- **Troubleshooting**: Soluções para problemas específicos
- **FAQ**: Perguntas frequentes

### Contato
- **Suporte Técnico**: Através do sistema de tickets
- **Documentação**: Sempre atualizada neste local
- **Treinamento**: Disponível sob demanda