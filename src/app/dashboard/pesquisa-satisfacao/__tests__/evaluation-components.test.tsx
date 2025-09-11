import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("Evaluation Components API Integration", () => {
  it("should confirm main evaluation page uses ApiProvider", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../page.tsx"),
      "utf8",
    );

    // Verificar se usa useApi do ApiProvider
    expect(pageContent).toContain("useApi");
    expect(pageContent).toContain("@/providers/ApiProvider");

    // Verificar se NÃO usa PrismaProvider
    expect(pageContent).not.toContain("PrismaProvider");
    expect(pageContent).not.toContain("usePrisma");

    // Verificar se acessa dados via API
    expect(pageContent).toContain("evaluations");
    expect(pageContent).toContain("attendants");
  });

  it("should confirm evaluations list page uses ApiProvider", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../avaliacoes/page.tsx"),
      "utf8",
    );

    // Verificar uso da nova arquitetura
    expect(pageContent).toContain("useApi");
    expect(pageContent).toContain("evaluations");
    expect(pageContent).toContain("attendants");
    expect(pageContent).toContain("deleteEvaluations");

    // Verificar que usa mutações
    expect(pageContent).toContain(".mutate");

    // Não deve usar Prisma diretamente
    expect(pageContent).not.toContain("PrismaProvider");
    expect(pageContent).not.toContain("usePrisma");
  });

  it("should confirm import page uses ApiProvider", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../importar/page.tsx"),
      "utf8",
    );

    // Verificar uso da nova arquitetura
    expect(pageContent).toContain("useApi");
    expect(pageContent).toContain("attendants");
    expect(pageContent).toContain("importWhatsAppEvaluations");

    // Verificar que usa mutações
    expect(pageContent).toContain(".mutate");

    // Não deve usar Prisma diretamente
    expect(pageContent).not.toContain("PrismaProvider");
    expect(pageContent).not.toContain("usePrisma");
  });

  it("should confirm manage page uses ApiProvider", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../gerenciar/page.tsx"),
      "utf8",
    );

    // Verificar uso da nova arquitetura
    expect(pageContent).toContain("useApi");
    expect(pageContent).toContain("evaluations");
    expect(pageContent).toContain("attendants");
    expect(pageContent).toContain("deleteEvaluations");

    // Verificar que usa mutações
    expect(pageContent).toContain(".mutate");

    // Não deve usar Prisma diretamente
    expect(pageContent).not.toContain("PrismaProvider");
    expect(pageContent).not.toContain("usePrisma");
  });

  it("should confirm dashboard page uses ApiProvider", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../dashboard/page.tsx"),
      "utf8",
    );

    // Verificar uso da nova arquitetura
    expect(pageContent).toContain("useApi");
    expect(pageContent).toContain("evaluations");
    expect(pageContent).toContain("attendants");

    // Não deve usar Prisma diretamente
    expect(pageContent).not.toContain("PrismaProvider");
    expect(pageContent).not.toContain("usePrisma");
  });

  it("should confirm EvaluationsList component is API-ready", () => {
    const componentContent = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "../../../../components/survey/EvaluationsList.tsx",
      ),
      "utf8",
    );

    // EvaluationsList deve receber dados via props
    expect(componentContent).toContain("evaluations:");
    expect(componentContent).toContain("attendants:");
    expect(componentContent).toContain("onEdit?:");
    expect(componentContent).toContain("onDelete?:");

    // Não deve ter dependência direta do Prisma
    expect(componentContent).not.toContain("PrismaProvider");
    expect(componentContent).not.toContain("usePrisma");
    expect(componentContent).not.toContain("useApi");
  });

  it("should confirm SurveyStats component is API-ready", () => {
    const componentContent = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "../../../../components/survey/SurveyStats.tsx",
      ),
      "utf8",
    );

    // SurveyStats deve receber dados via props
    expect(componentContent).toContain("analytics");
    expect(componentContent).toContain("loading");

    // Não deve ter dependência direta do Prisma ou API
    expect(componentContent).not.toContain("PrismaProvider");
    expect(componentContent).not.toContain("usePrisma");
    expect(componentContent).not.toContain("useApi");
  });

  it("should verify API-based data flow in evaluation pages", () => {
    const pages = [
      "../page.tsx",
      "../avaliacoes/page.tsx",
      "../importar/page.tsx",
      "../gerenciar/page.tsx",
      "../dashboard/page.tsx",
    ];

    pages.forEach((pagePath) => {
      const pageContent = require("fs").readFileSync(
        require("path").join(__dirname, pagePath),
        "utf8",
      );

      // Todas as páginas devem usar o padrão ApiProvider
      expect(pageContent).toContain("const {");
      expect(pageContent).toContain("} = useApi()");

      // Verificar autenticação
      expect(pageContent).toContain("useAuth");
      expect(pageContent).toContain("isAuthenticated");
    });
  });

  it("should confirm no direct Prisma usage in evaluation components", () => {
    const fs = require("fs");
    const path = require("path");

    // Verificar páginas principais
    const pages = [
      "../page.tsx",
      "../avaliacoes/page.tsx",
      "../importar/page.tsx",
      "../gerenciar/page.tsx",
      "../dashboard/page.tsx",
    ];

    pages.forEach((pagePath) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Nenhuma deve importar Prisma diretamente
      expect(pageContent).not.toContain("import { PrismaClient }");
      expect(pageContent).not.toContain("new PrismaClient");

      // Todas devem usar ApiProvider
      expect(pageContent).toContain("useApi");
    });
  });

  it("should verify error handling uses new architecture", () => {
    const pages = [
      "../avaliacoes/page.tsx",
      "../importar/page.tsx",
      "../gerenciar/page.tsx",
    ];

    pages.forEach((pagePath) => {
      const pageContent = require("fs").readFileSync(
        require("path").join(__dirname, pagePath),
        "utf8",
      );

      // Verificar se usa try/catch ou tratamento de erro adequado
      if (pageContent.includes(".mutate")) {
        // Se usa mutações, deve ter algum tratamento de erro
        expect(
          pageContent.includes("try {") ||
            pageContent.includes("catch") ||
            pageContent.includes("toast") ||
            pageContent.includes("error") ||
            pageContent.includes("loading") ||
            pageContent.includes("disabled"),
        ).toBe(true);
      }
    });
  });

  it("should pass basic rendering test", () => {
    // Teste simples para garantir que o arquivo de teste funciona
    const testElement = (
      <div data-testid="test">Evaluation API Integration Test</div>
    );
    render(testElement);

    expect(screen.getByTestId("test")).toBeInTheDocument();
    expect(
      screen.getByText("Evaluation API Integration Test"),
    ).toBeInTheDocument();
  });
});
