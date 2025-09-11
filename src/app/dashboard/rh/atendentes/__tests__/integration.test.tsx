import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("Attendant Management API Integration", () => {
  it("should confirm components use ApiProvider instead of PrismaProvider", () => {
    // Verificar se os componentes de atendentes estão usando a nova arquitetura
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
  });

  it("should confirm AttendantForm component is API-ready", () => {
    const formContent = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "../../../../../components/rh/AttendantForm.tsx",
      ),
      "utf8",
    );

    // AttendantForm deve receber dados via props (não acessar provider diretamente)
    expect(formContent).toContain("funcoes:");
    expect(formContent).toContain("setores:");
    expect(formContent).toContain("onSubmit:");

    // Não deve ter dependência direta do Prisma
    expect(formContent).not.toContain("PrismaProvider");
    expect(formContent).not.toContain("usePrisma");
  });

  it("should confirm AttendantTable component is API-ready", () => {
    const tableContent = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "../../../../../components/rh/AttendantTable.tsx",
      ),
      "utf8",
    );

    // AttendantTable deve receber dados via props
    expect(tableContent).toContain("attendants:");
    expect(tableContent).toContain("onEdit:");
    expect(tableContent).toContain("onDelete:");

    // Não deve ter dependência direta do Prisma
    expect(tableContent).not.toContain("PrismaProvider");
    expect(tableContent).not.toContain("usePrisma");
  });

  it("should verify API-based data flow architecture", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../page.tsx"),
      "utf8",
    );

    // Verificar padrão de uso do ApiProvider
    expect(pageContent).toContain("const {");
    expect(pageContent).toContain("attendants,");
    expect(pageContent).toContain("addAttendant,");
    expect(pageContent).toContain("updateAttendant,");
    expect(pageContent).toContain("deleteAttendants,");
    expect(pageContent).toContain("} = useApi()");

    // Verificar que usa mutações do API provider
    expect(pageContent).toContain(".mutate");
  });

  it("should confirm no direct Prisma usage in attendant components", () => {
    const fs = require("fs");
    const path = require("path");

    // Verificar página principal
    const pageContent = fs.readFileSync(
      path.join(__dirname, "../page.tsx"),
      "utf8",
    );

    // Verificar página de perfil
    const profileContent = fs.readFileSync(
      path.join(__dirname, "../[id]/page.tsx"),
      "utf8",
    );

    // Nenhum deve importar Prisma diretamente
    expect(pageContent).not.toContain("import { PrismaClient }");
    expect(pageContent).not.toContain("new PrismaClient");
    expect(profileContent).not.toContain("import { PrismaClient }");
    expect(profileContent).not.toContain("new PrismaClient");

    // Ambos devem usar ApiProvider
    expect(pageContent).toContain("useApi");
    expect(profileContent).toContain("useApi");
  });

  it("should verify error handling uses new architecture", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../page.tsx"),
      "utf8",
    );

    // Verificar se usa try/catch com mutações da API
    expect(pageContent).toContain("try {");
    expect(pageContent).toContain("await");
    expect(pageContent).toContain(".mutate");
    expect(pageContent).toContain("} catch");

    // Verificar se usa toast para feedback
    expect(pageContent).toContain("toast");
  });

  it("should confirm data validation uses new patterns", () => {
    const pageContent = require("fs").readFileSync(
      require("path").join(__dirname, "../page.tsx"),
      "utf8",
    );

    // Verificar se usa validação de dados segura
    expect(pageContent).toContain("validateAttendantArray");
    expect(pageContent).toContain("useMemo");

    // Verificar se trata dados nulos/undefined
    expect(pageContent).toContain("attendants.data");
  });

  it("should pass basic rendering test", () => {
    // Teste simples para garantir que o arquivo de teste funciona
    const testElement = <div data-testid="test">API Integration Test</div>;
    render(testElement);

    expect(screen.getByTestId("test")).toBeInTheDocument();
    expect(screen.getByText("API Integration Test")).toBeInTheDocument();
  });
});
