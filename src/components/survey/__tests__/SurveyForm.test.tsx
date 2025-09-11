import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import SurveyForm from "../SurveyForm";
import { SurveyFormData } from "../types";

// Mock dos componentes UI
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, type, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

// Mock do RatingStars
jest.mock("../RatingStars", () => {
  return function MockRatingStars({ rating, onChange, readonly }: any) {
    return (
      <div data-testid="rating-stars">
        <span>Rating: {rating}</span>
        {!readonly && (
          <button onClick={() => onChange?.(5)}>Set 5 stars</button>
        )}
      </div>
    );
  };
});

describe("SurveyForm", () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    attendantId: "att-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Renderização", () => {
    it("deve renderizar todos os campos obrigatórios", () => {
      render(<SurveyForm {...defaultProps} />);

      expect(screen.getByText("Avaliação de Atendimento")).toBeInTheDocument();
      expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Conte-nos sobre sua experiência..."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /enviar avaliação/i }),
      ).toBeInTheDocument();
    });

    it("deve renderizar título personalizado quando fornecido", () => {
      render(<SurveyForm {...defaultProps} title="Título Personalizado" />);

      expect(screen.getByText("Título Personalizado")).toBeInTheDocument();
    });

    it("deve renderizar descrição personalizada quando fornecida", () => {
      render(
        <SurveyForm {...defaultProps} description="Descrição personalizada" />,
      );

      expect(screen.getByText("Descrição personalizada")).toBeInTheDocument();
    });

    it("deve mostrar campos opcionais quando showOptionalFields é true", () => {
      render(<SurveyForm {...defaultProps} showOptionalFields />);

      expect(
        screen.getByPlaceholderText("Seu nome (opcional)"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Seu email (opcional)"),
      ).toBeInTheDocument();
    });

    it("deve mostrar campo de sugestões quando showSuggestions é true", () => {
      render(<SurveyForm {...defaultProps} showSuggestions />);

      expect(
        screen.getByPlaceholderText(
          "Sugestões para melhorar nosso atendimento...",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Interações do usuário", () => {
    it("deve atualizar rating quando estrelas são clicadas", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} />);

      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      expect(screen.getByText("Rating: 5")).toBeInTheDocument();
    });

    it("deve atualizar comentário quando texto é digitado", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} />);

      const commentTextarea = screen.getByPlaceholderText(
        "Conte-nos sobre sua experiência...",
      );
      await user.type(commentTextarea, "Excelente atendimento!");

      expect(commentTextarea).toHaveValue("Excelente atendimento!");
    });

    it("deve atualizar campos opcionais quando preenchidos", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} showOptionalFields />);

      const nameInput = screen.getByPlaceholderText("Seu nome (opcional)");
      const emailInput = screen.getByPlaceholderText("Seu email (opcional)");

      await user.type(nameInput, "João Silva");
      await user.type(emailInput, "joao@email.com");

      expect(nameInput).toHaveValue("João Silva");
      expect(emailInput).toHaveValue("joao@email.com");
    });
  });

  describe("Validação", () => {
    it("deve desabilitar botão de envio quando rating não está definido", () => {
      render(<SurveyForm {...defaultProps} />);

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("deve habilitar botão de envio quando rating está definido", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} />);

      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      expect(submitButton).not.toBeDisabled();
    });

    it("deve validar email quando fornecido", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} showOptionalFields />);

      const emailInput = screen.getByPlaceholderText("Seu email (opcional)");
      await user.type(emailInput, "email-invalido");

      // Simular blur para trigger validação
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText("Email inválido")).toBeInTheDocument();
      });
    });

    it("deve mostrar erro quando comentário excede limite de caracteres", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} maxCommentLength={50} />);

      const commentTextarea = screen.getByPlaceholderText(
        "Conte-nos sobre sua experiência...",
      );
      const longComment = "a".repeat(51);

      await user.type(commentTextarea, longComment);

      await waitFor(() => {
        expect(screen.getByText(/comentário muito longo/i)).toBeInTheDocument();
      });
    });
  });

  describe("Submissão do formulário", () => {
    it("deve chamar onSubmit com dados corretos quando formulário é válido", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<SurveyForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Definir rating
      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      // Adicionar comentário
      const commentTextarea = screen.getByPlaceholderText(
        "Conte-nos sobre sua experiência...",
      );
      await user.type(commentTextarea, "Ótimo atendimento!");

      // Submeter formulário
      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        rating: 5,
        comment: "Ótimo atendimento!",
        attendantId: "att-123",
      });
    });

    it("deve incluir campos opcionais quando preenchidos", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(
        <SurveyForm
          {...defaultProps}
          onSubmit={mockOnSubmit}
          showOptionalFields
          showSuggestions
        />,
      );

      // Preencher todos os campos
      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      await user.type(
        screen.getByPlaceholderText("Conte-nos sobre sua experiência..."),
        "Comentário",
      );
      await user.type(
        screen.getByPlaceholderText("Seu nome (opcional)"),
        "João",
      );
      await user.type(
        screen.getByPlaceholderText("Seu email (opcional)"),
        "joao@email.com",
      );
      await user.type(
        screen.getByPlaceholderText(
          "Sugestões para melhorar nosso atendimento...",
        ),
        "Sugestão",
      );

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        rating: 5,
        comment: "Comentário",
        attendantId: "att-123",
        customerName: "João",
        customerEmail: "joao@email.com",
        suggestions: "Sugestão",
      });
    });

    it("deve mostrar estado de loading durante submissão", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(<SurveyForm {...defaultProps} onSubmit={mockOnSubmit} />);

      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      await user.click(submitButton);

      expect(screen.getByText(/enviando/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it("deve resetar formulário após submissão bem-sucedida", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

      render(<SurveyForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Preencher e submeter
      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      const commentTextarea = screen.getByPlaceholderText(
        "Conte-nos sobre sua experiência...",
      );
      await user.type(commentTextarea, "Comentário");

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Rating: 0")).toBeInTheDocument();
        expect(commentTextarea).toHaveValue("");
      });
    });
  });

  describe("Estados especiais", () => {
    it("deve renderizar em modo readonly quando especificado", () => {
      render(<SurveyForm {...defaultProps} readonly />);

      const submitButton = screen.queryByRole("button", {
        name: /enviar avaliação/i,
      });
      expect(submitButton).not.toBeInTheDocument();
    });

    it("deve carregar dados iniciais quando fornecidos", () => {
      const initialData: Partial<SurveyFormData> = {
        rating: 4,
        comment: "Comentário inicial",
        customerName: "João",
      };

      render(
        <SurveyForm
          {...defaultProps}
          initialData={initialData}
          showOptionalFields
        />,
      );

      expect(screen.getByText("Rating: 4")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Comentário inicial"),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("João")).toBeInTheDocument();
    });

    it("deve mostrar mensagem de sucesso após submissão", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

      render(
        <SurveyForm
          {...defaultProps}
          onSubmit={mockOnSubmit}
          showSuccessMessage
        />,
      );

      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/avaliação enviada com sucesso/i),
        ).toBeInTheDocument();
      });
    });

    it("deve mostrar mensagem de erro quando submissão falha", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest
        .fn()
        .mockRejectedValue(new Error("Erro de rede"));

      render(<SurveyForm {...defaultProps} onSubmit={mockOnSubmit} />);

      const setRatingButton = screen.getByText("Set 5 stars");
      await user.click(setRatingButton);

      const submitButton = screen.getByRole("button", {
        name: /enviar avaliação/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/erro ao enviar avaliação/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Acessibilidade", () => {
    it("deve ter labels associados aos campos", () => {
      render(<SurveyForm {...defaultProps} showOptionalFields />);

      expect(screen.getByLabelText(/avaliação/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/comentário/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("deve ter estrutura semântica correta", () => {
      render(<SurveyForm {...defaultProps} />);

      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it("deve mostrar mensagens de erro com aria-describedby", async () => {
      const user = userEvent.setup();
      render(<SurveyForm {...defaultProps} showOptionalFields />);

      const emailInput = screen.getByPlaceholderText("Seu email (opcional)");
      await user.type(emailInput, "email-invalido");
      fireEvent.blur(emailInput);

      await waitFor(() => {
        const errorMessage = screen.getByText("Email inválido");
        expect(errorMessage).toHaveAttribute("role", "alert");
      });
    });
  });

  describe("Responsividade", () => {
    it("deve aplicar classes responsivas corretas", () => {
      render(<SurveyForm {...defaultProps} />);

      const form = screen.getByRole("form");
      expect(form).toHaveClass("w-full", "max-w-2xl");
    });

    it("deve adaptar layout em modo compacto", () => {
      render(<SurveyForm {...defaultProps} compact />);

      const form = screen.getByRole("form");
      expect(form).toHaveClass("max-w-md");
    });
  });
});
