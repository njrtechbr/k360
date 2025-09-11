/**
 * Testes para o ApiProvider
 * Verifica se o provider está funcionando corretamente com hooks de API
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { ApiProvider, useApi } from "../ApiProvider";
import * as httpClientModule from "@/lib/httpClient";

// Mock das dependências
jest.mock("next-auth/react");
jest.mock("@/lib/httpClient");
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockHttpClient = httpClientModule.httpClient as jest.Mocked<
  typeof httpClientModule.httpClient
>;

// Componente de teste que usa o hook
const TestComponent = () => {
  const api = useApi();

  return (
    <div>
      <div data-testid="auth-status">
        {api.isAuthenticated ? "authenticated" : "not-authenticated"}
      </div>
      <div data-testid="loading-status">
        {api.isAnyLoading ? "loading" : "not-loading"}
      </div>
      <div data-testid="error-status">
        {api.hasAnyError ? "has-error" : "no-error"}
      </div>
      <div data-testid="attendants-count">
        {api.attendants.data?.length || 0}
      </div>
    </div>
  );
};

describe("ApiProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock padrão do httpClient
    mockHttpClient.get.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it("deve renderizar sem erros", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: jest.fn(),
    });

    render(
      <ApiProvider>
        <div>Test</div>
      </ApiProvider>,
    );

    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("deve fornecer contexto correto quando não autenticado", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: jest.fn(),
    });

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent(
      "not-authenticated",
    );
  });

  it("deve fornecer contexto correto quando autenticado", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: "ADMIN",
        },
      },
      status: "authenticated",
      update: jest.fn(),
    });

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>,
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent(
      "authenticated",
    );
  });

  it("deve buscar dados quando autenticado", async () => {
    const mockAttendants = [
      { id: "1", name: "Attendant 1", email: "att1@test.com" },
      { id: "2", name: "Attendant 2", email: "att2@test.com" },
    ];

    mockHttpClient.get.mockImplementation((url) => {
      if (url === "/api/attendants") {
        return Promise.resolve({
          success: true,
          data: mockAttendants,
        });
      }
      return Promise.resolve({
        success: true,
        data: [],
      });
    });

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: "ADMIN",
        },
      },
      status: "authenticated",
      update: jest.fn(),
    });

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("attendants-count")).toHaveTextContent("2");
    });
  });

  it("deve tratar erros de API corretamente", async () => {
    mockHttpClient.get.mockRejectedValue(new Error("API Error"));

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: "ADMIN",
        },
      },
      status: "authenticated",
      update: jest.fn(),
    });

    render(
      <ApiProvider>
        <TestComponent />
      </ApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error-status")).toHaveTextContent("has-error");
    });
  });

  it("deve lançar erro quando usado fora do provider", () => {
    // Suprimir console.error para este teste
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useApi deve ser usado dentro de um ApiProvider");

    consoleSpy.mockRestore();
  });

  it("deve calcular temporada ativa corretamente", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const mockSeasons = [
      {
        id: "1",
        name: "Temporada Ativa",
        active: true,
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString(),
      },
      {
        id: "2",
        name: "Temporada Futura",
        active: true,
        startDate: tomorrow.toISOString(),
        endDate: new Date(
          tomorrow.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    ];

    mockHttpClient.get.mockImplementation((url) => {
      if (url === "/api/gamification/seasons") {
        return Promise.resolve({
          success: true,
          data: mockSeasons,
        });
      }
      return Promise.resolve({
        success: true,
        data: [],
      });
    });

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: "ADMIN",
        },
      },
      status: "authenticated",
      update: jest.fn(),
    });

    const TestSeasonComponent = () => {
      const api = useApi();
      return (
        <div>
          <div data-testid="active-season">
            {api.activeSeason?.name || "none"}
          </div>
          <div data-testid="next-season">{api.nextSeason?.name || "none"}</div>
        </div>
      );
    };

    render(
      <ApiProvider>
        <TestSeasonComponent />
      </ApiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-season")).toHaveTextContent(
        "Temporada Ativa",
      );
      expect(screen.getByTestId("next-season")).toHaveTextContent(
        "Temporada Futura",
      );
    });
  });
});
