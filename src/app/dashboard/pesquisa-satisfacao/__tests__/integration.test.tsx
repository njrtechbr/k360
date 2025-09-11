import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("Evaluation Management API Integration", () => {
  it("should confirm all evaluation pages use ApiProvider architecture", () => {
    const fs = require("fs");
    const path = require("path");

    // Lista de páginas de avaliação para verificar
    const evaluationPages = [
      { name: "Main Page", path: "../page.tsx" },
      { name: "Evaluations List", path: "../avaliacoes/page.tsx" },
      { name: "Import WhatsApp", path: "../importar/page.tsx" },
      { name: "Manage Evaluations", path: "../gerenciar/page.tsx" },
      { name: "Dashboard", path: "../dashboard/page.tsx" },
    ];

    evaluationPages.forEach(({ name, path: pagePath }) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Verificar uso do ApiProvider
      expect(pageContent).toContain("useApi");
      expect(pageContent).toContain("@/providers/ApiProvider");

      // Verificar que NÃO usa PrismaProvider
      expect(pageContent).not.toContain("PrismaProvider");
      expect(pageContent).not.toContain("usePrisma");

      // Verificar autenticação
      expect(pageContent).toContain("useAuth");

      console.log(`✅ ${name}: API architecture confirmed`);
    });
  });

  it("should verify evaluation components receive data via props", () => {
    const fs = require("fs");
    const path = require("path");

    // Componentes de survey que devem receber dados via props
    const surveyComponents = [
      {
        name: "EvaluationsList",
        path: "../../../../components/survey/EvaluationsList.tsx",
      },
      {
        name: "SurveyStats",
        path: "../../../../components/survey/SurveyStats.tsx",
      },
    ];

    surveyComponents.forEach(({ name, path: componentPath }) => {
      const componentContent = fs.readFileSync(
        path.join(__dirname, componentPath),
        "utf8",
      );

      // Verificar que recebe dados via props (não acessa providers diretamente)
      expect(componentContent).not.toContain("useApi");
      expect(componentContent).not.toContain("PrismaProvider");
      expect(componentContent).not.toContain("usePrisma");

      // Verificar interface de props
      if (name === "EvaluationsList") {
        expect(componentContent).toContain("evaluations:");
        expect(componentContent).toContain("attendants:");
      }

      if (name === "SurveyStats") {
        expect(componentContent).toContain("analytics");
      }

      console.log(`✅ ${name}: Props-based architecture confirmed`);
    });
  });

  it("should verify API mutation patterns in evaluation pages", () => {
    const fs = require("fs");
    const path = require("path");

    // Páginas que fazem mutações
    const mutationPages = [
      {
        name: "Evaluations List",
        path: "../avaliacoes/page.tsx",
        mutations: ["deleteEvaluations"],
      },
      {
        name: "Import WhatsApp",
        path: "../importar/page.tsx",
        mutations: ["importWhatsAppEvaluations"],
      },
      {
        name: "Manage Evaluations",
        path: "../gerenciar/page.tsx",
        mutations: ["deleteEvaluations"],
      },
    ];

    mutationPages.forEach(({ name, path: pagePath, mutations }) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Verificar que usa mutações da API
      mutations.forEach((mutation) => {
        expect(pageContent).toContain(mutation);
        expect(pageContent).toContain(".mutate");
      });

      // Verificar padrão de tratamento de erro/sucesso
      expect(
        pageContent.includes("toast") ||
          pageContent.includes("try {") ||
          pageContent.includes("catch") ||
          pageContent.includes("loading") ||
          pageContent.includes("disabled"),
      ).toBe(true);

      console.log(`✅ ${name}: API mutations confirmed`);
    });
  });

  it("should verify data access patterns", () => {
    const fs = require("fs");
    const path = require("path");

    // Páginas que acessam dados
    const dataPages = [
      {
        name: "Main Page",
        path: "../page.tsx",
        data: ["evaluations", "attendants"],
      },
      {
        name: "Evaluations List",
        path: "../avaliacoes/page.tsx",
        data: ["evaluations", "attendants"],
      },
      {
        name: "Import WhatsApp",
        path: "../importar/page.tsx",
        data: ["attendants"],
      },
      {
        name: "Manage Evaluations",
        path: "../gerenciar/page.tsx",
        data: ["evaluations", "attendants"],
      },
      {
        name: "Dashboard",
        path: "../dashboard/page.tsx",
        data: ["evaluations", "attendants"],
      },
    ];

    dataPages.forEach(({ name, path: pagePath, data }) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Verificar acesso aos dados via ApiProvider
      data.forEach((dataKey) => {
        expect(pageContent).toContain(dataKey);
      });

      // Verificar padrão de destructuring do useApi
      expect(pageContent).toContain("} = useApi()");

      console.log(`✅ ${name}: Data access patterns confirmed`);
    });
  });

  it("should verify no direct database access", () => {
    const fs = require("fs");
    const path = require("path");

    // Verificar todas as páginas de avaliação
    const allPages = [
      "../page.tsx",
      "../avaliacoes/page.tsx",
      "../importar/page.tsx",
      "../gerenciar/page.tsx",
      "../dashboard/page.tsx",
    ];

    allPages.forEach((pagePath) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Verificar que NÃO há acesso direto ao banco
      expect(pageContent).not.toContain("import { PrismaClient }");
      expect(pageContent).not.toContain("new PrismaClient");
      expect(pageContent).not.toContain("prisma.");

      // Verificar que usa apenas APIs
      expect(pageContent).toContain("useApi");
    });

    console.log("✅ No direct database access confirmed");
  });

  it("should verify loading and error states", () => {
    const fs = require("fs");
    const path = require("path");

    // Páginas que devem ter estados de loading
    const pagesWithStates = [
      "../avaliacoes/page.tsx",
      "../importar/page.tsx",
      "../gerenciar/page.tsx",
      "../dashboard/page.tsx",
    ];

    pagesWithStates.forEach((pagePath) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Verificar estados de loading
      expect(
        pageContent.includes("loading") ||
          pageContent.includes("isLoading") ||
          pageContent.includes("authLoading"),
      ).toBe(true);

      // Verificar tratamento de autenticação
      expect(pageContent).toContain("isAuthenticated");
      expect(pageContent).toContain('router.push("/login")');
    });

    console.log("✅ Loading and error states confirmed");
  });

  it("should verify analytics integration", () => {
    const fs = require("fs");
    const path = require("path");

    // Páginas que usam analytics
    const analyticsPages = ["../page.tsx", "../dashboard/page.tsx"];

    analyticsPages.forEach((pagePath) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      // Verificar uso do hook de analytics
      expect(pageContent).toContain("useEvaluationAnalytics");

      // Verificar que passa dados da API para analytics
      expect(pageContent).toContain("evaluations.data");
      expect(pageContent).toContain("attendants.data");
    });

    console.log("✅ Analytics integration confirmed");
  });

  it("should verify component composition patterns", () => {
    const fs = require("fs");
    const path = require("path");

    // Verificar uso de componentes de survey
    const pagesWithComponents = [
      { path: "../page.tsx", components: ["SurveyStats"] },
      { path: "../avaliacoes/page.tsx", components: ["EvaluationsList"] },
      {
        path: "../dashboard/page.tsx",
        components: ["SurveyStats", "EvaluationsList"],
      },
    ];

    pagesWithComponents.forEach(({ path: pagePath, components }) => {
      const pageContent = fs.readFileSync(
        path.join(__dirname, pagePath),
        "utf8",
      );

      components.forEach((component) => {
        expect(pageContent).toContain(component);
      });
    });

    console.log("✅ Component composition patterns confirmed");
  });

  it("should pass basic rendering test", () => {
    // Teste simples para garantir que o arquivo de teste funciona
    const testElement = (
      <div data-testid="integration-test">Evaluation Integration Test</div>
    );
    render(testElement);

    expect(screen.getByTestId("integration-test")).toBeInTheDocument();
    expect(screen.getByText("Evaluation Integration Test")).toBeInTheDocument();
  });
});
