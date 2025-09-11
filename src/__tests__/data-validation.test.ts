/**
 * Testes unitários para utilitários de validação de dados
 */

import {
  isValidArray,
  isNonEmptyArray,
  isValidObject,
  isNonEmptyString,
  isValidNumber,
  isValidUUID,
  isValidAttendant,
  isValidAttendantArray,
  isValidEvaluation,
  isValidEvaluationArray,
  isValidImportStatus,
  validateAttendantArray,
  validateEvaluationArray,
  validateImportStatus,
  safeArrayOperation,
  safeFindInArray,
  safeMapArray,
  safeFilterArray,
  safeReduceArray,
  safeObjectProperty,
  safeArrayLength,
  safeArrayFirst,
  safeArrayLast,
  createSafeDataState,
  updateSafeDataState,
  isDataLoading,
  hasDataError,
  isDataReady,
  DEFAULT_IMPORT_STATUS,
  EMPTY_ATTENDANT_ARRAY,
  EMPTY_EVALUATION_ARRAY,
} from "../lib/data-validation";

import { Attendant, Evaluation, ImportStatus } from "../lib/types";

// ============================================================================
// DADOS DE TESTE
// ============================================================================

const validAttendant: Attendant = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "João Silva",
  email: "joao@example.com",
  funcao: "Atendente",
  setor: "balcão",
  status: "Ativo",
  avatarUrl: null,
  telefone: "(11) 99999-9999",
  portaria: null,
  situacao: null,
  dataAdmissao: "2023-01-01T00:00:00.000Z",
  dataNascimento: "1990-01-01T00:00:00.000Z",
  rg: "12.345.678-9",
  cpf: "123.456.789-00",
};

const validEvaluation: Evaluation = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  attendantId: "123e4567-e89b-12d3-a456-426614174000",
  nota: 5,
  comentario: "Excelente atendimento",
  data: "2023-01-01T00:00:00.000Z",
  xpGained: 100,
};

const validImportStatus: ImportStatus = {
  isOpen: true,
  logs: ["Iniciando importação"],
  progress: 50,
  title: "Importando dados",
  status: "processing",
};

// ============================================================================
// TESTES DE VALIDADORES BÁSICOS
// ============================================================================

describe("Validadores de tipos básicos", () => {
  describe("isValidArray", () => {
    it("deve retornar true para arrays válidos", () => {
      expect(isValidArray([])).toBe(true);
      expect(isValidArray([1, 2, 3])).toBe(true);
      expect(isValidArray(["a", "b"])).toBe(true);
    });

    it("deve retornar false para não-arrays", () => {
      expect(isValidArray(null)).toBe(false);
      expect(isValidArray(undefined)).toBe(false);
      expect(isValidArray({})).toBe(false);
      expect(isValidArray("string")).toBe(false);
      expect(isValidArray(123)).toBe(false);
    });
  });

  describe("isNonEmptyArray", () => {
    it("deve retornar true para arrays não vazios", () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray(["a", "b"])).toBe(true);
    });

    it("deve retornar false para arrays vazios ou não-arrays", () => {
      expect(isNonEmptyArray([])).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray(undefined)).toBe(false);
      expect(isNonEmptyArray({})).toBe(false);
    });
  });

  describe("isValidObject", () => {
    it("deve retornar true para objetos válidos", () => {
      expect(isValidObject({})).toBe(true);
      expect(isValidObject({ a: 1 })).toBe(true);
    });

    it("deve retornar false para não-objetos", () => {
      expect(isValidObject(null)).toBe(false);
      expect(isValidObject(undefined)).toBe(false);
      expect(isValidObject([])).toBe(false);
      expect(isValidObject("string")).toBe(false);
      expect(isValidObject(123)).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    it("deve retornar true para strings não vazias", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("  test  ")).toBe(true);
    });

    it("deve retornar false para strings vazias ou não-strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe("isValidNumber", () => {
    it("deve retornar true para números válidos", () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(-456)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
    });

    it("deve retornar false para números inválidos ou não-números", () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
      expect(isValidNumber("123")).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
    });
  });

  describe("isValidUUID", () => {
    it("deve retornar true para UUIDs válidos", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("deve retornar false para UUIDs inválidos", () => {
      expect(isValidUUID("invalid-uuid")).toBe(false);
      expect(isValidUUID("123e4567-e89b-12d3-a456")).toBe(false);
      expect(isValidUUID("")).toBe(false);
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
      expect(isValidUUID(123)).toBe(false);
    });
  });
});

// ============================================================================
// TESTES DE VALIDADORES DE ENTIDADES
// ============================================================================

describe("Validadores de entidades específicas", () => {
  describe("isValidAttendant", () => {
    it("deve retornar true para attendant válido", () => {
      expect(isValidAttendant(validAttendant)).toBe(true);
    });

    it("deve retornar false para attendant inválido", () => {
      expect(isValidAttendant(null)).toBe(false);
      expect(isValidAttendant(undefined)).toBe(false);
      expect(isValidAttendant({})).toBe(false);
      expect(isValidAttendant({ ...validAttendant, id: "invalid-uuid" })).toBe(
        false,
      );
      expect(isValidAttendant({ ...validAttendant, name: "" })).toBe(false);
      expect(isValidAttendant({ ...validAttendant, email: "" })).toBe(false);
    });
  });

  describe("isValidAttendantArray", () => {
    it("deve retornar true para array de attendants válidos", () => {
      expect(isValidAttendantArray([validAttendant])).toBe(true);
      expect(isValidAttendantArray([])).toBe(true);
    });

    it("deve retornar false para array com attendants inválidos", () => {
      expect(isValidAttendantArray([validAttendant, null])).toBe(false);
      expect(isValidAttendantArray([validAttendant, {}])).toBe(false);
      expect(isValidAttendantArray(null)).toBe(false);
      expect(isValidAttendantArray("not-array")).toBe(false);
    });
  });

  describe("isValidEvaluation", () => {
    it("deve retornar true para evaluation válida", () => {
      expect(isValidEvaluation(validEvaluation)).toBe(true);
    });

    it("deve retornar false para evaluation inválida", () => {
      expect(isValidEvaluation(null)).toBe(false);
      expect(isValidEvaluation(undefined)).toBe(false);
      expect(isValidEvaluation({})).toBe(false);
      expect(isValidEvaluation({ ...validEvaluation, nota: 0 })).toBe(false);
      expect(isValidEvaluation({ ...validEvaluation, nota: 6 })).toBe(false);
      expect(isValidEvaluation({ ...validEvaluation, xpGained: -1 })).toBe(
        false,
      );
    });
  });

  describe("isValidImportStatus", () => {
    it("deve retornar true para importStatus válido", () => {
      expect(isValidImportStatus(validImportStatus)).toBe(true);
    });

    it("deve retornar false para importStatus inválido", () => {
      expect(isValidImportStatus(null)).toBe(false);
      expect(isValidImportStatus(undefined)).toBe(false);
      expect(isValidImportStatus({})).toBe(false);
      expect(
        isValidImportStatus({ ...validImportStatus, isOpen: "true" }),
      ).toBe(false);
      expect(isValidImportStatus({ ...validImportStatus, progress: -1 })).toBe(
        false,
      );
      expect(isValidImportStatus({ ...validImportStatus, progress: 101 })).toBe(
        false,
      );
      expect(
        isValidImportStatus({ ...validImportStatus, status: "invalid" }),
      ).toBe(false);
    });
  });
});

// ============================================================================
// TESTES DE FUNÇÕES DE VALIDAÇÃO SEGURA
// ============================================================================

describe("Funções de validação segura", () => {
  describe("validateAttendantArray", () => {
    it("deve retornar dados válidos para array correto", () => {
      const result = validateAttendantArray([validAttendant]);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual([validAttendant]);
      expect(result.errors).toEqual([]);
    });

    it("deve retornar array vazio para dados null/undefined", () => {
      const resultNull = validateAttendantArray(null);
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.data).toEqual([]);
      expect(resultNull.errors).toContain(
        "Dados de atendentes são null ou undefined",
      );

      const resultUndefined = validateAttendantArray(undefined);
      expect(resultUndefined.isValid).toBe(false);
      expect(resultUndefined.data).toEqual([]);
      expect(resultUndefined.errors).toContain(
        "Dados de atendentes são null ou undefined",
      );
    });

    it("deve filtrar itens inválidos e reportar erros", () => {
      const mixedArray = [validAttendant, null, {}, validAttendant];
      const result = validateAttendantArray(mixedArray);
      expect(result.isValid).toBe(false);
      expect(result.data).toEqual([validAttendant, validAttendant]);
      expect(result.errors.length).toBe(2);
    });
  });

  describe("validateImportStatus", () => {
    it("deve retornar dados válidos para importStatus correto", () => {
      const result = validateImportStatus(validImportStatus);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validImportStatus);
      expect(result.errors).toEqual([]);
    });

    it("deve retornar status padrão para dados null/undefined", () => {
      const resultNull = validateImportStatus(null);
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.data).toEqual(DEFAULT_IMPORT_STATUS);
      expect(resultNull.errors).toContain("ImportStatus é null ou undefined");
    });
  });
});

// ============================================================================
// TESTES DE HELPER FUNCTIONS
// ============================================================================

describe("Helper functions para verificação segura", () => {
  describe("safeArrayOperation", () => {
    it("deve executar operação em array válido", () => {
      const result = safeArrayOperation(
        [1, 2, 3],
        (arr: number[]) => arr.reduce((sum, n) => sum + n, 0),
        0,
      );
      expect(result).toBe(6);
    });

    it("deve retornar fallback para dados inválidos", () => {
      const result = safeArrayOperation(
        null,
        (arr: number[]) => arr.reduce((sum, n) => sum + n, 0),
        -1,
      );
      expect(result).toBe(-1);
    });

    it("deve filtrar itens inválidos quando validator é fornecido", () => {
      const mixedArray = [1, "invalid", 2, null, 3];
      const result = safeArrayOperation(
        mixedArray,
        (arr: number[]) => arr.reduce((sum, n) => sum + n, 0),
        0,
        (item): item is number => typeof item === "number",
      );
      expect(result).toBe(6);
    });
  });

  describe("safeFindInArray", () => {
    it("deve encontrar item em array válido", () => {
      const result = safeFindInArray([1, 2, 3], (n: number) => n === 2);
      expect(result).toBe(2);
    });

    it("deve retornar undefined para array inválido", () => {
      const result = safeFindInArray(null, (n: number) => n === 2);
      expect(result).toBeUndefined();
    });
  });

  describe("safeMapArray", () => {
    it("deve mapear array válido", () => {
      const result = safeMapArray([1, 2, 3], (n: number) => n * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    it("deve retornar array vazio para dados inválidos", () => {
      const result = safeMapArray(null, (n: number) => n * 2);
      expect(result).toEqual([]);
    });
  });

  describe("safeFilterArray", () => {
    it("deve filtrar array válido", () => {
      const result = safeFilterArray([1, 2, 3, 4], (n: number) => n % 2 === 0);
      expect(result).toEqual([2, 4]);
    });

    it("deve retornar array vazio para dados inválidos", () => {
      const result = safeFilterArray(null, (n: number) => n % 2 === 0);
      expect(result).toEqual([]);
    });
  });

  describe("safeReduceArray", () => {
    it("deve reduzir array válido", () => {
      const result = safeReduceArray(
        [1, 2, 3],
        (acc: number, n: number) => acc + n,
        0,
      );
      expect(result).toBe(6);
    });

    it("deve retornar valor inicial para dados inválidos", () => {
      const result = safeReduceArray(
        null,
        (acc: number, n: number) => acc + n,
        10,
      );
      expect(result).toBe(10);
    });
  });

  describe("safeObjectProperty", () => {
    it("deve retornar propriedade de objeto válido", () => {
      const obj = { name: "João", age: 30 };
      const result = safeObjectProperty(obj, "name", "default");
      expect(result).toBe("João");
    });

    it("deve retornar fallback para objeto inválido", () => {
      const result = safeObjectProperty(null, "name", "default");
      expect(result).toBe("default");
    });

    it("deve retornar fallback para propriedade inexistente", () => {
      const obj = { name: "João" };
      const result = safeObjectProperty(obj, "age", 25);
      expect(result).toBe(25);
    });
  });

  describe("safeArrayLength", () => {
    it("deve retornar comprimento de array válido", () => {
      expect(safeArrayLength([1, 2, 3])).toBe(3);
      expect(safeArrayLength([])).toBe(0);
    });

    it("deve retornar 0 para dados inválidos", () => {
      expect(safeArrayLength(null)).toBe(0);
      expect(safeArrayLength(undefined)).toBe(0);
      expect(safeArrayLength("string")).toBe(0);
    });
  });

  describe("safeArrayFirst", () => {
    it("deve retornar primeiro elemento de array válido", () => {
      expect(safeArrayFirst([1, 2, 3])).toBe(1);
      expect(safeArrayFirst(["a", "b"])).toBe("a");
    });

    it("deve retornar undefined para array vazio ou inválido", () => {
      expect(safeArrayFirst([])).toBeUndefined();
      expect(safeArrayFirst(null)).toBeUndefined();
      expect(safeArrayFirst(undefined)).toBeUndefined();
    });
  });

  describe("safeArrayLast", () => {
    it("deve retornar último elemento de array válido", () => {
      expect(safeArrayLast([1, 2, 3])).toBe(3);
      expect(safeArrayLast(["a", "b"])).toBe("b");
    });

    it("deve retornar undefined para array vazio ou inválido", () => {
      expect(safeArrayLast([])).toBeUndefined();
      expect(safeArrayLast(null)).toBeUndefined();
      expect(safeArrayLast(undefined)).toBeUndefined();
    });
  });
});

// ============================================================================
// TESTES DE UTILITÁRIOS DE ESTADO SEGURO
// ============================================================================

describe("Utilitários de estado seguro", () => {
  describe("createSafeDataState", () => {
    it("deve criar estado inicial correto", () => {
      const state = createSafeDataState([]);
      expect(state.data).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetch).toBeUndefined();
    });
  });

  describe("updateSafeDataState", () => {
    it("deve atualizar estado corretamente", () => {
      const initialState = createSafeDataState([]);
      const updatedState = updateSafeDataState(initialState, {
        loading: true,
        error: "Erro de teste",
      });

      expect(updatedState.loading).toBe(true);
      expect(updatedState.error).toBe("Erro de teste");
      expect(updatedState.data).toEqual([]);
    });

    it("deve atualizar lastFetch quando data é atualizada", () => {
      const initialState = createSafeDataState([]);
      const updatedState = updateSafeDataState(initialState, {
        data: [validAttendant],
      });

      expect(updatedState.lastFetch).toBeInstanceOf(Date);
    });
  });

  describe("isDataLoading", () => {
    it("deve detectar estado de loading corretamente", () => {
      const loadingState = createSafeDataState([]);
      loadingState.loading = true;
      expect(isDataLoading(loadingState)).toBe(true);

      const notLoadingState = createSafeDataState([]);
      expect(isDataLoading(notLoadingState)).toBe(false);
    });
  });

  describe("hasDataError", () => {
    it("deve detectar erro corretamente", () => {
      const errorState = createSafeDataState([]);
      errorState.error = "Erro de teste";
      expect(hasDataError(errorState)).toBe(true);

      const noErrorState = createSafeDataState([]);
      expect(hasDataError(noErrorState)).toBe(false);
    });
  });

  describe("isDataReady", () => {
    it("deve detectar dados prontos corretamente", () => {
      const readyState = createSafeDataState([]);
      expect(isDataReady(readyState)).toBe(true);

      const loadingState = createSafeDataState([]);
      loadingState.loading = true;
      expect(isDataReady(loadingState)).toBe(false);

      const errorState = createSafeDataState([]);
      errorState.error = "Erro";
      expect(isDataReady(errorState)).toBe(false);
    });
  });
});

// ============================================================================
// TESTES DE CONSTANTES
// ============================================================================

describe("Constantes de fallback", () => {
  it("deve ter DEFAULT_IMPORT_STATUS válido", () => {
    expect(isValidImportStatus(DEFAULT_IMPORT_STATUS)).toBe(true);
  });

  it("deve ter arrays vazios válidos", () => {
    expect(Array.isArray(EMPTY_ATTENDANT_ARRAY)).toBe(true);
    expect(EMPTY_ATTENDANT_ARRAY.length).toBe(0);

    expect(Array.isArray(EMPTY_EVALUATION_ARRAY)).toBe(true);
    expect(EMPTY_EVALUATION_ARRAY.length).toBe(0);
  });
});
