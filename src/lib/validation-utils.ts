import { z } from 'zod';
import { validateData, validateAndTransform } from './validation';

// Re-export validateAndTransform for external use
export { validateAndTransform };

// Utilitários para validação de formulários e APIs

/**
 * Formata erros de validação para exibição em formulários
 */
export function formatValidationErrors(errors: string[]): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  errors.forEach(error => {
    const [field, ...messageParts] = error.split(': ');
    const message = messageParts.join(': ');
    
    if (field && message) {
      formattedErrors[field] = message;
    } else {
      formattedErrors.general = error;
    }
  });
  
  return formattedErrors;
}

/**
 * Valida dados de formulário e retorna erros formatados
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { isValid: true; data: T; errors: null } | { isValid: false; data: null; errors: Record<string, string> } {
  const result = validateData(schema, data);
  
  if (result.success) {
    return { isValid: true, data: result.data, errors: null };
  }
  
  return { 
    isValid: false, 
    data: null, 
    errors: formatValidationErrors(result.errors) 
  };
}

/**
 * Middleware de validação para APIs
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    try {
      return validateAndTransform(schema, data);
    } catch (error) {
      throw new Error(`Dados inválidos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };
}

/**
 * Valida e sanitiza string removendo espaços extras
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Valida formato de CPF
 */
export function isValidCPF(cpf: string): boolean {
  // Remove formatação
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Valida dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone para exibição
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Valida se uma data está no futuro
 */
export function isDateInFuture(date: string | Date): boolean {
  const inputDate = new Date(date);
  const now = new Date();
  return inputDate > now;
}

/**
 * Valida se uma data está no passado
 */
export function isDateInPast(date: string | Date): boolean {
  const inputDate = new Date(date);
  const now = new Date();
  return inputDate < now;
}

/**
 * Valida idade mínima
 */
export function isMinimumAge(birthDate: string | Date, minimumAge: number): boolean {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= minimumAge;
  }
  
  return age >= minimumAge;
}

/**
 * Valida força da senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Comprimento
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Senha deve ter pelo menos 8 caracteres');
  }
  
  // Letra minúscula
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  // Letra maiúscula
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  // Número
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos um número');
  }
  
  // Caractere especial
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Senha deve conter pelo menos um caractere especial');
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback
  };
}

/**
 * Valida URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se um valor está dentro de um range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Valida se um array não está vazio
 */
export function isNonEmptyArray<T>(array: T[]): array is [T, ...T[]] {
  return Array.isArray(array) && array.length > 0;
}

/**
 * Valida se um objeto não está vazio
 */
export function isNonEmptyObject(obj: object): boolean {
  return Object.keys(obj).length > 0;
}

/**
 * Remove caracteres especiais de uma string
 */
export function removeSpecialCharacters(str: string): string {
  return str.replace(/[^a-zA-Z0-9\s]/g, '');
}

/**
 * Valida se uma string contém apenas letras e espaços
 */
export function isAlphaWithSpaces(str: string): boolean {
  return /^[a-zA-ZÀ-ÿ\s]+$/.test(str);
}

/**
 * Valida se uma string contém apenas números
 */
export function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * Valida se uma string é alfanumérica
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Converte string para slug (URL-friendly)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Valida se um valor é um UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Trunca texto mantendo palavras completas
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Capitaliza primeira letra de cada palavra
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Valida se um período de datas é válido
 */
export function isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

/**
 * Calcula diferença em dias entre duas datas
 */
export function daysDifference(date1: string | Date, date2: string | Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}