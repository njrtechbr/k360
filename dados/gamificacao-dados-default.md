# Dados Padrão da Coleção de Configuração da Gamificação

Este documento detalha os valores padrão para a coleção `gamification/config` no banco de dados. Estes são os dados que o sistema utiliza na primeira inicialização ou caso a configuração seja resetada.

---

## 1. Configurações Gerais

Este é o objeto principal que contém as regras de pontuação e os multiplicadores.

```json
{
  "globalXpMultiplier": 1,
  "ratingScores": {
    "1": -5,
    "2": -2,
    "3": 1,
    "4": 3,
    "5": 5
  }
}
```

-   **`globalXpMultiplier`**: Um fator numérico (padrão: `1`) que multiplica todo o XP ganho. `2` dobraria todos os ganhos de XP.
-   **`ratingScores`**: Um mapa que define o XP base para cada nota de avaliação (de 1 a 5 estrelas).

---

## 2. Troféus Padrão (Achievements)

Esta é a lista completa de troféus (conquistas) que vêm configurados por padrão no sistema. Cada um tem um ID único, um gatilho de desbloqueio (`isUnlocked`), e um valor de XP.

| Título                    | Descrição                                                          | XP Bônus | ID do Troféu                 |
| ------------------------- | ------------------------------------------------------------------ | -------- | ---------------------------- |
| Primeira Impressão        | Receba sua primeira avaliação                                      | `+10 XP` | `primeira-impressao`         |
| Feedback Positivo (IA)    | Receba um comentário analisado como 'Positivo' pela IA.            | `+25 XP` | `ia-primeiro-positivo`       |
| Mestre do Conhecimento    | Leia o manual da gamificação para entender as regras.              | `+30 XP` | `mestre-conhecimento`        |
| Ganhando Ritmo            | Receba 10 avaliações                                               | `+50 XP` | `ganhando-ritmo`             |
| Trinca Perfeita           | Receba 3 avaliações de 5 estrelas consecutivas                     | `+100 XP`| `trinca-perfeita`            |
| Ouvinte Atento (IA)       | Receba um comentário 'Negativo', mostrando abertura a críticas.     | `+75 XP` | `ia-ouvinte-atento`          |
| Veterano                  | Receba 50 avaliações                                               | `+150 XP`| `veterano`                   |
| Querido pela Crítica (IA) | Receba 10 comentários 'Positivos' pela IA.                         | `+200 XP`| `ia-querido-critica`         |
| Centurião                 | Receba 100 avaliações                                              | `+300 XP`| `centuriao`                  |
| Satisfação Garantida      | Atingir 90% de avaliações positivas (4-5 estrelas) com 20+ av.      | `+500 XP`| `satisfacao-garantida`       |
| Excelência Consistente    | Manter nota média acima de 4.5 com 50+ avaliações                  | `+750 XP`| `excelencia`                 |
| Imparável                 | Receba 250 avaliações                                              | `+1000 XP`| `imparavel`                  |
| Busca pela Perfeição      | Mantenha nota média 5.0 com pelo menos 25 avaliações               | `+1500 XP`| `perfeicao`                  |
| Mestre da Qualidade       | Receba 50 avaliações de 5 estrelas                                 | `+1200 XP`| `mestre-qualidade`           |
| Mestre da Resiliência (IA)| Receba 5 comentários 'Negativos' e continue melhorando.            | `+500 XP` | `ia-mestre-resiliencia`      |
| Lenda do Atendimento      | Receba 500 avaliações                                              | `+2500 XP`| `lenda`                      |

---

## 3. Trilha de Níveis Padrão (Level Rewards)

Esta é a lista de recompensas simbólicas que os atendentes desbloqueiam ao atingir marcos de nível.

| Nível | Título                    | Descrição                                         |
| ----- | ------------------------- | ------------------------------------------------- |
| 1     | Iniciante                 | Você começou sua jornada!                         |
| 5     | Selo de Bronze            | Reconhecimento pelo seu esforço inicial.          |
| 10    | Especialista em Treinamento| Acesso a novos materiais de treinamento.          |
| 15    | Selo de Prata             | Um marco de consistência e qualidade.             |
| 20    | Mentor de Pares           | Convidado para ajudar no treinamento de novos colegas. |
| 25    | Selo de Ouro              | Prova de sua dedicação e excelência.              |
| 30    | Embaixador da Marca       | Represente a equipe em eventos internos.          |
| 40    | Selo de Platina           | Um dos pilares da excelência no atendimento.      |
| 50    | Lenda do Atendimento      | Você alcançou o auge da maestria!                 |

---

## 4. Sessões (Temporadas)

Por padrão, a lista de temporadas (`seasons`) é um array vazio. As temporadas devem ser criadas pelo administrador na interface de configurações.

```json
{
  "seasons": []
}
```

Cada objeto de temporada criado pelo administrador terá a seguinte estrutura:

```typescript
interface GamificationSeason {
    id: string; // Ex: "temporada-1"
    name: string; // Ex: "Temporada Verão 2025"
    startDate: string; // Data em formato ISO (ex: "2025-01-01T00:00:00.000Z")
    endDate: string; // Data em formato ISO (ex: "2025-03-31T23:59:59.000Z")
    active: boolean; // Se a temporada está ativa ou não
    xpMultiplier: number; // Multiplicador específico para esta temporada (ex: 1.5)
}
```
