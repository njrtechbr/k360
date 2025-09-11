import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  EvaluationCard,
  EvaluationsList,
  CompactEvaluationCard,
  SimpleEvaluationCard,
} from "../EvaluationCard";
import { EvaluationCardProps } from "../types";

// Mock dos componentes UI
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardFooter: ({ children }: any) => (
    <div data-testid="card-footer">{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }: any) => (
    <img src={src} alt={alt} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children }: any) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

// Mock dos ícones Lucide
jest.mock("lucide-react", () => ({
  Eye: (props: any) => <svg data-testid="eye-icon" {...props} />,
  User: (props: any) => <svg data-testid="user-icon" {...props} />,
  Calendar: (props: any) => <svg data-testid="calendar-icon" {...props} />,
  MessageSquare: (props: any) => <svg data-testid="message-icon" {...props} />,
  Award: (props: any) => <svg data-testid="award-icon" {...props} />,
}));

// Mock dos componentes internos
jest.mock("../RatingStars", () => ({
  RatingDisplay: ({ rating }: any) => (
    <div data-testid="rating-display">Rating: {rating}</div>
  ),
}));

jest.mock("../SentimentBadge", () => ({
  SentimentAnalysis: ({ sentiment, confidence }: any) => (
    <div data-testid="sentiment-analysis">
      {sentiment} ({confidence}%)
    </div>
  ),
}));

describe("EvaluationCard", () => {
  const mockEvaluation = {
    id: "eval-1",
    rating: 4,
    comment: "Excelente atendimento, muito satisfeito!",
    createdAt: "2024-01-15T10:30:00Z",
    sentiment: "positive" as const,
    confidence: 85,
    tags: ["excelente", "satisfeito"],
    xpGained: 50,
  };

  const mockAttendant = {
    id: "att-1",
    nome: "João Silva",
    avatar: "https://example.com/avatar.jpg",
    setor: "Vendas",
  };

  const defaultProps: EvaluationCardProps = {
    evaluation: mockEvaluation,
    attendant: mockAttendant,
  };

  describe("Renderização básica", () => {
    it("deve renderizar informações do atendente", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(screen.getByText("João Silva")).toBeInTheDocument();
      expect(screen.getByText("Vendas")).toBeInTheDocument();
      expect(screen.getByTestId("avatar")).toBeInTheDocument();
    });

    it("deve renderizar rating da avaliação", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(screen.getByTestId("rating-display")).toBeInTheDocument();
      expect(screen.getByText("Rating: 4")).toBeInTheDocument();
    });

    it("deve renderizar comentário da avaliação", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(
        screen.getByText("Excelente atendimento, muito satisfeito!"),
      ).toBeInTheDocument();
    });

    it("deve renderizar análise de sentimento", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(screen.getByTestId("sentiment-analysis")).toBeInTheDocument();
      expect(screen.getByText("positive (85%)")).toBeInTheDocument();
    });

    it("deve renderizar data formatada", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(screen.getByText("15/01/2024")).toBeInTheDocument();
    });

    it("deve renderizar tags quando presentes", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(screen.getByText("excelente")).toBeInTheDocument();
      expect(screen.getByText("satisfeito")).toBeInTheDocument();
    });

    it("deve renderizar XP ganho quando presente", () => {
      render(<EvaluationCard {...defaultProps} />);

      expect(screen.getByText("+50 XP")).toBeInTheDocument();
    });
  });

  describe("Avatar e iniciais", () => {
    it("deve mostrar imagem do avatar quando disponível", () => {
      render(<EvaluationCard {...defaultProps} />);

      const avatarImage = screen.getByTestId("avatar-image");
      expect(avatarImage).toHaveAttribute(
        "src",
        "https://example.com/avatar.jpg",
      );
      expect(avatarImage).toHaveAttribute("alt", "João Silva");
    });

    it("deve mostrar iniciais quando avatar não está disponível", () => {
      const propsWithoutAvatar = {
        ...defaultProps,
        attendant: { ...mockAttendant, avatar: undefined },
      };

      render(<EvaluationCard {...propsWithoutAvatar} />);

      expect(screen.getByTestId("avatar-fallback")).toBeInTheDocument();
      expect(screen.getByText("JS")).toBeInTheDocument();
    });

    it("deve gerar iniciais corretamente para nomes compostos", () => {
      const propsWithCompoundName = {
        ...defaultProps,
        attendant: {
          ...mockAttendant,
          nome: "Maria da Silva Santos",
          avatar: undefined,
        },
      };

      render(<EvaluationCard {...propsWithCompoundName} />);

      expect(screen.getByText("MS")).toBeInTheDocument();
    });
  });

  describe("Ações e interações", () => {
    it("deve mostrar botões de ação quando showActions é true", () => {
      render(<EvaluationCard {...defaultProps} showActions />);

      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    });

    it("deve chamar onView quando botão de visualizar é clicado", async () => {
      const user = userEvent.setup();
      const mockOnView = jest.fn();

      render(
        <EvaluationCard {...defaultProps} showActions onView={mockOnView} />,
      );

      const viewButton = screen.getByRole("button");
      await user.click(viewButton);

      expect(mockOnView).toHaveBeenCalledWith(mockEvaluation);
    });

    it("deve chamar onAttendantClick quando atendente é clicado", async () => {
      const user = userEvent.setup();
      const mockOnAttendantClick = jest.fn();

      render(
        <EvaluationCard
          {...defaultProps}
          onAttendantClick={mockOnAttendantClick}
        />,
      );

      const attendantButton = screen.getByRole("button");
      await user.click(attendantButton);

      expect(mockOnAttendantClick).toHaveBeenCalledWith(mockAttendant);
    });
  });

  describe("Modo compacto", () => {
    it("deve aplicar estilos compactos quando compact é true", () => {
      render(<EvaluationCard {...defaultProps} compact />);

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("p-3");
    });

    it("deve ocultar elementos não essenciais em modo compacto", () => {
      render(<EvaluationCard {...defaultProps} compact />);

      // Tags não devem aparecer em modo compacto
      expect(screen.queryByText("excelente")).not.toBeInTheDocument();
      expect(screen.queryByText("satisfeito")).not.toBeInTheDocument();
    });
  });

  describe("Estados especiais", () => {
    it("deve lidar com comentário vazio", () => {
      const propsWithoutComment = {
        ...defaultProps,
        evaluation: { ...mockEvaluation, comment: "" },
      };

      render(<EvaluationCard {...propsWithoutComment} />);

      expect(screen.getByText("Sem comentário")).toBeInTheDocument();
    });

    it("deve lidar com tags vazias", () => {
      const propsWithoutTags = {
        ...defaultProps,
        evaluation: { ...mockEvaluation, tags: [] },
      };

      render(<EvaluationCard {...propsWithoutTags} />);

      // Não deve mostrar seção de tags
      expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
    });

    it("deve lidar com XP não definido", () => {
      const propsWithoutXP = {
        ...defaultProps,
        evaluation: { ...mockEvaluation, xpGained: undefined },
      };

      render(<EvaluationCard {...propsWithoutXP} />);

      expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    });

    it("deve lidar com sentimento não definido", () => {
      const propsWithoutSentiment = {
        ...defaultProps,
        evaluation: {
          ...mockEvaluation,
          sentiment: undefined,
          confidence: undefined,
        },
      };

      render(<EvaluationCard {...propsWithoutSentiment} />);

      expect(
        screen.queryByTestId("sentiment-analysis"),
      ).not.toBeInTheDocument();
    });
  });
});

describe("EvaluationsList", () => {
  const mockEvaluations = [
    {
      evaluation: {
        id: "eval-1",
        rating: 5,
        comment: "Excelente!",
        createdAt: "2024-01-15T10:30:00Z",
        sentiment: "positive" as const,
        confidence: 90,
        tags: ["excelente"],
        xpGained: 50,
      },
      attendant: {
        id: "att-1",
        nome: "João Silva",
        setor: "Vendas",
      },
    },
    {
      evaluation: {
        id: "eval-2",
        rating: 3,
        comment: "Regular",
        createdAt: "2024-01-14T15:20:00Z",
        sentiment: "neutral" as const,
        confidence: 70,
        tags: [],
        xpGained: 20,
      },
      attendant: {
        id: "att-2",
        nome: "Maria Santos",
        setor: "Suporte",
      },
    },
  ];

  describe("Renderização da lista", () => {
    it("deve renderizar todas as avaliações", () => {
      render(<EvaluationsList evaluations={mockEvaluations} />);

      expect(screen.getByText("João Silva")).toBeInTheDocument();
      expect(screen.getByText("Maria Santos")).toBeInTheDocument();
      expect(screen.getByText("Excelente!")).toBeInTheDocument();
      expect(screen.getByText("Regular")).toBeInTheDocument();
    });

    it("deve mostrar mensagem quando lista está vazia", () => {
      render(<EvaluationsList evaluations={[]} />);

      expect(
        screen.getByText("Nenhuma avaliação encontrada"),
      ).toBeInTheDocument();
    });

    it("deve mostrar estado de loading", () => {
      render(<EvaluationsList evaluations={[]} loading />);

      expect(screen.getByText("Carregando avaliações...")).toBeInTheDocument();
    });

    it("deve mostrar mensagem de erro", () => {
      render(<EvaluationsList evaluations={[]} error="Erro ao carregar" />);

      expect(screen.getByText("Erro ao carregar")).toBeInTheDocument();
    });
  });

  describe("Configurações da lista", () => {
    it("deve aplicar props aos cards filhos", () => {
      render(
        <EvaluationsList evaluations={mockEvaluations} showActions compact />,
      );

      const cards = screen.getAllByTestId("card");
      cards.forEach((card) => {
        expect(card).toHaveClass("p-3"); // Classe do modo compacto
      });
    });

    it("deve propagar eventos para cards filhos", async () => {
      const user = userEvent.setup();
      const mockOnView = jest.fn();

      render(
        <EvaluationsList
          evaluations={mockEvaluations}
          showActions
          onView={mockOnView}
        />,
      );

      const viewButtons = screen.getAllByRole("button");
      await user.click(viewButtons[0]);

      expect(mockOnView).toHaveBeenCalledWith(mockEvaluations[0].evaluation);
    });
  });
});

describe("CompactEvaluationCard", () => {
  const mockProps = {
    evaluation: {
      id: "eval-1",
      rating: 4,
      comment: "Bom atendimento",
      createdAt: "2024-01-15T10:30:00Z",
      sentiment: "positive" as const,
      confidence: 80,
      tags: ["bom"],
      xpGained: 30,
    },
    attendant: {
      id: "att-1",
      nome: "João Silva",
      setor: "Vendas",
    },
  };

  it("deve renderizar em modo compacto por padrão", () => {
    render(<CompactEvaluationCard {...mockProps} />);

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("p-3");
  });

  it("deve aceitar props adicionais", () => {
    const mockOnView = jest.fn();
    render(
      <CompactEvaluationCard {...mockProps} showActions onView={mockOnView} />,
    );

    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
  });
});

describe("SimpleEvaluationCard", () => {
  const mockProps = {
    evaluation: {
      id: "eval-1",
      rating: 5,
      comment: "Perfeito!",
      createdAt: "2024-01-15T10:30:00Z",
      sentiment: "positive" as const,
      confidence: 95,
      tags: ["perfeito"],
      xpGained: 60,
    },
    attendant: {
      id: "att-1",
      nome: "Ana Costa",
      setor: "Atendimento",
    },
  };

  it("deve renderizar sem ações por padrão", () => {
    render(<SimpleEvaluationCard {...mockProps} />);

    expect(screen.queryByTestId("eye-icon")).not.toBeInTheDocument();
  });

  it("deve aceitar props adicionais", () => {
    render(<SimpleEvaluationCard {...mockProps} compact />);

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("p-3");
  });
});

describe("Utilitários", () => {
  describe("formatDate", () => {
    it("deve formatar data corretamente", () => {
      // Esta função é testada indiretamente através dos componentes
      render(
        <EvaluationCard
          evaluation={{
            id: "eval-1",
            rating: 4,
            comment: "Teste",
            createdAt: "2024-12-25T15:30:45Z",
            sentiment: "positive",
            confidence: 80,
            tags: [],
            xpGained: 10,
          }}
          attendant={{
            id: "att-1",
            nome: "Teste",
            setor: "Teste",
          }}
        />,
      );

      expect(screen.getByText("25/12/2024")).toBeInTheDocument();
    });
  });

  describe("getInitials", () => {
    it("deve gerar iniciais corretamente", () => {
      // Testado indiretamente através do componente
      render(
        <EvaluationCard
          evaluation={{
            id: "eval-1",
            rating: 4,
            comment: "Teste",
            createdAt: "2024-01-15T10:30:00Z",
            sentiment: "positive",
            confidence: 80,
            tags: [],
            xpGained: 10,
          }}
          attendant={{
            id: "att-1",
            nome: "Pedro Paulo Santos",
            setor: "Teste",
          }}
        />,
      );

      expect(screen.getByText("PS")).toBeInTheDocument();
    });
  });
});

describe("Acessibilidade", () => {
  const mockProps = {
    evaluation: {
      id: "eval-1",
      rating: 4,
      comment: "Teste de acessibilidade",
      createdAt: "2024-01-15T10:30:00Z",
      sentiment: "positive" as const,
      confidence: 80,
      tags: ["teste"],
      xpGained: 25,
    },
    attendant: {
      id: "att-1",
      nome: "João Silva",
      setor: "Teste",
    },
  };

  it("deve ter estrutura semântica correta", () => {
    render(<EvaluationCard {...mockProps} />);

    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("role", "article");
  });

  it("deve ter textos alternativos para imagens", () => {
    const propsWithAvatar = {
      ...mockProps,
      attendant: {
        ...mockProps.attendant,
        avatar: "https://example.com/avatar.jpg",
      },
    };

    render(<EvaluationCard {...propsWithAvatar} />);

    const avatarImage = screen.getByTestId("avatar-image");
    expect(avatarImage).toHaveAttribute("alt", "João Silva");
  });

  it("deve ter botões com labels descritivos", () => {
    render(<EvaluationCard {...mockProps} showActions />);

    const viewButton = screen.getByRole("button");
    expect(viewButton).toHaveAttribute("aria-label", "Visualizar avaliação");
  });
});
