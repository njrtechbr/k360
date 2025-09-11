import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

describe("Gamification Components Integration", () => {
  it("should use ApiProvider instead of PrismaProvider in main gamification page", () => {
    const filePath = join(
      process.cwd(),
      "src/app/dashboard/gamificacao/page.tsx",
    );
    const componentCode = readFileSync(filePath, "utf-8");

    // Verify ApiProvider usage
    expect(componentCode).toContain("useApi");
    expect(componentCode).toContain('from "@/providers/ApiProvider"');

    // Verify no PrismaProvider usage
    expect(componentCode).not.toContain("PrismaProvider");
    expect(componentCode).not.toContain("usePrisma");

    // Verify API operations usage
    expect(componentCode).toContain("attendants");
    expect(componentCode).toContain("seasonXpEvents");
    expect(componentCode).toContain("gamificationConfig");
    expect(componentCode).toContain("achievements");
    expect(componentCode).toContain("activeSeason");

    // Verify loading states
    expect(componentCode).toContain("isAnyLoading");
  });

  it("should use ApiProvider in historico-temporadas page", () => {
    const filePath = join(
      process.cwd(),
      "src/app/dashboard/gamificacao/historico-temporadas/page.tsx",
    );
    const componentCode = readFileSync(filePath, "utf-8");

    // Verify ApiProvider usage
    expect(componentCode).toContain("useApi");
    expect(componentCode).toContain('from "@/providers/ApiProvider"');

    // Verify no PrismaProvider usage
    expect(componentCode).not.toContain("PrismaProvider");
    expect(componentCode).not.toContain("usePrisma");

    // Verify data access through API hooks
    expect(componentCode).toContain("attendants");
    expect(componentCode).toContain("xpEvents");
    expect(componentCode).toContain("seasons");
    expect(componentCode).toContain("isAnyLoading");
  });

  it("should use ApiProvider in niveis page", () => {
    const filePath = join(
      process.cwd(),
      "src/app/dashboard/gamificacao/niveis/page.tsx",
    );
    const componentCode = readFileSync(filePath, "utf-8");

    // Verify ApiProvider usage
    expect(componentCode).toContain("useApi");
    expect(componentCode).toContain('from "@/providers/ApiProvider"');

    // Verify no PrismaProvider usage
    expect(componentCode).not.toContain("PrismaProvider");
    expect(componentCode).not.toContain("usePrisma");

    // Verify data access
    expect(componentCode).toContain("attendants");
    expect(componentCode).toContain("seasonXpEvents");
    expect(componentCode).toContain("isAnyLoading");
  });

  it("should use ApiProvider in conquistas configuration page", () => {
    const filePath = join(
      process.cwd(),
      "src/app/dashboard/gamificacao/configuracoes/conquistas/page.tsx",
    );
    const componentCode = readFileSync(filePath, "utf-8");

    // Verify ApiProvider usage
    expect(componentCode).toContain("useApi");
    expect(componentCode).toContain('from "@/providers/ApiProvider"');

    // Verify no PrismaProvider usage
    expect(componentCode).not.toContain("PrismaProvider");
    expect(componentCode).not.toContain("usePrisma");

    // Verify data access
    expect(componentCode).toContain("attendants");
    expect(componentCode).toContain("seasons");
    expect(componentCode).toContain("xpEvents");
    expect(componentCode).toContain("evaluations");
  });

  it("should use session instead of useAuth in configuration pages", () => {
    const configPages = [
      "src/app/dashboard/gamificacao/configuracoes/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/xp-avulso/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/tipos-xp/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/trofeus/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/niveis/page.tsx",
    ];

    configPages.forEach((pagePath) => {
      const filePath = join(process.cwd(), pagePath);
      const componentCode = readFileSync(filePath, "utf-8");

      // Verify session usage instead of useAuth
      expect(componentCode).toContain("useSession");
      expect(componentCode).toContain('from "next-auth/react"');

      // Verify no useAuth usage
      expect(componentCode).not.toContain("useAuth");
      expect(componentCode).not.toContain('from "@/hooks/useAuth"');

      // Verify session data access
      expect(componentCode).toContain("session?.user");
      expect(componentCode).toContain('status === "loading"');
    });
  });

  it("should use ApiProvider in manual page", () => {
    const filePath = join(
      process.cwd(),
      "src/app/dashboard/gamificacao/manual/page.tsx",
    );
    const componentCode = readFileSync(filePath, "utf-8");

    // Verify ApiProvider usage
    expect(componentCode).toContain("useApi");
    expect(componentCode).toContain('from "@/providers/ApiProvider"');

    // Verify no useAuth usage
    expect(componentCode).not.toContain("useAuth");
    expect(componentCode).not.toContain('from "@/hooks/useAuth"');

    // Verify season data access
    expect(componentCode).toContain("activeSeason");
    expect(componentCode).toContain("nextSeason");
  });

  it("should use ApiProvider in configuration pages that need gamification data", () => {
    const configPages = [
      "src/app/dashboard/gamificacao/configuracoes/pontos/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/multiplicadores/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/escala-niveis/page.tsx",
    ];

    configPages.forEach((pagePath) => {
      const filePath = join(process.cwd(), pagePath);
      const componentCode = readFileSync(filePath, "utf-8");

      // Verify ApiProvider usage
      expect(componentCode).toContain("useApi");
      expect(componentCode).toContain('from "@/providers/ApiProvider"');

      // Verify no PrismaProvider usage
      expect(componentCode).not.toContain("PrismaProvider");
      expect(componentCode).not.toContain("usePrisma");

      // Verify loading states
      expect(componentCode).toContain("isAnyLoading");
    });
  });

  it("should not use useGamificationData hook anywhere", () => {
    const allGamificationFiles = [
      "src/app/dashboard/gamificacao/page.tsx",
      "src/app/dashboard/gamificacao/historico-temporadas/page.tsx",
      "src/app/dashboard/gamificacao/niveis/page.tsx",
      "src/app/dashboard/gamificacao/manual/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/conquistas/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/trofeus/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/niveis/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/pontos/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/multiplicadores/page.tsx",
      "src/app/dashboard/gamificacao/configuracoes/escala-niveis/page.tsx",
    ];

    allGamificationFiles.forEach((pagePath) => {
      const filePath = join(process.cwd(), pagePath);
      const componentCode = readFileSync(filePath, "utf-8");

      // Verify no useGamificationData usage
      expect(componentCode).not.toContain("useGamificationData");
      expect(componentCode).not.toContain('from "@/hooks/useGamificationData"');
    });
  });

  it("should handle error states properly", () => {
    const mainPages = [
      "src/app/dashboard/gamificacao/page.tsx",
      "src/app/dashboard/gamificacao/historico-temporadas/page.tsx",
      "src/app/dashboard/gamificacao/niveis/page.tsx",
    ];

    mainPages.forEach((pagePath) => {
      const filePath = join(process.cwd(), pagePath);
      const componentCode = readFileSync(filePath, "utf-8");

      // Verify loading state handling
      expect(componentCode).toContain("loading");
      expect(componentCode).toContain("Carregando");
    });
  });
});
