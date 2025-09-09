import * as React from "react"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Props para o componente DataValidator
 */
interface DataValidatorProps<T> {
  /** Dados a serem validados */
  data: T | null | undefined;
  /** Valor de fallback usado quando dados são inválidos */
  fallback: T;
  /** Função que renderiza o conteúdo quando dados são válidos */
  children: (validData: T) => React.ReactNode;
  /** Estado de carregamento */
  loading?: boolean;
  /** Mensagem de erro */
  error?: string | null;
  /** Função de validação customizada */
  validator?: (data: any) => data is T;
  /** Componente de loading customizado */
  loadingComponent?: React.ReactNode;
  /** Componente de erro customizado */
  errorComponent?: React.ReactNode;
  /** Componente para dados vazios */
  emptyComponent?: React.ReactNode;
  /** Função chamada quando usuário clica em retry */
  onRetry?: () => void;
  /** Classe CSS adicional */
  className?: string;
  /** Se deve mostrar avisos no console */
  enableWarnings?: boolean;
  /** Mensagem customizada para dados vazios */
  emptyMessage?: string;
  /** Se deve tratar arrays vazios como estado vazio */
  treatEmptyArrayAsEmpty?: boolean;
}

/**
 * Componente genérico para validação de dados com estados de loading e error
 * 
 * Este componente wrapper fornece validação robusta de dados e renderização
 * condicional baseada no estado dos dados (loading, error, empty, valid).
 * 
 * @example
 * ```tsx
 * <DataValidator
 *   data={attendants}
 *   fallback={[]}
 *   loading={isLoading}
 *   error={error}
 *   validator={(data): data is Attendant[] => Array.isArray(data)}
 *   onRetry={refetchData}
 *   emptyMessage="Nenhum atendente encontrado"
 * >
 *   {(validAttendants) => (
 *     <AttendantTable attendants={validAttendants} />
 *   )}
 * </DataValidator>
 * ```
 */
export function DataValidator<T>({
  data,
  fallback,
  children,
  loading = false,
  error = null,
  validator,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry,
  className,
  enableWarnings = true,
  emptyMessage = "Nenhum dado disponível",
  treatEmptyArrayAsEmpty = true
}: DataValidatorProps<T>) {
  // Estado de loading
  if (loading) {
    if (loadingComponent) {
      return <div className={cn("data-validator-loading", className)}>{loadingComponent}</div>;
    }
    
    return (
      <div className={cn("data-validator-loading space-y-4", className)}>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando dados...</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    if (errorComponent) {
      return <div className={cn("data-validator-error", className)}>{errorComponent}</div>;
    }

    return (
      <div className={cn("data-validator-error", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">{error}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Tentar novamente
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Validação de dados
  let validData: T;
  let isValid = true;
  let validationError: string | null = null;

  try {
    // Se dados são null ou undefined, usa fallback
    if (data === null || data === undefined) {
      if (enableWarnings) {
        console.warn('DataValidator: Dados são null ou undefined, usando fallback');
      }
      validData = fallback;
      isValid = false;
    }
    // Se há validador customizado, usa ele
    else if (validator && !validator(data)) {
      if (enableWarnings) {
        console.warn('DataValidator: Dados falharam na validação customizada, usando fallback', data);
      }
      validData = fallback;
      isValid = false;
      validationError = 'Dados não passaram na validação';
    }
    // Caso contrário, usa os dados fornecidos
    else {
      validData = data;
    }
  } catch (err) {
    if (enableWarnings) {
      console.error('DataValidator: Erro durante validação', err);
    }
    validData = fallback;
    isValid = false;
    validationError = err instanceof Error ? err.message : 'Erro desconhecido na validação';
  }

  // Verifica se dados estão vazios (para arrays)
  // Só considera vazio se os dados originais eram válidos mas resultaram em array vazio
  const isEmpty = treatEmptyArrayAsEmpty && 
    Array.isArray(validData) && 
    validData.length === 0 &&
    isValid; // Só mostra estado vazio se dados eram válidos originalmente

  // Estado vazio
  if (isEmpty) {
    if (emptyComponent) {
      return <div className={cn("data-validator-empty", className)}>{emptyComponent}</div>;
    }

    return (
      <div className={cn("data-validator-empty", className)}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dados não encontrados</AlertTitle>
          <AlertDescription>
            {emptyMessage}
            {onRetry && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Recarregar
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Se houve erro de validação mas temos fallback, mostra aviso
  if (!isValid && validationError && enableWarnings) {
    console.warn('DataValidator: Renderizando com dados de fallback devido a erro de validação');
  }

  // Renderiza conteúdo com dados válidos
  return (
    <div className={cn("data-validator-content", className)}>
      {children(validData)}
    </div>
  );
}

/**
 * Componente de loading padrão para tabelas
 */
export function LoadingTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando tabela...</span>
      </div>
      <div className="border rounded-lg">
        <div className="border-b p-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex space-x-4">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-20" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de loading padrão para cards
 */
export function LoadingCard() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

/**
 * Componente de erro padrão para tabelas
 */
export function ErrorTable({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void; 
}) {
  return (
    <div className="border rounded-lg p-8">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar tabela</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">{error}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Tentar novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Componente de estado vazio padrão para tabelas
 */
export function EmptyTable({ 
  message = "Nenhum dado encontrado",
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void; 
}) {
  return (
    <div className="border rounded-lg p-8 text-center">
      <div className="flex flex-col items-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Dados não encontrados</h3>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="h-8"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Recarregar
          </Button>
        )}
      </div>
    </div>
  );
}

export { type DataValidatorProps };