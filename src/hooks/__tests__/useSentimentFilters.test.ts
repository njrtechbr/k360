import { renderHook, act } from "@testing-library/react";
import { useSentimentFilters } from "../useSentimentFilters";
import { EvaluationAnalysis } from "@/components/survey/types";

describe("useSentimentFilters", () => {
  const mockAnalyses: EvaluationAnalysis[] = [
    {
      id: "analysis-1",
      evaluationId: "eval-1",
      sentiment: "positive",
      confidence: 85,
      summary: "Cliente muito satisfeito com o atendimento",
      originalComment: "Excelente atendimento, muito satisfeito!",
      createdAt: "2024-01-15T10:30:00Z",
      evaluation: {
        id: "eval-1",
        rating: 5,
        comment: "Excelente atendimento, muito satisfeito!",
        createdAt: "2024-01-15T10:30:00Z",
        attendantId: "att-1",
        attendant: {
          id: "att-1",
          nome: "João Silva",
          setor: "Vendas",
        },
      },
    },
    {
      id: "analysis-2",
      evaluationId: "eval-2",
      sentiment: "negative",
      confidence: 90,
      summary: "Cliente insatisfeito com demora",
      originalComment: "Atendimento muito demorado, não gostei",
      createdAt: "2024-01-14T15:20:00Z",
      evaluation: {
        id: "eval-2",
        rating: 2,
        comment: "Atendimento muito demorado, não gostei",
        createdAt: "2024-01-14T15:20:00Z",
        attendantId: "att-2",
        attendant: {
          id: "att-2",
          nome: "Maria Santos",
          setor: "Suporte",
        },
      },
    },
    {
      id: "analysis-3",
      evaluationId: "eval-3",
      sentiment: "neutral",
      confidence: 70,
      summary: "Atendimento regular",
      originalComment: "Foi ok, nada demais",
      createdAt: "2024-01-13T09:15:00Z",
      evaluation: {
        id: "eval-3",
        rating: 3,
        comment: "Foi ok, nada demais",
        createdAt: "2024-01-13T09:15:00Z",
        attendantId: "att-1",
        attendant: {
          id: "att-1",
          nome: "João Silva",
          setor: "Vendas",
        },
      },
    },
    {
      id: "analysis-4",
      evaluationId: "eval-4",
      sentiment: "positive",
      confidence: 60, // Baixa confiança - conflito
      summary: "Cliente satisfeito mas com ressalvas",
      originalComment: "Bom atendimento mas poderia ser melhor",
      createdAt: "2024-01-12T14:45:00Z",
      evaluation: {
        id: "eval-4",
        rating: 4,
        comment: "Bom atendimento mas poderia ser melhor",
        createdAt: "2024-01-12T14:45:00Z",
        attendantId: "att-3",
        attendant: {
          id: "att-3",
          nome: "Pedro Costa",
          setor: "Vendas",
        },
      },
    },
  ];

  describe("Inicialização", () => {
    it("deve inicializar com filtros padrão", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      expect(result.current.filters).toEqual({
        search: "",
        sentiment: "all",
        confidenceRange: [0, 100],
        ratingRange: [1, 5],
        dateRange: { from: undefined, to: undefined },
        attendants: [],
        showConflicts: false,
        minAnalysisLength: 0,
        sortBy: "date",
        sortOrder: "desc",
      });
    });

    it("deve retornar todas as análises inicialmente", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      expect(result.current.filteredAnalyses).toHaveLength(4);
      expect(result.current.filteredAnalyses).toEqual(mockAnalyses);
    });

    it("deve calcular estatísticas corretas", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      expect(result.current.stats).toEqual({
        total: 4,
        positive: 2,
        negative: 1,
        neutral: 1,
        averageConfidence: 76.25, // (85 + 90 + 70 + 60) / 4
        conflictingAnalyses: 1, // confidence < 70
      });
    });
  });

  describe("Filtro por busca", () => {
    it("deve filtrar por termo de busca no comentário original", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ search: "excelente" });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].id).toBe("analysis-1");
    });

    it("deve filtrar por termo de busca no resumo", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ search: "demora" });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].id).toBe("analysis-2");
    });

    it("deve ser case-insensitive", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ search: "EXCELENTE" });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].id).toBe("analysis-1");
    });
  });

  describe("Filtro por sentimento", () => {
    it("deve filtrar por sentimento positivo", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sentiment: "positive" });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(
        result.current.filteredAnalyses.every(
          (a) => a.sentiment === "positive",
        ),
      ).toBe(true);
    });

    it("deve filtrar por sentimento negativo", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sentiment: "negative" });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].sentiment).toBe("negative");
    });

    it("deve filtrar por sentimento neutro", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sentiment: "neutral" });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].sentiment).toBe("neutral");
    });
  });

  describe("Filtro por confiança", () => {
    it("deve filtrar por faixa de confiança", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ confidenceRange: [80, 100] });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(
        result.current.filteredAnalyses.every((a) => a.confidence >= 80),
      ).toBe(true);
    });

    it("deve filtrar por confiança mínima", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ confidenceRange: [75, 100] });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(result.current.filteredAnalyses.map((a) => a.id)).toEqual([
        "analysis-1",
        "analysis-2",
      ]);
    });
  });

  describe("Filtro por rating", () => {
    it("deve filtrar por faixa de rating", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ ratingRange: [4, 5] });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(
        result.current.filteredAnalyses.every((a) => a.evaluation.rating >= 4),
      ).toBe(true);
    });

    it("deve filtrar por rating específico", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ ratingRange: [5, 5] });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].evaluation.rating).toBe(5);
    });
  });

  describe("Filtro por data", () => {
    it("deve filtrar por data inicial", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({
          dateRange: {
            from: new Date("2024-01-14"),
            to: undefined,
          },
        });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(result.current.filteredAnalyses.map((a) => a.id)).toEqual([
        "analysis-1",
        "analysis-2",
      ]);
    });

    it("deve filtrar por data final", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({
          dateRange: {
            from: undefined,
            to: new Date("2024-01-13"),
          },
        });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(result.current.filteredAnalyses.map((a) => a.id)).toEqual([
        "analysis-3",
        "analysis-4",
      ]);
    });

    it("deve filtrar por faixa de datas", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({
          dateRange: {
            from: new Date("2024-01-13"),
            to: new Date("2024-01-14"),
          },
        });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(result.current.filteredAnalyses.map((a) => a.id)).toEqual([
        "analysis-2",
        "analysis-3",
      ]);
    });
  });

  describe("Filtro por atendentes", () => {
    it("deve filtrar por atendente específico", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ attendants: ["att-1"] });
      });

      expect(result.current.filteredAnalyses).toHaveLength(2);
      expect(
        result.current.filteredAnalyses.every(
          (a) => a.evaluation.attendantId === "att-1",
        ),
      ).toBe(true);
    });

    it("deve filtrar por múltiplos atendentes", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ attendants: ["att-1", "att-2"] });
      });

      expect(result.current.filteredAnalyses).toHaveLength(3);
      expect(
        result.current.filteredAnalyses.every((a) =>
          ["att-1", "att-2"].includes(a.evaluation.attendantId),
        ),
      ).toBe(true);
    });
  });

  describe("Filtro por conflitos", () => {
    it("deve mostrar apenas análises conflitantes", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ showConflicts: true });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].confidence).toBeLessThan(70);
    });
  });

  describe("Filtro por tamanho da análise", () => {
    it("deve filtrar por tamanho mínimo do comentário", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ minAnalysisLength: 30 });
      });

      expect(result.current.filteredAnalyses).toHaveLength(3);
      expect(
        result.current.filteredAnalyses.every(
          (a) => a.originalComment.length >= 30,
        ),
      ).toBe(true);
    });
  });

  describe("Ordenação", () => {
    it("deve ordenar por data decrescente (padrão)", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      const dates = result.current.filteredAnalyses.map(
        (a) => new Date(a.createdAt),
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(
          dates[i].getTime(),
        );
      }
    });

    it("deve ordenar por data crescente", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sortOrder: "asc" });
      });

      const dates = result.current.filteredAnalyses.map(
        (a) => new Date(a.createdAt),
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1].getTime()).toBeLessThanOrEqual(dates[i].getTime());
      }
    });

    it("deve ordenar por confiança", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({
          sortBy: "confidence",
          sortOrder: "desc",
        });
      });

      const confidences = result.current.filteredAnalyses.map(
        (a) => a.confidence,
      );
      for (let i = 1; i < confidences.length; i++) {
        expect(confidences[i - 1]).toBeGreaterThanOrEqual(confidences[i]);
      }
    });

    it("deve ordenar por rating", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sortBy: "rating", sortOrder: "desc" });
      });

      const ratings = result.current.filteredAnalyses.map(
        (a) => a.evaluation.rating,
      );
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i - 1]).toBeGreaterThanOrEqual(ratings[i]);
      }
    });

    it("deve ordenar por sentimento", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sortBy: "sentiment" });
      });

      const sentiments = result.current.filteredAnalyses.map(
        (a) => a.sentiment,
      );
      // Verificar se está ordenado alfabeticamente
      for (let i = 1; i < sentiments.length; i++) {
        expect(
          sentiments[i - 1].localeCompare(sentiments[i]),
        ).toBeLessThanOrEqual(0);
      }
    });
  });

  describe("Filtros combinados", () => {
    it("deve aplicar múltiplos filtros simultaneamente", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({
          sentiment: "positive",
          confidenceRange: [80, 100],
          ratingRange: [4, 5],
        });
      });

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.filteredAnalyses[0].id).toBe("analysis-1");
    });

    it("deve retornar lista vazia quando nenhum item atende aos critérios", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({
          sentiment: "positive",
          ratingRange: [1, 2], // Ratings baixos com sentimento positivo
        });
      });

      expect(result.current.filteredAnalyses).toHaveLength(0);
    });
  });

  describe("Limpeza de filtros", () => {
    it("deve limpar todos os filtros", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      // Aplicar alguns filtros
      act(() => {
        result.current.updateFilters({
          search: "teste",
          sentiment: "positive",
          confidenceRange: [80, 100],
        });
      });

      // Limpar filtros
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        search: "",
        sentiment: "all",
        confidenceRange: [0, 100],
        ratingRange: [1, 5],
        dateRange: { from: undefined, to: undefined },
        attendants: [],
        showConflicts: false,
        minAnalysisLength: 0,
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result.current.filteredAnalyses).toHaveLength(4);
    });
  });

  describe("Contadores", () => {
    it("deve contar filtros ativos corretamente", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      expect(result.current.activeFiltersCount).toBe(0);

      act(() => {
        result.current.updateFilters({
          search: "teste",
          sentiment: "positive",
          showConflicts: true,
        });
      });

      expect(result.current.activeFiltersCount).toBe(3);
    });

    it("deve atualizar estatísticas após filtros", () => {
      const { result } = renderHook(() => useSentimentFilters(mockAnalyses));

      act(() => {
        result.current.updateFilters({ sentiment: "positive" });
      });

      expect(result.current.stats).toEqual({
        total: 2,
        positive: 2,
        negative: 0,
        neutral: 0,
        averageConfidence: 72.5, // (85 + 60) / 2
        conflictingAnalyses: 1, // apenas analysis-4 tem confidence < 70
      });
    });
  });

  describe("Performance", () => {
    it("deve memoizar resultados filtrados", () => {
      const { result, rerender } = renderHook(() =>
        useSentimentFilters(mockAnalyses),
      );

      const firstResult = result.current.filteredAnalyses;

      // Re-render sem mudanças
      rerender();

      expect(result.current.filteredAnalyses).toBe(firstResult);
    });

    it("deve memoizar estatísticas", () => {
      const { result, rerender } = renderHook(() =>
        useSentimentFilters(mockAnalyses),
      );

      const firstStats = result.current.stats;

      // Re-render sem mudanças
      rerender();

      expect(result.current.stats).toBe(firstStats);
    });
  });

  describe("Casos extremos", () => {
    it("deve lidar com lista vazia", () => {
      const { result } = renderHook(() => useSentimentFilters([]));

      expect(result.current.filteredAnalyses).toHaveLength(0);
      expect(result.current.stats).toEqual({
        total: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        averageConfidence: 0,
        conflictingAnalyses: 0,
      });
    });

    it("deve lidar com dados incompletos", () => {
      const incompleteAnalyses = [
        {
          id: "analysis-1",
          evaluationId: "eval-1",
          sentiment: "positive" as const,
          confidence: 85,
          summary: "Teste",
          originalComment: "Teste",
          createdAt: "2024-01-15T10:30:00Z",
          evaluation: {
            id: "eval-1",
            rating: 5,
            comment: "Teste",
            createdAt: "2024-01-15T10:30:00Z",
            attendantId: "att-1",
            attendant: {
              id: "att-1",
              nome: "João Silva",
              setor: "Vendas",
            },
          },
        },
      ];

      const { result } = renderHook(() =>
        useSentimentFilters(incompleteAnalyses),
      );

      expect(result.current.filteredAnalyses).toHaveLength(1);
      expect(result.current.stats.total).toBe(1);
    });
  });
});
