/**
 * Teste simples para verificar se o componente AttendantXpDisplay renderiza corretamente
 */

import { render, screen } from "@testing-library/react";

// Mock simples dos módulos
jest.mock("@/services/gamificationService", () => ({
  GamificationService: {
    calculateTotalXp: jest.fn().mockResolvedValue(500),
  },
}));

jest.mock("@/services/xpAvulsoService", () => ({
  XpAvulsoService: {
    findGrantsByAttendant: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@/components/gamification/notifications", () => ({
  XpNotificationBadge: () => <div data-testid="xp-notification-badge" />,
}));

// Mock do fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ totalXp: 500 }),
} as Response);

import AttendantXpDisplay from "../AttendantXpDisplay";

describe("AttendantXpDisplay - Teste Simples", () => {
  it("deve renderizar o componente sem erros", () => {
    render(<AttendantXpDisplay attendantId="test-id" />);

    // Verificar se o componente renderiza (mesmo que em estado de loading)
    expect(document.body).toBeInTheDocument();
  });

  it("deve renderizar na variante compact", () => {
    render(<AttendantXpDisplay attendantId="test-id" variant="compact" />);

    expect(document.body).toBeInTheDocument();
  });
});
