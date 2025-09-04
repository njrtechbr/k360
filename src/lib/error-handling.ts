import { z } from 'zod';
import { toast } from 'sonner';

// Tipos de erro personalizados
export class ValidationError extends Error {
  public readonly errors: Record<string, string>;
  
  constructor(errors: Record<string, string>) {
    const message = Object.values(errors).join(', ');
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class APIError extends Error {
  public readonly status: number;
  public readonly code?: string;
  
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Erro de conexão com o servidor') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Não autorizado') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Acesso negado') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Recurso') {
    super(`${resource} não encontrado`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Conflito de dados') {
    super(message);
    this.name = 'ConflictError';
  }
}

// Interface para resposta de erro da API
export interface APIErrorResponse {
  message: string;
  status: number;
  code?: string;
  errors?: Record<string, string>;
  timestamp?: string;
}

// Função para criar erro baseado na resposta da API
export function createErrorFromResponse(response: APIErrorResponse): Error {
  const { message, status, code, errors } = response;
  
  if (errors && Object.keys(errors).length > 0) {
    return new ValidationError(errors);
  }
  
  switch (status) {
    case 400:
      return new ValidationError({ general: message });
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      return new NetworkError('Erro interno do servidor');
    default:
      return new APIError(message, status, code);
  }
}

// Função para tratar erros de validação Zod
export function handleZodError(error: z.ZodError): ValidationError {
  const errors: Record<string, string> = {};
  
  error.errors.forEach(err => {
    const path = err.path.length > 0 ? err.path.join('.') : 'general';
    errors[path] = err.message;
  });
  
  return new ValidationError(errors);
}

// Função para extrair mensagem de erro amigável
export function getErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    const firstError = Object.values(error.errors)[0];
    return firstError || 'Dados inválidos';
  }
  
  if (error instanceof APIError) {
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  if (error instanceof AuthenticationError) {
    return 'Sessão expirada. Faça login novamente.';
  }
  
  if (error instanceof AuthorizationError) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  
  if (error instanceof NotFoundError) {
    return error.message;
  }
  
  if (error instanceof ConflictError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro inesperado. Tente novamente.';
}

// Função para obter todas as mensagens de erro de validação
export function getValidationErrors(error: unknown): Record<string, string> {
  if (error instanceof ValidationError) {
    return error.errors;
  }
  
  return {};
}

// Função para verificar se é erro de validação
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

// Função para verificar se é erro de API
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

// Função para verificar se é erro de rede
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

// Função para verificar se é erro de autenticação
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

// Função para verificar se é erro de autorização
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

// Função para log de erros (pode ser integrada com serviços de monitoramento)
export function logError(error: unknown, context?: Record<string, any>) {
  const errorInfo = {
    message: getErrorMessage(error),
    name: error instanceof Error ? error.name : 'UnknownError',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString()
  };
  
  // Em desenvolvimento, log no console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo);
  }
  
  // Em produção, enviar para serviço de monitoramento
  // Exemplo: Sentry, LogRocket, etc.
  // sendToMonitoringService(errorInfo);
}

// Função para exibir toast de erro
export function showErrorToast(error: unknown, customMessage?: string) {
  const message = customMessage || getErrorMessage(error);
  
  if (isValidationError(error)) {
    // Para erros de validação, mostra o primeiro erro
    const firstError = Object.values(error.errors)[0];
    toast.error(firstError || message);
  } else {
    toast.error(message);
  }
}

// Função para exibir toast de sucesso
export function showSuccessToast(message: string) {
  toast.success(message);
}

// Função para exibir toast de aviso
export function showWarningToast(message: string) {
  toast.warning(message);
}

// Função para exibir toast de informação
export function showInfoToast(message: string) {
  toast.info(message);
}

// Wrapper para operações assíncronas com tratamento de erro
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    showToast?: boolean;
    customErrorMessage?: string;
    onError?: (error: unknown) => void;
    context?: Record<string, any>;
  }
): Promise<T | null> {
  const { showToast = true, customErrorMessage, onError, context } = options || {};
  
  try {
    return await operation();
  } catch (error) {
    // Log do erro
    logError(error, context);
    
    // Callback personalizado de erro
    onError?.(error);
    
    // Exibir toast se solicitado
    if (showToast) {
      showErrorToast(error, customErrorMessage);
    }
    
    return null;
  }
}

// Wrapper para operações síncronas com tratamento de erro
export function withSyncErrorHandling<T>(
  operation: () => T,
  options?: {
    showToast?: boolean;
    customErrorMessage?: string;
    onError?: (error: unknown) => void;
    context?: Record<string, any>;
  }
): T | null {
  const { showToast = true, customErrorMessage, onError, context } = options || {};
  
  try {
    return operation();
  } catch (error) {
    // Log do erro
    logError(error, context);
    
    // Callback personalizado de erro
    onError?.(error);
    
    // Exibir toast se solicitado
    if (showToast) {
      showErrorToast(error, customErrorMessage);
    }
    
    return null;
  }
}

// Função para retry com backoff exponencial
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Se é o último attempt, não faz retry
      if (attempt === maxRetries) {
        break;
      }
      
      // Não faz retry para alguns tipos de erro
      if (isAuthenticationError(error) || isAuthorizationError(error) || isValidationError(error)) {
        break;
      }
      
      // Calcula delay com backoff exponencial
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      // Adiciona jitter para evitar thundering herd
      const jitter = Math.random() * 0.1 * delay;
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError;
}

// Função para criar um error boundary personalizado
export function createErrorBoundary(fallbackComponent: React.ComponentType<{ error: Error }>) {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      logError(error, { errorInfo });
    }
    
    render() {
      if (this.state.hasError && this.state.error) {
        return React.createElement(fallbackComponent, { error: this.state.error });
      }
      
      return this.props.children;
    }
  };
}