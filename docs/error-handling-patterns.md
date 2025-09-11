# Padrões de Tratamento de Erros

## Visão Geral

Este documento descreve os padrões padronizados para tratamento de erros na arquitetura baseada em APIs. O objetivo é garantir uma experiência consistente para o usuário e facilitar o debug para desenvolvedores.

## Tipos de Erro

### 1. Erros de Rede
Problemas de conectividade, timeouts, DNS, etc.

```typescript
interface NetworkError {
  type: 'NETWORK_ERROR';
  message: string;
  code?: 'TIMEOUT' | 'CONNECTION_REFUSED' | 'DNS_ERROR';
  retryable: boolean;
}
```

### 2. Erros de Validação (400)
Dados inválidos enviados para a API.

```typescript
interface ValidationError {
  type: 'VALIDATION_ERROR';
  message: string;
  details: Record<string, string[]>; // Campo -> lista de erros
  retryable: false;
}
```

### 3. Erros de Autenticação (401)
Token inválido, expirado ou ausente.

```typescript
interface AuthenticationError {
  type: 'AUTHENTICATION_ERROR';
  message: string;
  code: 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'TOKEN_MISSING';
  retryable: false;
}
```

### 4. Erros de Autorização (403)
Usuário não tem permissão para a operação.

```typescript
interface AuthorizationError {
  type: 'AUTHORIZATION_ERROR';
  message: string;
  requiredRole?: string;
  retryable: false;
}
```

### 5. Erros de Servidor (500)
Erros internos do servidor.

```typescript
interface ServerError {
  type: 'SERVER_ERROR';
  message: string;
  code?: string;
  retryable: boolean;
}
```

## HTTP Client Error Handling

### Configuração Base

```typescript
// src/lib/httpClient.ts
export class HttpClient {
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      return this.handleError(response);
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao processar resposta do servidor'
      };
    }
  }

  private async handleError(response: Response): Promise<ApiResponse<never>> {
    let errorMessage = 'Erro desconhecido';
    let errorDetails: Record<string, string[]> | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData.details;
    } catch {
      // Se não conseguir parsear JSON, usar mensagem padrão baseada no status
      errorMessage = this.getDefaultErrorMessage(response.status);
    }

    // Log do erro para debug
    console.error('API Error:', {
      status: response.status,
      url: response.url,
      message: errorMessage,
      details: errorDetails
    });

    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }

  private getDefaultErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Dados inválidos fornecidos';
      case 401:
        return 'Você precisa fazer login novamente';
      case 403:
        return 'Você não tem permissão para esta operação';
      case 404:
        return 'Recurso não encontrado';
      case 422:
        return 'Dados fornecidos são inválidos';
      case 429:
        return 'Muitas tentativas. Tente novamente em alguns minutos';
      case 500:
        return 'Erro interno do servidor. Tente novamente mais tarde';
      case 502:
      case 503:
      case 504:
        return 'Serviço temporariamente indisponível';
      default:
        return 'Erro de comunicação com o servidor';
    }
  }
}
```

### Retry Logic

```typescript
export class HttpClient {
  private async executeWithRetry<T>(
    requestFn: () => Promise<Response>,
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await requestFn();
        
        // Não fazer retry para erros de cliente (4xx)
        if (response.status >= 400 && response.status < 500) {
          return this.handleResponse<T>(response);
        }

        // Fazer retry para erros de servidor (5xx) e problemas de rede
        if (response.status >= 500 && attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }

        return this.handleResponse<T>(response);
      } catch (error) {
        lastError = error as Error;
        
        // Fazer retry para erros de rede
        if (attempt < retries && this.isRetryableError(error)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    return {
      success: false,
      error: lastError?.message || 'Erro de conexão'
    };
  }

  private isRetryableError(error: any): boolean {
    return (
      error.name === 'TypeError' || // Network errors
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Hook Error Handling

### useApiQuery Error Handling

```typescript
// src/hooks/api/useApiQuery.ts
export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: UseApiQueryOptions<T>
) {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await httpClient.get<T>(url);
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Erro ao carregar dados');
        
        // Tratar erros específicos
        if (response.error?.includes('401') || response.error?.includes('login')) {
          // Redirecionar para login
          window.location.href = '/auth/signin';
          return;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      // Log para debug
      console.error('useApiQuery error:', { key, url, error: err });
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options?.enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
```

### useApiMutation Error Handling

```typescript
// src/hooks/api/useApiMutation.ts
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>
) {
  const [data, setData] = useState<TData | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mutationFn(variables);
      
      if (response.success) {
        setData(response.data);
        
        // Mostrar mensagem de sucesso se fornecida
        if (response.message) {
          toast.success(response.message);
        }
        
        return response.data;
      } else {
        const errorMessage = response.error || 'Erro na operação';
        setError(errorMessage);
        
        // Mostrar toast de erro
        toast.error(errorMessage);
        
        // Tratar erros de validação
        if (response.details) {
          // Pode ser usado para destacar campos específicos
          console.warn('Validation errors:', response.details);
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      // Log para debug
      console.error('useApiMutation error:', { error: err });
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  return {
    mutate,
    data,
    loading,
    error
  };
}
```

## Component Error Handling

### Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Aqui você pode enviar o erro para um serviço de monitoramento
    // reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Algo deu errado
      </h3>
      <p className="text-red-600 mb-4">
        Ocorreu um erro inesperado. Por favor, recarregue a página.
      </p>
      <details className="text-sm text-red-500">
        <summary>Detalhes técnicos</summary>
        <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
      </details>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Recarregar Página
      </button>
    </div>
  );
}
```

### Error Display Components

```typescript
// src/components/ui/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string;
  details?: Record<string, string[]>;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ 
  message, 
  details, 
  onRetry, 
  className 
}: ErrorMessageProps) {
  return (
    <div className={cn("p-4 border border-red-200 rounded-lg bg-red-50", className)}>
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
        <div className="flex-1">
          <p className="text-red-800 font-medium">{message}</p>
          
          {details && (
            <div className="mt-2">
              <p className="text-sm text-red-600 mb-1">Detalhes:</p>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {Object.entries(details).map(([field, errors]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// src/components/ui/LoadingSpinner.tsx
export function LoadingSpinner({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span className="text-gray-600">{message}</span>
    </div>
  );
}
```

### Form Error Handling

```typescript
// src/components/forms/UserForm.tsx
export function UserForm({ onSubmit }: { onSubmit: (data: CreateUserData) => Promise<void> }) {
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    role: 'USUARIO'
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Limpar erros anteriores
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      
      // Sucesso - limpar formulário
      setFormData({ name: '', email: '', role: 'USUARIO' });
      toast.success('Usuário criado com sucesso!');
      
    } catch (error) {
      if (error instanceof Error) {
        // Tentar extrair erros de validação da mensagem
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.details) {
            // Converter erros de API para erros de campo
            const newFieldErrors: Record<string, string> = {};
            Object.entries(errorData.details).forEach(([field, errors]) => {
              newFieldErrors[field] = (errors as string[]).join(', ');
            });
            setFieldErrors(newFieldErrors);
          } else {
            setSubmitError(error.message);
          }
        } catch {
          // Se não conseguir parsear, mostrar erro geral
          setSubmitError(error.message);
        }
      } else {
        setSubmitError('Erro desconhecido ao criar usuário');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <ErrorMessage message={submitError} />
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Nome
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            fieldErrors.name ? "border-red-500" : "border-gray-300"
          )}
        />
        {fieldErrors.name && (
          <p className="text-sm text-red-600 mt-1">{fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            fieldErrors.email ? "border-red-500" : "border-gray-300"
          )}
        />
        {fieldErrors.email && (
          <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Criando...' : 'Criar Usuário'}
      </button>
    </form>
  );
}
```

## Global Error Handling

### Toast Notifications

```typescript
// src/lib/toast.ts
interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

class ToastManager {
  success(message: string, options?: ToastOptions) {
    // Implementação do toast de sucesso
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    // Implementação do toast de erro
    this.show(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions) {
    // Implementação do toast de aviso
    this.show(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions) {
    // Implementação do toast de informação
    this.show(message, 'info', options);
  }

  private show(message: string, type: 'success' | 'error' | 'warning' | 'info', options?: ToastOptions) {
    // Implementação específica do sistema de toast escolhido
    // Pode ser react-hot-toast, sonner, ou implementação customizada
  }
}

export const toast = new ToastManager();
```

### Error Reporting

```typescript
// src/lib/errorReporting.ts
interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: Date;
  userId?: string;
  additionalData?: Record<string, any>;
}

class ErrorReporter {
  report(error: Error, additionalData?: Record<string, any>) {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      additionalData
    };

    // Em desenvolvimento, apenas log no console
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', report);
      return;
    }

    // Em produção, enviar para serviço de monitoramento
    this.sendToMonitoringService(report);
  }

  private async sendToMonitoringService(report: ErrorReport) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (err) {
      // Falha silenciosa - não queremos quebrar a aplicação
      console.error('Failed to report error:', err);
    }
  }
}

export const errorReporter = new ErrorReporter();

// Hook para capturar erros não tratados
export function useErrorReporting() {
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      errorReporter.report(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorReporter.report(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandled_promise_rejection' }
      );
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
```

## Boas Práticas

### 1. Sempre Tratar Estados de Erro

```typescript
// ✅ Correto
function UsersList() {
  const { data, loading, error, refetch } = useUsersData();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  
  return <div>{/* Renderizar dados */}</div>;
}

// ❌ Evitar
function UsersList() {
  const { data } = useUsersData();
  return <div>{data?.map(...)}</div>; // Pode quebrar
}
```

### 2. Mensagens de Erro User-Friendly

```typescript
// ✅ Correto
const getErrorMessage = (error: string): string => {
  if (error.includes('network')) return 'Problema de conexão. Verifique sua internet.';
  if (error.includes('401')) return 'Sua sessão expirou. Faça login novamente.';
  if (error.includes('403')) return 'Você não tem permissão para esta ação.';
  return 'Ocorreu um erro. Tente novamente.';
};

// ❌ Evitar
return <div>Error: ECONNREFUSED 127.0.0.1:5432</div>; // Muito técnico
```

### 3. Logging Estruturado

```typescript
// ✅ Correto
console.error('API Error:', {
  endpoint: '/api/users',
  method: 'POST',
  status: 400,
  error: errorMessage,
  timestamp: new Date().toISOString(),
  userId: currentUser?.id
});

// ❌ Evitar
console.log('erro'); // Muito vago
```

### 4. Retry Inteligente

```typescript
// ✅ Correto - retry apenas para erros apropriados
const shouldRetry = (error: any): boolean => {
  // Retry para erros de rede e servidor
  return error.status >= 500 || error.code === 'NETWORK_ERROR';
};

// ❌ Evitar - retry para todos os erros
const shouldRetry = (): boolean => true; // Pode causar loops infinitos
```

### 5. Fallbacks Apropriados

```typescript
// ✅ Correto
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useApiQuery(['user', userId], `/api/users/${userId}`);

  if (loading) return <UserProfileSkeleton />;
  if (error) return <UserProfileError onRetry={() => refetch()} />;
  if (!user) return <UserNotFound />;
  
  return <UserProfileContent user={user} />;
}

// ❌ Evitar
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useApiQuery(['user', userId], `/api/users/${userId}`);
  return <div>{user.name}</div>; // Pode quebrar
}
```