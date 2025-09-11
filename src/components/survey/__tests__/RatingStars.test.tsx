import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RatingStars, { RatingDisplay, useRating } from "../RatingStars";
import { renderHook, act } from "@testing-library/react";

// Mock do ícone Lucide
jest.mock("lucide-react", () => ({
  Star: ({ className, fill, ...props }: any) => (
    <svg
      data-testid="star-icon"
      className={className}
      data-fill={fill}
      {...props}
    />
  ),
}));

describe("RatingStars", () => {
  describe("Renderização básica", () => {
    it("deve renderizar 5 estrelas por padrão", () => {
      render(<RatingStars />);

      const stars = screen.getAllByRole("button");
      expect(stars).toHaveLength(5);
    });

    it("deve destacar estrelas no hover", () => {
      render(<RatingStars value={2} onChange={() => {}} />);

      const thirdStar = screen.getAllByRole("button")[2];
      fireEvent.mouseEnter(thirdStar);

      // Verifica se as primeiras 3 estrelas estão destacadas
      const stars = screen.getAllByRole("button");
      for (let i = 0; i < 3; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-yellow-400"); // Cor de hover
      }
      for (let i = 3; i < 5; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-gray-200"); // Cor de hover vazia
      }
    });

    it("deve remover destaque ao sair do hover", () => {
      render(<RatingStars value={2} onChange={() => {}} />);

      const thirdStar = screen.getAllByRole("button")[2];

      // Hover e depois sair
      fireEvent.mouseEnter(thirdStar);
      fireEvent.mouseLeave(thirdStar);

      // Verifica se voltou ao estado original (value=2)
      const stars = screen.getAllByRole("button");
      for (let i = 0; i < 2; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-yellow-500"); // Cor normal preenchida
      }
      for (let i = 2; i < 5; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-gray-100"); // Cor normal vazia
      }
    });

    it("deve renderizar com valor inicial", () => {
      render(<RatingStars value={3} />);

      const stars = screen.getAllByRole("button");

      // Primeiras 3 estrelas devem estar preenchidas
      for (let i = 0; i < 3; i++) {
        const star = stars[i].querySelector("svg");
        expect(star).toHaveClass("fill-yellow-500");
      }

      // Últimas 2 estrelas devem estar vazias
      for (let i = 3; i < 5; i++) {
        const star = stars[i].querySelector("svg");
        expect(star).toHaveClass("fill-gray-100");
      }
    });
  });

  describe("Componente RatingStars", () => {
    it("deve chamar onChange quando uma estrela é clicada (modo interativo)", () => {
      const handleChange = jest.fn();
      render(<RatingStars value={2} onChange={handleChange} />);

      const stars = screen.getAllByRole("button");
      fireEvent.click(stars[3]); // Clica na 4ª estrela (índice 3)

      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it("não deve chamar onChange quando readOnly é true", () => {
      const handleChange = jest.fn();
      render(<RatingStars value={2} onChange={handleChange} readOnly />);

      const stars = screen.getAllByRole("button");
      fireEvent.click(stars[3]);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it("deve aplicar classes CSS corretas para diferentes tamanhos", () => {
      const { rerender } = render(<RatingStars value={3} size="sm" />);
      let stars = screen.getAllByRole("button");

      // Verificar se as estrelas pequenas têm o tamanho correto
      stars.forEach((star) => {
        const svg = star.querySelector("svg");
        expect(svg).toHaveClass("w-4", "h-4");
      });

      rerender(<RatingStars value={3} size="lg" />);
      stars = screen.getAllByRole("button");

      // Verificar se as estrelas grandes têm o tamanho correto
      stars.forEach((star) => {
        const svg = star.querySelector("svg");
        expect(svg).toHaveClass("w-6", "h-6");
      });
    });

    it("deve renderizar com allowHalf", () => {
      render(<RatingStars value={2.5} allowHalf />);
      const stars = screen.getAllByRole("button");

      expect(stars).toHaveLength(5);

      // Verificar se as primeiras 2 estrelas estão preenchidas
      for (let i = 0; i < 2; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-yellow-500");
      }
    });

    it("deve renderizar corretamente com diferentes valores", () => {
      render(<RatingStars value={3} />);
      const stars = screen.getAllByRole("button");

      expect(stars).toHaveLength(5);

      // Verificar se as primeiras 3 estrelas estão preenchidas
      for (let i = 0; i < 3; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-yellow-500");
      }
    });

    it("deve mostrar valor quando showValue é true", () => {
      render(<RatingStars value={3} showValue />);

      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("Componente RatingDisplay", () => {
    it("deve renderizar rating corretamente", () => {
      render(<RatingDisplay value={4} />);

      const stars = screen.getAllByRole("button");
      expect(stars).toHaveLength(5);

      // Verificar se as primeiras 4 estrelas estão preenchidas
      for (let i = 0; i < 4; i++) {
        const svg = stars[i].querySelector("svg");
        expect(svg).toHaveClass("fill-yellow-500");
      }

      // Verificar se a última estrela está vazia
      const lastSvg = stars[4].querySelector("svg");
      expect(lastSvg).toHaveClass("fill-gray-100");
    });
  });

  describe("Hook useRating", () => {
    it("deve inicializar com rating padrão", () => {
      const { result } = renderHook(() => useRating());

      expect(result.current.rating).toBe(0);
      expect(result.current.hoverValue).toBe(null);
      expect(result.current.isHovering).toBe(false);
    });

    it("deve inicializar com valor personalizado", () => {
      const { result } = renderHook(() => useRating(3));

      expect(result.current.rating).toBe(3);
      expect(result.current.hoverValue).toBe(null);
    });

    it("deve atualizar rating", () => {
      const { result } = renderHook(() => useRating());

      act(() => {
        result.current.setRating(4);
      });

      expect(result.current.rating).toBe(4);
    });

    it("deve gerenciar hover", () => {
      const { result } = renderHook(() => useRating());

      act(() => {
        result.current.onHover(3);
      });

      expect(result.current.hoverValue).toBe(3);
      expect(result.current.isHovering).toBe(true);
    });

    it("deve limpar hover", () => {
      const { result } = renderHook(() => useRating());

      act(() => {
        result.current.onHover(3);
      });

      act(() => {
        result.current.onHover(null);
      });

      expect(result.current.hoverValue).toBe(null);
      expect(result.current.isHovering).toBe(false);
    });

    it("deve resetar valores", () => {
      const { result } = renderHook(() => useRating(3));

      act(() => {
        result.current.reset();
      });

      expect(result.current.rating).toBe(0);
      expect(result.current.hoverValue).toBe(null);
      expect(result.current.isHovering).toBe(false);
    });

    it("deve calcular displayValue corretamente", () => {
      const { result } = renderHook(() => useRating(2));

      expect(result.current.displayValue).toBe(2);

      act(() => {
        result.current.onHover(4);
      });

      expect(result.current.displayValue).toBe(4);
    });

    it("deve permitir valores negativos e altos", () => {
      const { result } = renderHook(() => useRating());

      act(() => {
        result.current.setRating(10);
      });

      expect(result.current.rating).toBe(10);

      act(() => {
        result.current.setRating(-1);
      });

      expect(result.current.rating).toBe(-1);
    });
  });

  describe("Acessibilidade", () => {
    it("deve ter botões desabilitados quando disabled", () => {
      render(<RatingStars value={3} disabled />);
      const stars = screen.getAllByRole("button");

      stars.forEach((star) => {
        expect(star).toBeDisabled();
      });
    });

    it("deve permitir clique nos botões", () => {
      const handleChange = jest.fn();
      render(<RatingStars value={2} onChange={handleChange} />);

      const thirdStar = screen.getAllByRole("button")[2];

      // Simular clique normal
      fireEvent.click(thirdStar);
      expect(handleChange).toHaveBeenCalledWith(3);
    });

    it("deve ter foco nos botões", () => {
      render(<RatingStars value={2} onChange={() => {}} />);

      const stars = screen.getAllByRole("button");

      // Verificar se os botões podem receber foco
      stars.forEach((star) => {
        expect(star).not.toHaveAttribute("tabIndex", "-1");
      });
    });

    it("deve ter aria-label correto nos botões", () => {
      render(<RatingStars value={3} />);
      const stars = screen.getAllByRole("button");

      stars.forEach((star, index) => {
        const rating = index + 1;
        expect(star).toHaveAttribute(
          "aria-label",
          `Avaliar com ${rating} estrela${rating > 1 ? "s" : ""}`,
        );
      });
    });
  });

  describe("Casos extremos", () => {
    it("deve lidar com rating 0", () => {
      render(<RatingStars value={0} />);
      const stars = screen.getAllByRole("button");

      stars.forEach((star) => {
        const svg = star.querySelector("svg");
        expect(svg).toHaveClass("fill-gray-100");
      });
    });

    it("deve lidar com rating maior que 5", () => {
      render(<RatingStars value={10} />);
      const stars = screen.getAllByRole("button");

      // Todas as 5 estrelas devem estar preenchidas
      stars.forEach((star) => {
        const svg = star.querySelector("svg");
        expect(svg).toHaveClass("fill-yellow-500");
      });
    });

    it("deve lidar com rating negativo", () => {
      render(<RatingStars value={-2} />);
      const stars = screen.getAllByRole("button");

      stars.forEach((star) => {
        const svg = star.querySelector("svg");
        expect(svg).toHaveClass("fill-gray-100");
      });
    });

    it("deve renderizar sempre 5 estrelas", () => {
      render(<RatingStars value={3} />);

      const stars = screen.getAllByRole("button");

      expect(stars).toHaveLength(5);

      // Primeiras 3 estrelas preenchidas
      for (let i = 0; i < 3; i++) {
        const star = stars[i].querySelector("svg");
        expect(star).toHaveClass("fill-yellow-500");
      }

      // Últimas 2 estrelas vazias
      for (let i = 3; i < 5; i++) {
        const star = stars[i].querySelector("svg");
        expect(star).toHaveClass("fill-gray-100");
      }
    });
  });
});
