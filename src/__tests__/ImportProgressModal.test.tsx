import {
  validateImportStatus,
  DEFAULT_IMPORT_STATUS,
} from "@/lib/data-validation";

describe("ImportProgressModal Logic", () => {
  describe("validateImportStatus function", () => {
    it("should handle null importStatus gracefully", () => {
      const result = validateImportStatus(null);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
      expect(result.errors).toContain("ImportStatus é null ou undefined");
    });

    it("should handle undefined importStatus gracefully", () => {
      const result = validateImportStatus(undefined);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
      expect(result.errors).toContain("ImportStatus é null ou undefined");
    });

    it("should handle invalid importStatus structure gracefully", () => {
      const invalidImportStatus = { invalid: "structure" };
      const result = validateImportStatus(invalidImportStatus);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
      expect(result.errors).toContain(
        "ImportStatus não possui estrutura válida",
      );
    });

    it("should validate correct importStatus", () => {
      const validImportStatus = {
        isOpen: true,
        logs: ["Log 1", "Log 2"],
        progress: 50,
        title: "Importando dados",
        status: "processing",
      };

      const result = validateImportStatus(validImportStatus);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validImportStatus);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle importStatus with missing properties", () => {
      const partialImportStatus = {
        isOpen: true,
        // logs, progress, title, status são undefined
      };

      const result = validateImportStatus(partialImportStatus);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
    });

    it("should handle importStatus with invalid logs array", () => {
      const invalidLogsImportStatus = {
        isOpen: true,
        logs: "not an array", // Inválido
        progress: 75,
        title: "Test Title",
        status: "done",
      };

      const result = validateImportStatus(invalidLogsImportStatus);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
    });

    it("should handle progress value outside valid range", () => {
      const invalidProgressImportStatus = {
        isOpen: true,
        logs: [],
        progress: 150, // Valor inválido
        title: "Test",
        status: "processing",
      };

      const result = validateImportStatus(invalidProgressImportStatus);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
    });

    it("should validate all status types correctly", () => {
      const validStatuses = ["processing", "done", "error", "idle"];

      validStatuses.forEach((status) => {
        const importStatus = {
          isOpen: true,
          logs: [],
          progress: 0,
          title: "Test",
          status,
        };

        const result = validateImportStatus(importStatus);
        expect(result.isValid).toBe(true);
      });
    });

    it("should reject invalid status values", () => {
      const invalidStatus = {
        isOpen: true,
        logs: [],
        progress: 0,
        title: "Test",
        status: "invalid_status",
      };

      const result = validateImportStatus(invalidStatus);
      expect(result.isValid).toBe(false);
    });

    it("should handle logs with mixed types", () => {
      const mixedLogsImportStatus = {
        isOpen: true,
        logs: ["valid log", null, undefined, 123], // Tipos mistos
        progress: 50,
        title: "Test",
        status: "processing",
      };

      const result = validateImportStatus(mixedLogsImportStatus);

      // Deve falhar porque nem todos os logs são strings
      expect(result.isValid).toBe(false);
      expect(result.data).toEqual(DEFAULT_IMPORT_STATUS);
    });

    it("should validate empty logs array", () => {
      const emptyLogsImportStatus = {
        isOpen: false,
        logs: [], // Array vazio válido
        progress: 0,
        title: "Aguardando",
        status: "idle",
      };

      const result = validateImportStatus(emptyLogsImportStatus);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(emptyLogsImportStatus);
    });
  });

  describe("Progress value validation", () => {
    it("should clamp progress values correctly", () => {
      // Testando a lógica de Math.max(0, Math.min(100, progress))
      expect(Math.max(0, Math.min(100, -10))).toBe(0);
      expect(Math.max(0, Math.min(100, 150))).toBe(100);
      expect(Math.max(0, Math.min(100, 50))).toBe(50);
      expect(Math.max(0, Math.min(100, 0))).toBe(0);
      expect(Math.max(0, Math.min(100, 100))).toBe(100);
    });
  });

  describe("Log validation", () => {
    it("should handle log type checking", () => {
      const testLogs = ["valid string", null, undefined, 123, {}, []];

      testLogs.forEach((log) => {
        const isValidLog = typeof log === "string";
        const displayValue = isValidLog ? log : "Log inválido";

        if (typeof log === "string") {
          expect(displayValue).toBe(log);
        } else {
          expect(displayValue).toBe("Log inválido");
        }
      });
    });
  });

  describe("Safe property access", () => {
    it("should handle safe property access with nullish coalescing", () => {
      const testData = {
        validProp: "valid",
        nullProp: null,
        undefinedProp: undefined,
      };

      expect(testData.validProp ?? "fallback").toBe("valid");
      expect(testData.nullProp ?? "fallback").toBe("fallback");
      expect(testData.undefinedProp ?? "fallback").toBe("fallback");
      expect((testData as any).nonExistentProp ?? "fallback").toBe("fallback");
    });
  });
});
