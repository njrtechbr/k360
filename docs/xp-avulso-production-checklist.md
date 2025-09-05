# Checklist de Produção - Sistema de XP Avulso

## Pré-Deploy

### ✅ Validação de Código
- [ ] Todos os testes unitários passando
- [ ] Testes de integração executados com sucesso
- [ ] Testes de performance validados
- [ ] Code review aprovado
- [ ] Análise de segurança concluída
- [ ] Documentação atualizada

### ✅ Validação de Banco de Dados
- [ ] Migrações testadas em ambiente de staging
- [ ] Índices criados para performance
- [ ] Constraints de integridade validadas
- [ ] Backup do banco atual realizado
- [ ] Rollback plan documentado

### ✅ Configuração de Ambiente
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets e chaves de API atualizadas
- [ ] Configuração de logs ajustada
- [ ] Monitoramento configurado
- [ ] Alertas definidos

## Deploy

### ✅ Processo de Deploy
- [ ] Notificação de manutenção enviada
- [ ] Backup completo realizado
- [ ] Deploy executado em horário de baixo tráfego
- [ ] Migrações de banco executadas
- [ ] Serviços reiniciados
- [ ] Health checks validados

### ✅ Validação Pós-Deploy
- [ ] Endpoints respondendo corretamente
- [ ] Funcionalidades críticas testadas
- [ ] Logs sem erros críticos
- [ ] Métricas dentro do esperado
- [ ] Integração com sistema existente funcionando

## Pós-Deploy

### ✅ Monitoramento Inicial
- [ ] Dashboards de monitoramento ativos
- [ ] Alertas funcionando
- [ ] Logs sendo coletados
- [ ] Métricas de performance normais
- [ ] Usuários conseguindo acessar

### ✅ Validação de Negócio
- [ ] Concessão de XP funcionando
- [ ] Multiplicadores sazonais aplicados
- [ ] Rankings atualizados corretamente
- [ ] Conquistas sendo verificadas
- [ ] Histórico sendo registrado

## Checklist Detalhado por Funcionalidade

### 🎯 Tipos de XP Avulso

#### Criação e Gerenciamento
- [ ] Criar novo tipo de XP
- [ ] Editar tipo existente
- [ ] Ativar/desativar tipo
- [ ] Validar nome único
- [ ] Verificar pontos positivos
- [ ] Testar diferentes categorias

#### Interface de Usuário
- [ ] Lista de tipos carregando
- [ ] Formulário de criação funcionando
- [ ] Validações em tempo real
- [ ] Mensagens de erro claras
- [ ] Ações de edição/exclusão

### 🎁 Concessão de XP

#### Processo de Concessão
- [ ] Seleção de atendente funcionando
- [ ] Lista de tipos ativos carregando
- [ ] Campo de justificativa opcional
- [ ] Validação de temporada ativa
- [ ] Aplicação de multiplicadores
- [ ] Criação de evento XP
- [ ] Verificação de conquistas

#### Validações de Segurança
- [ ] Verificação de permissões (ADMIN/SUPERADMIN)
- [ ] Validação de limites diários
- [ ] Tipo de XP ativo
- [ ] Atendente válido
- [ ] Temporada ativa

#### Auditoria
- [ ] Registro de quem concedeu
- [ ] Timestamp da concessão
- [ ] Justificativa salva
- [ ] Log de auditoria gerado

### 📊 Histórico e Relatórios

#### Consultas
- [ ] Histórico por atendente
- [ ] Filtros avançados funcionando
- [ ] Paginação eficiente
- [ ] Ordenação por diferentes campos
- [ ] Exportação para CSV

#### Performance
- [ ] Consultas executando < 200ms
- [ ] Paginação limitando resultados
- [ ] Índices otimizados
- [ ] Cache quando apropriado

### 🏆 Integração com Gamificação

#### Multiplicadores Sazonais
- [ ] XP base registrado corretamente
- [ ] Multiplicador aplicado
- [ ] XP final calculado
- [ ] Temporada correta vinculada

#### Rankings
- [ ] XP avulso incluído no total
- [ ] Posições atualizadas
- [ ] Cálculos corretos por temporada
- [ ] Performance adequada

#### Conquistas
- [ ] Verificação automática após concessão
- [ ] XP total incluindo avulso
- [ ] Notificações de desbloqueio
- [ ] Histórico de conquistas

## Testes de Aceitação

### 🧪 Cenários de Teste

#### Fluxo Básico
1. [ ] Admin acessa sistema
2. [ ] Cria novo tipo de XP
3. [ ] Concede XP para atendente
4. [ ] Verifica histórico
5. [ ] Confirma atualização no ranking

#### Cenários de Erro
1. [ ] Tentar conceder XP sem temporada ativa
2. [ ] Usar tipo de XP inativo
3. [ ] Exceder limites diários
4. [ ] Acessar sem permissão adequada

#### Performance
1. [ ] Conceder 100 XPs em sequência
2. [ ] Consultar histórico com 10.000 registros
3. [ ] Calcular estatísticas de 1 ano
4. [ ] Atualizar ranking com 1.000 atendentes

## Configurações de Produção

### 🔧 Variáveis de Ambiente
```bash
# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/db

# Logs
LOG_LEVEL=info
LOG_FORMAT=json

# Limites
XP_DAILY_LIMIT_POINTS=1000
XP_DAILY_LIMIT_GRANTS=50

# Monitoramento
MONITORING_ENABLED=true
METRICS_ENDPOINT=/metrics
```

### 📊 Configuração de Logs
```json
{
  "level": "info",
  "format": "json",
  "outputs": [
    {
      "type": "file",
      "path": "/var/log/xp-avulso/application.log",
      "rotation": "daily",
      "retention": "30d"
    },
    {
      "type": "file", 
      "path": "/var/log/xp-avulso/audit.log",
      "rotation": "daily",
      "retention": "1y",
      "filter": "audit"
    }
  ]
}
```

### 🚨 Configuração de Alertas
```yaml
alerts:
  - name: "XP Avulso - Taxa de Erro Alta"
    condition: "error_rate > 1%"
    duration: "5m"
    severity: "critical"
    
  - name: "XP Avulso - Latência Alta"
    condition: "p95_latency > 500ms"
    duration: "10m"
    severity: "warning"
    
  - name: "XP Avulso - Concessões Suspeitas"
    condition: "grants_per_hour > 100"
    duration: "1m"
    severity: "warning"
```

## Rollback Plan

### 🔄 Cenários de Rollback

#### Rollback de Código
1. [ ] Identificar versão anterior estável
2. [ ] Executar deploy da versão anterior
3. [ ] Validar funcionamento
4. [ ] Notificar equipe

#### Rollback de Banco
1. [ ] Parar aplicação
2. [ ] Restaurar backup anterior
3. [ ] Validar integridade dos dados
4. [ ] Reiniciar aplicação
5. [ ] Testar funcionalidades críticas

#### Rollback Parcial
1. [ ] Desativar funcionalidade específica
2. [ ] Redirecionar tráfego
3. [ ] Manter logs para análise
4. [ ] Planejar correção

### 🚨 Critérios para Rollback
- Taxa de erro > 5%
- Latência P95 > 2 segundos
- Falhas de integridade de dados
- Indisponibilidade > 5 minutos
- Feedback negativo crítico

## Contatos de Emergência

### 👥 Equipe Técnica
- **Tech Lead**: João Silva - +55 11 9999-0001
- **DevOps**: Maria Santos - +55 11 9999-0002
- **DBA**: Pedro Costa - +55 11 9999-0003

### 📞 Escalação
1. **Nível 1**: Desenvolvedor responsável
2. **Nível 2**: Tech Lead + DevOps
3. **Nível 3**: Gerente de Projeto
4. **Nível 4**: Diretor de Tecnologia

## Documentação de Referência

### 📚 Links Importantes
- [Documentação da API](./api-xp-avulso.md)
- [Guia do Usuário](./guia-xp-avulso.md)
- [Monitoramento](./xp-avulso-monitoring.md)
- [Desenvolvimento](./desenvolvimento-xp-avulso.md)

### 🔗 Dashboards
- **Operacional**: https://monitoring.empresa.com/xp-avulso
- **Negócio**: https://analytics.empresa.com/gamificacao
- **Logs**: https://logs.empresa.com/xp-avulso

## Assinatura de Aprovação

### ✍️ Aprovações Necessárias
- [ ] **Tech Lead**: _________________ Data: _______
- [ ] **QA Lead**: _________________ Data: _______
- [ ] **DevOps**: _________________ Data: _______
- [ ] **Product Owner**: _________________ Data: _______
- [ ] **Gerente de Projeto**: _________________ Data: _______

### 📅 Cronograma
- **Data de Deploy**: _______________
- **Horário**: _______________
- **Duração Estimada**: _______________
- **Janela de Manutenção**: _______________

---

**Observações Finais:**
- Este checklist deve ser seguido rigorosamente
- Qualquer desvio deve ser documentado e aprovado
- Em caso de dúvidas, consultar a equipe técnica
- Manter comunicação constante durante o processo