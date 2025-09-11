import { render, screen, waitFor } from "@testing-library/react";
import AttendantXpDisplay from "../AttendantXpDisplay";

// Mock dos serviços
jest.mock("@/services/gamificationService", () => ({
  GamificationService: {
    calculateTotalXp: jest.fn(),
  },
}));

jest.mock("@/services/xpAvulsoService", () => ({
  XpAvulsoService: {
    findGrantsByAttendant: jest.fn(),
  },
}));

jest.mock("@/components/gamification/notifications", () => ({
  XpNotificationBadge: () => <div data-testid="xp-notification-badge" />,
}));

// Mock do fetch global
global.fetch = jest.fn();

describe("AttendantXpDisplay", () => {
  const mockAttendantId = "test-attendant-id";

  const mockXpGrant = {
    id: "grant-1",
    attendantId: mockAttendantId,
    typeId: "type-1",
    points: 100,
    justification: "Excelente atendimento",
    grantedBy: "admin-1",
    grantedAt: new Date("2024-01-15T10:00:00Z"),
    xpEventId: "event-1",
    attendant: {
      id: mockAttendantId,
      name: "João Silva",
      email: "joao@test.com",
    },
    type: {
      id: "type-1",
      name: "Excelência no Atendimento",
      description: "Reconhecimento por atendimento excepcional",
      points: 100,
      active: true,
      category: "performance",
      icon: "star",
      color: "#FFD700",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin-1",
    },
    granter: {
      id: "admin-1",
      name: "Admin User",
      email: "admin@test.com",
      role: "ADMIN" as const,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock das respostas da API
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (typeof url === "string") {
        if (url.includes("/xp-total")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalXp: 500 }),
          } as Response);
        }
        if (url.includes("/xp-grants/attendant/")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockXpGrant]),
          } as Response);
        }
        if (
          url.includes("/xp-events/attendant/") &&
          url.includes("type=evaluation")
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: "event-1", points: 400, type: "evaluation" },
              ]),
          } as Response);
        }
      }
      return Promise.reject(new Error("URL não mockada"));
    });
  });

  it("deve renderizar o componente com dados de XP", async () => {
    render(<AttendantXpDisplay attendantId={mockAttendantId} />);

    // Verificar se o loading aparece inicialmente
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();

    // Aguardar o carregamento dos dados
    await waitFor(() => {
      expect(screen.getByText("Experiência (XP)")).toBeInTheDocument();
    });

    // Verificar se os dados são exibidos corretamente
    expect(screen.getByText("500")).toBeInTheDocument(); // XP Total
    expect(screen.getByText("400")).toBeInTheDocument(); // XP de Avaliações
    expect(screen.getByText("100")).toBeInTheDocument(); // XP Avulso
  });

  it("deve exibir o histórico de XP avulso quando showHistory é true", async () => {
    render(
      <AttendantXpDisplay attendantId={mockAttendantId} showHistory={true} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Histórico de XP Avulso")).toBeInTheDocument();
    });

    // Verificar se os dados do grant são exibidos
    expect(screen.getByText("Excelência no Atendimento")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Excelente atendimento")).toBeInTheDocument();
  });

  it("deve renderizar na variante compact", async () => {
    render(
      <AttendantXpDisplay attendantId={mockAttendantId} variant="compact" />,
    );

    await waitFor(() => {
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    // Na variante compact, não deve mostrar o histórico detalhado
    expect(
      screen.queryByText("Histórico de XP Avulso"),
    ).not.toBeInTheDocument();
  });

  it("deve exibir mensagem quando não há XP avulso", async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (typeof url === "string") {
        if (url.includes("/xp-total")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalXp: 400 }),
          } as Response);
        }
        if (url.includes("/xp-grants/attendant/")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          } as Response);
        }
        if (
          url.includes("/xp-events/attendant/") &&
          url.includes("type=evaluation")
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: "event-1", points: 400, type: "evaluation" },
              ]),
          } as Response);
        }
      }
      return Promise.reject(new Error("URL não mockada"));
    });

    render(<AttendantXpDisplay attendantId={mockAttendantId} />);

    await waitFor(() => {
      expect(screen.getByText("Nenhum XP avulso recebido")).toBeInTheDocument();
    });
  });

  it("deve exibir erro quando falha ao carregar dados", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Erro de rede"));

    render(<AttendantXpDisplay attendantId={mockAttendantId} />);

    await waitFor(() => {
      expect(
        screen.getByText("Erro ao carregar dados de XP"),
      ).toBeInTheDocument();
    });
  });

  it("deve calcular corretamente as porcentagens de XP", async () => {
    render(<AttendantXpDisplay attendantId={mockAttendantId} />);

    await waitFor(() => {
      // XP de avaliações: 400/500 = 80%
      expect(screen.getByText("80.0% do total")).toBeInTheDocument();
      // XP avulso: 100/500 = 20%
      expect(screen.getByText("20.0% do total")).toBeInTheDocument();
    });
  });

  it("deve exibir estatísticas corretas na seção de estatísticas", async () => {
    render(<AttendantXpDisplay attendantId={mockAttendantId} />);

    await waitFor(() => {
      expect(screen.getByText("Estatísticas")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument(); // 1 concessão
      expect(screen.getByText("100 XP")).toBeInTheDocument(); // Média por concessão
      expect(screen.getByText("20.0%")).toBeInTheDocument(); // % XP Avulso
    });
  });
});
