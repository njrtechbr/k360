---
inclusion: always
---

# Diretrizes do Model Context Protocol (MCP)

## Quando Usar MCP vs Serviços Regulares

### Use MCP Para:
- **Exploração e análise** de dados existentes
- **Validação de integridade** entre sistemas
- **Rastreamento de estado** durante desenvolvimento
- **Análise complexa** que requer pensamento sequencial
- **Documentação e referências** externas

### Use Serviços Prisma Para:
- **Operações de produção** (CRUD de Attendant, Evaluation, XpEvent)
- **Lógica de negócio crítica** (cálculo de XP, verificação de conquistas)
- **Transações de banco** que afetam dados persistentes

## Ferramentas MCP Disponíveis

### Memory
- Rastrear progresso de usuários e conquistas durante sessões
- Manter contexto de análises de dados complexas
- Armazenar descobertas temporárias de debugging

### Sequential Thinking
- Analisar lógica de gamificação complexa
- Resolver problemas de integridade de dados
- Planejar migrações e correções de schema

### Context7
- Buscar documentação do Next.js, Prisma, React
- Integrar referências de APIs externas
- Consultar padrões de arquitetura

### Fetch
- Validar endpoints de API externos
- Testar integrações com serviços terceiros
- Verificar conectividade de sistemas

## Padrões de Integração

### Gamificação
```typescript
// ✅ Use MCP Memory para análise de progresso
await memory.createEntities([{
  name: "season_analysis",
  entityType: "gamification",
  observations: ["Total XP: 15000", "Active users: 45", "Top achievement: Expert"]
}]);

// ✅ Use serviços para operações reais
await gamificationService.calculateSeasonRankings(seasonId);
```

### Validação de Dados
- MCP Memory: rastrear inconsistências encontradas
- Sequential Thinking: analisar causas de problemas de dados
- Serviços Prisma: aplicar correções validadas

## Regras de Uso

1. **Sempre teste MCP** antes de mudanças de configuração
2. **Valide resultados MCP** contra tipos TypeScript do schema
3. **Use MCP para exploração**, serviços para execução
4. **Mantenha contexto** de análises complexas no Memory
5. **Documente descobertas** importantes via MCP Memory
