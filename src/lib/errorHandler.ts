/**
 * Sistema centralizado de tratamento de erros para APIs
 */

import { ApiErrorType, getErrorType, getErrorMessage, isValidationError } from './api-types';

// Interface para sistema de toast (pode ser implementado com qualquer biblioteca)
interface ToastSystem {
  error: (title: string, options?: { description?: string }) => void;
  success: (title: string, options?: { description?: string }) => void;
  info: (title: string, options?: { description?: string }) => void;
}

// Toast system padrão (console fallback)
const defaultToastSystem: ToastSystem = {
  error: (title: string, options?: { description?: string }) => {
    console.error(`[Toast Error] ${title}`, options?.description);
  },
  success: (title: string, options?: { description?: string }) => {
    console.log(`[Toast Success] ${title}`, options?.description);
  },
  info: (title: string, options?: { description?: string }) => {
    console.info(`[Toast Info] ${title}`, options?.description);
  },
};

let toastSystem: ToastSystem = defaultToastSystem;

export interface ErrorHandlerConfig {
  showToast?: boolean;
  logToConsole?: boolean;
  redirectOnAuth?: boolean;
}

export class ApiErrorHandler {
  private config: Required<ErrorHandlerConfig>;

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      showToast: config.showToast ?? true,
      logToConsole: config.logToConsole ?? true,
      redirectOnAuth: config.redirectOnAuth ?? true,
    };
  }

  // Permite configurar o sistema de toast externamente
  static setToastSystem(system: ToastSystem): void {
    toastSystem = system;
  }

  handleError(error: any, context?: string): void {
    const errorType = getErrorType(error);
    const errorMessage = getErrorMessage(error);

    // Log do erro
    if (this.config.logToConsole) {
      console.error(`[API Error${context ? ` - ${context}` : ''}]:`, {
        type: errorType,
        message: errorMessage,
        error,
      });
    }

    // Tratamento específico por tipo de erro
    switch (errorType) {
      case ApiErrorType.NETWORK_ERROR:
        this.handleNetworkError(errorMessage);
        break;

      case ApiErrorType.VALIDATION_ERROR:
        this.handleValidationError(error);
        break;

      case ApiErrorType.AUTHENTICATION_ERROR:
        this.handleAuthError();
        break;

      case ApiErrorType.AUTHORIZATION_ERROR:
        this.handleAuthorizationError();
        break;

      case ApiErrorType.NOT_FOUND_ERROR:
        this.handleNotFoundError(errorMessage);
        break;

      case ApiErrorType.RATE_LIMIT_ERROR:
        this.handleRateLimitError();
        break;

      case ApiErrorType.SERVER_ERROR:
        this.handleServerError(errorMessage);
        break;

      default:
        this.handleGenericError(errorMessage);
        break;
    }
  }

  private handleNetworkError(message: string): void {
    if (this.config.showToast) {
      toastSystem.error('Erro de Conexão', {
        description: 'Verifique sua conexão com a internet e tente novamente.',
      });
    }
  }

  private handleValidationError(error: any): void {
    if (this.config.showToast) {
      if (isValidationError(error) && error.details) {
        // Mostra erros de validação específicos
        const firstField = Object.keys(error.details)[0];
        const firstError = error.details[firstField]?.[0];
        
        toastSystem.error('Dados Inválidos', {
          description: firstError || 'Verifique os dados informados.',
        });
      } else {
        toastSystem.error('Dados Inválidos', {
          description: 'Verifique os dados informados e tente novamente.',
        });
      }
    }
  }

  private handleAuthError(): void {
    if (this.config.showToast) {
      toastSystem.error('Sessão Expirada', {
        description: 'Faça login novamente para continuar.',
      });
    }

    if (this.config.redirectOnAuth) {
      // Redireciona para login após um delay
      setTimeout(() => {
        window.location.href = '/auth/signin';
      }, 2000);
    }
  }

  private handleAuthorizationError(): void {
    if (this.config.showToast) {
      toastSystem.error('Acesso Negado', {
        description: 'Você não tem permissão para realizar esta ação.',
      });
    }
  }

  private handleNotFoundError(message: string): void {
    if (this.config.showToast) {
      toastSystem.error('Não Encontrado', {
        description: 'O recurso solicitado não foi encontrado.',
      });
    }
  }

  private handleRateLimitError(): void {
    if (this.config.showToast) {
      toastSystem.error('Muitas Tentativas', {
        description: 'Aguarde um momento antes de tentar novamente.',
      });
    }
  }

  private handleServerError(message: string): void {
    if (this.config.showToast) {
      toastSystem.error('Erro do Servidor', {
        description: 'Ocorreu um erro interno. Tente novamente em alguns instantes.',
      });
    }
  }

  private handleGenericError(message: string): void {
    if (this.config.showToast) {
      toastSystem.error('Erro', {
        description: message || 'Ocorreu um erro inesperado.',
      });
    }
  }
}

// Instância padrão do error handler
export const apiErrorHandler = new ApiErrorHandler();

// Função utilitária para uso direto
export const handleApiError = (error: any, context?: string): void => {
  apiErrorHandler.handleError(error, context);
};