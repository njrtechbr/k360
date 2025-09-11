/**
 * Utilitários de validação de dados seguros
 *
 * Este arquivo implementa funções de validação robustas para prevenir erros
 * de runtime causados por dados null, undefined ou com tipos incorretos.
 */

import {
  Attendant,
  Evaluation,
  GamificationConfig,
  XpEvent,
  UnlockedAchievement,
} from "./types";

// ============================================================================
// TIPOS DE VALIDAÇÃO
// ============================================================================

/**
 * Resultado de validação genérico
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  errors: string[];
}

/**
 * Estado de dados seguro
 */
export interface SafeDataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
}

/**
 * Tipo ImportStatus baseado no código existente
 */
export interface ImportStatus {
  isOpen: boolean;
  logs: string[];
  progress: number;
  title: string;
  status: "processing" | "done" | "error" | "idle";
}

// ============================================================================
// VALIDADORES DE TIPOS BÁSICOS
// ============================================================================

/**
 * Verifica se um valor é um array válido
 */
export function isValidArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Verifica se um valor é um array não vazio
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Verifica se um valor é um objeto válido (não null, não array)
 */
export function isValidObject(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Verifica se um valor é uma string não vazia
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Verifica se um valor é um número válido
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * Verifica se um valor é um UUID válido
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ============================================================================
// VALIDADORES DE ENTIDADES ESPECÍFICAS
// ============================================================================

/**
 * Valida se um objeto é um Attendant válido
 */
export function isValidAttendant(data: unknown): data is Attendant {
  if (!isValidObject(data)) return false;

  const attendant = data as Record<string, unknown>;

  return (
    isValidUUID(attendant.id) &&
    isNonEmptyString(attendant.name) &&
    isNonEmptyString(attendant.email) &&
    isNonEmptyString(attendant.funcao) &&
    isNonEmptyString(attendant.setor) &&
    isNonEmptyString(attendant.status) &&
    isNonEmptyString(attendant.telefone) &&
    isNonEmptyString(attendant.dataAdmissao) &&
    isNonEmptyString(attendant.dataNascimento) &&
    isNonEmptyString(attendant.rg) &&
    isNonEmptyString(attendant.cpf)
  );
}

/**
 * Valida se um array contém apenas Attendants válidos
 */
export function isValidAttendantArray(data: unknown): data is Attendant[] {
  if (!isValidArray(data)) return false;

  return data.every((item) => isValidAttendant(item));
}

/**
 * Valida se um objeto é uma Evaluation válida
 */
export function isValidEvaluation(data: unknown): data is Evaluation {
  if (!isValidObject(data)) return false;

  const evaluation = data as Record<string, unknown>;

  return (
    isValidUUID(evaluation.id) &&
    isValidUUID(evaluation.attendantId) &&
    isValidNumber(evaluation.nota) &&
    evaluation.nota >= 1 &&
    evaluation.nota <= 5 &&
    typeof evaluation.comentario === "string" &&
    isNonEmptyString(evaluation.data) &&
    isValidNumber(evaluation.xpGained) &&
    evaluation.xpGained >= 0
  );
}

/**
 * Valida se um array contém apenas Evaluations válidas
 */
export function isValidEvaluationArray(data: unknown): data is Evaluation[] {
  if (!isValidArray(data)) return false;

  return data.every((item) => isValidEvaluation(item));
}

/**
 * Valida se um objeto é um ImportStatus válido
 */
export function isValidImportStatus(data: unknown): data is ImportStatus {
  if (!isValidObject(data)) return false;

  const importStatus = data as Record<string, unknown>;

  return (
    typeof importStatus.isOpen === "boolean" &&
    isValidArray(importStatus.logs) &&
    importStatus.logs.every((log) => typeof log === "string") &&
    isValidNumber(importStatus.progress) &&
    importStatus.progress >= 0 &&
    importStatus.progress <= 100 &&
    isNonEmptyString(importStatus.title) &&
    isNonEmptyString(importStatus.status) &&
    ["processing", "done", "error", "idle"].includes(
      importStatus.status as string,
    )
  );
}

/**
 * Valida se um objeto é um XpEvent válido
 */
export function isValidXpEvent(data: unknown): data is XpEvent {
  if (!isValidObject(data)) return false;

  const xpEvent = data as Record<string, unknown>;

  return (
    isValidUUID(xpEvent.id) &&
    isValidUUID(xpEvent.attendantId) &&
    isValidNumber(xpEvent.points) &&
    xpEvent.points >= 0 &&
    isValidNumber(xpEvent.basePoints) &&
    xpEvent.basePoints >= 0 &&
    isValidNumber(xpEvent.multiplier) &&
    xpEvent.multiplier >= 0 &&
    isNonEmptyString(xpEvent.reason) &&
    isNonEmptyString(xpEvent.date) &&
    ["evaluation", "achievement"].includes(xpEvent.type as string) &&
    isValidUUID(xpEvent.relatedId)
  );
}

/**
 * Valida se um array contém apenas XpEvents válidos
 */
export function isValidXpEventArray(data: unknown): data is XpEvent[] {
  if (!isValidArray(data)) return false;

  return data.every((item) => isValidXpEvent(item));
}

// ============================================================================
// FUNÇÕES DE VALIDAÇÃO SEGURA
// ============================================================================

/**
 * Valida e retorna um array seguro de Attendants
 */
export function validateAttendantArray(
  data: unknown,
): ValidationResult<Attendant[]> {
  if (data === null || data === undefined) {
    return {
      isValid: false,
      data: [],
      errors: ["Dados de atendentes são null ou undefined"],
    };
  }

  if (!isValidArray(data)) {
    return {
      isValid: false,
      data: [],
      errors: ["Dados não são um array válido"],
    };
  }

  const validAttendants: Attendant[] = [];
  const errors: string[] = [];

  data.forEach((item, index) => {
    if (isValidAttendant(item)) {
      validAttendants.push(item);
    } else {
      errors.push(`Item no índice ${index} não é um atendente válido`);
    }
  });

  return {
    isValid: errors.length === 0,
    data: validAttendants,
    errors,
  };
}

/**
 * Valida e retorna um array seguro de Evaluations
 */
export function validateEvaluationArray(
  data: unknown,
): ValidationResult<Evaluation[]> {
  if (data === null || data === undefined) {
    return {
      isValid: false,
      data: [],
      errors: ["Dados de avaliações são null ou undefined"],
    };
  }

  if (!isValidArray(data)) {
    return {
      isValid: false,
      data: [],
      errors: ["Dados não são um array válido"],
    };
  }

  const validEvaluations: Evaluation[] = [];
  const errors: string[] = [];

  data.forEach((item, index) => {
    if (isValidEvaluation(item)) {
      validEvaluations.push(item);
    } else {
      errors.push(`Item no índice ${index} não é uma avaliação válida`);
    }
  });

  return {
    isValid: errors.length === 0,
    data: validEvaluations,
    errors,
  };
}

/**
 * Valida e retorna um ImportStatus seguro
 */
export function validateImportStatus(
  data: unknown,
): ValidationResult<ImportStatus> {
  const defaultImportStatus: ImportStatus = {
    isOpen: false,
    logs: [],
    progress: 0,
    title: "Aguardando",
    status: "idle",
  };

  if (data === null || data === undefined) {
    return {
      isValid: false,
      data: defaultImportStatus,
      errors: ["ImportStatus é null ou undefined"],
    };
  }

  if (isValidImportStatus(data)) {
    return {
      isValid: true,
      data: data,
      errors: [],
    };
  }

  return {
    isValid: false,
    data: defaultImportStatus,
    errors: ["ImportStatus não possui estrutura válida"],
  };
}

// ============================================================================
// HELPER FUNCTIONS PARA VERIFICAÇÃO SEGURA
// ============================================================================

/**
 * Executa uma operação em um array de forma segura
 */
export function safeArrayOperation<T, R>(
  data: unknown,
  operation: (array: T[]) => R,
  fallback: R,
  validator?: (item: unknown) => item is T,
): R {
  if (!isValidArray(data)) {
    console.warn("safeArrayOperation: dados não são um array válido", data);
    return fallback;
  }

  try {
    if (validator) {
      const validItems = data.filter(validator);
      if (validItems.length !== data.length) {
        console.warn(
          `safeArrayOperation: ${data.length - validItems.length} itens inválidos removidos`,
        );
      }
      return operation(validItems);
    }

    return operation(data);
  } catch (error) {
    console.error("safeArrayOperation: erro durante operação", error);
    return fallback;
  }
}

/**
 * Executa find() de forma segura em um array
 */
export function safeFindInArray<T>(
  data: unknown,
  predicate: (item: T) => boolean,
  validator?: (item: unknown) => item is T,
): T | undefined {
  return safeArrayOperation(
    data,
    (array: T[]) => array.find(predicate),
    undefined,
    validator,
  );
}

/**
 * Executa map() de forma segura em um array
 */
export function safeMapArray<T, R>(
  data: unknown,
  mapper: (item: T, index: number) => R,
  validator?: (item: unknown) => item is T,
): R[] {
  return safeArrayOperation(
    data,
    (array: T[]) => array.map(mapper),
    [],
    validator,
  );
}

/**
 * Executa filter() de forma segura em um array
 */
export function safeFilterArray<T>(
  data: unknown,
  predicate: (item: T) => boolean,
  validator?: (item: unknown) => item is T,
): T[] {
  return safeArrayOperation(
    data,
    (array: T[]) => array.filter(predicate),
    [],
    validator,
  );
}

/**
 * Executa reduce() de forma segura em um array
 */
export function safeReduceArray<T, R>(
  data: unknown,
  reducer: (acc: R, item: T, index: number) => R,
  initialValue: R,
  validator?: (item: unknown) => item is T,
): R {
  return safeArrayOperation(
    data,
    (array: T[]) => array.reduce(reducer, initialValue),
    initialValue,
    validator,
  );
}

/**
 * Acessa propriedade de objeto de forma segura
 */
export function safeObjectProperty<T>(
  obj: unknown,
  property: string,
  fallback: T,
): T {
  if (!isValidObject(obj)) {
    console.warn(
      `safeObjectProperty: objeto inválido para propriedade '${property}'`,
      obj,
    );
    return fallback;
  }

  const value = (obj as Record<string, unknown>)[property];

  if (value === null || value === undefined) {
    console.warn(
      `safeObjectProperty: propriedade '${property}' é null/undefined`,
    );
    return fallback;
  }

  return value as T;
}

/**
 * Verifica se um array tem elementos de forma segura
 */
export function safeArrayLength(data: unknown): number {
  if (!isValidArray(data)) {
    return 0;
  }
  return data.length;
}

/**
 * Obtém o primeiro elemento de um array de forma segura
 */
export function safeArrayFirst<T>(
  data: unknown,
  validator?: (item: unknown) => item is T,
): T | undefined {
  if (!isValidArray(data) || data.length === 0) {
    return undefined;
  }

  const firstItem = data[0];

  if (validator && !validator(firstItem)) {
    return undefined;
  }

  return firstItem as T;
}

/**
 * Obtém o último elemento de um array de forma segura
 */
export function safeArrayLast<T>(
  data: unknown,
  validator?: (item: unknown) => item is T,
): T | undefined {
  if (!isValidArray(data) || data.length === 0) {
    return undefined;
  }

  const lastItem = data[data.length - 1];

  if (validator && !validator(lastItem)) {
    return undefined;
  }

  return lastItem as T;
}

// ============================================================================
// UTILITÁRIOS DE ESTADO SEGURO
// ============================================================================

/**
 * Cria um estado de dados seguro inicial
 */
export function createSafeDataState<T>(initialData: T): SafeDataState<T> {
  return {
    data: initialData,
    loading: false,
    error: null,
    lastFetch: undefined,
  };
}

/**
 * Atualiza estado de dados de forma segura
 */
export function updateSafeDataState<T>(
  currentState: SafeDataState<T>,
  updates: Partial<SafeDataState<T>>,
): SafeDataState<T> {
  return {
    ...currentState,
    ...updates,
    lastFetch: updates.data !== undefined ? new Date() : currentState.lastFetch,
  };
}

/**
 * Verifica se dados estão em estado de loading
 */
export function isDataLoading<T>(state: SafeDataState<T>): boolean {
  return state.loading;
}

/**
 * Verifica se dados têm erro
 */
export function hasDataError<T>(state: SafeDataState<T>): boolean {
  return state.error !== null;
}

/**
 * Verifica se dados são válidos e não estão em loading
 */
export function isDataReady<T>(state: SafeDataState<T>): boolean {
  return !state.loading && state.error === null;
}

// ============================================================================
// CONSTANTES DE FALLBACK
// ============================================================================

/**
 * ImportStatus padrão para fallback
 */
export const DEFAULT_IMPORT_STATUS: ImportStatus = {
  isOpen: false,
  logs: [],
  progress: 0,
  title: "Aguardando",
  status: "idle",
};

/**
 * Array vazio de Attendants para fallback
 */
export const EMPTY_ATTENDANT_ARRAY: Attendant[] = [];

/**
 * Array vazio de Evaluations para fallback
 */
export const EMPTY_EVALUATION_ARRAY: Evaluation[] = [];

/**
 * Array vazio de XpEvents para fallback
 */
export const EMPTY_XP_EVENT_ARRAY: XpEvent[] = [];
