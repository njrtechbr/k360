# Design Document

## Overview

Este documento detalha o design técnico para corrigir os erros críticos identificados no sistema de pesquisa de satisfação e gamificação. A análise revelou que os principais problemas estão relacionados a:

1. **Validação de dados insuficiente**: Arrays e objetos sendo usados sem verificação de existência
2. **Inicialização inadequada de estados**: Estados sendo inicializados como `null` em vez de valores seguros
3. **Páginas faltantes**: Rotas definidas mas não implementadas
4. **Tratamento de erros de API inadequado**: Falhas de API causando quebra da interface

O design foca em criar uma arquitetura robusta que previne erros de runtime e oferece fallbacks apropriados.

## Architecture

### Padrão de Validação de Dados

Implementaremos um padrão consistente de validação de dados em todos os componentes que manipulam arrays e objetos:

```typescript
// Padrão atual (problemático)
const sortedAttendants = [...attendants].sort((a, b) => a.name.localeCompare(b.name));

// Padrão seguro (novo)
const sortedAttendants = (attendants && Array.isArray(attendants) ? [...attendants] : [])
  .sort((a, b) => a.name.localeCompare(b.name));
```

### Arquitetura de Estados Seguros

Modificaremos o `PrismaProvider` para garantir que todos os estados sejam inicializados com valores seguros:

```typescript
// Estado atual (problemático)
const [attendants, setAttendants] = useState<Attendant[]>([]);

// Estado seguro com validação
const [attendants, setAttendants] = useState<Attendant[]>([]);
const [attendantsLoading, setAttendantsLoading] = useState(true);
const [attendantsError, setAttendantsError] = useState<string | null>(null);
```

### Padrão de Tratamento de Erros de API

Implementaremos um sistema consistente de tratamento de erros de API com fallbacks:

```typescript
try {
  const response = await fetch('/api/attendants');
  if (response.ok) {
    const data = await response.json();
    setAttendants(Array.isArray(data) ? data : []);
    setAttendantsError(null);
  } else {
    throw new Error(`API Error: ${response.status}`);
  }
} catch (error) {
  console.error('Failed to fetch attendants:', error);
  setAttendantsError(error.message);
  setAttendants([]); // Fallback seguro
}
```

## Components and Interfaces

### 1. Componente de Validação de Dados (DataValidator)

```typescript
interface DataValidatorProps<T> {
  data: T | null | undefined;
  fallback: T;
  children: (validData: T) => React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

export function DataValidator<T>({ 
  data, 
  fallback, 
  children, 
  loading = false, 
  error = null 
}: DataValidatorProps<T>) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  const validData = data ?? fallback;
  return <>{children(validData)}</>;
}
```

### 2. Hook de Estado Seguro (useSafeState)

```typescript
interface SafeStateConfig<T> {
  initialValue: T;
  validator?: (value: any) => value is T;
  fallback?: T;
}

export function useSafeState<T>(config: SafeStateConfig<T>) {
  const [data, setData] = useState<T>(config.initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setSafeData = useCallback((newData: any) => {
    if (config.validator && !config.validator(newData)) {
      console.warn('Invalid data provided, using fallback');
      setData(config.fallback ?? config.initialValue);
      return;
    }
    setData(newData);
  }, [config]);
  
  return { data, setData: setSafeData, loading, setLoading, error, setError };
}
```

### 3. Componente AttendantTable Refatorado

```typescript
interface AttendantTableProps {
  attendants: Attendant[] | null | undefined;
  isLoading?: boolean;
  error?: string | null;
  onEdit: (attendant: Attendant) => void;
  onDelete: (attendant: Attendant) => void;
  onQrCode: (attendant: Attendant) => void;
  onCopyLink: (attendant: Attendant) => void;
}

export default function AttendantTable({
  attendants,
  isLoading = false,
  error = null,
  ...handlers
}: AttendantTableProps) {
  // Validação segura de dados
  const safeAttendants = useMemo(() => {
    if (!attendants || !Array.isArray(attendants)) {
      return [];
    }
    return attendants.filter(a => a && typeof a === 'object' && a.id);
  }, [attendants]);
  
  const sortedAttendants = useMemo(() => {
    return [...safeAttendants].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
  }, [safeAttendants]);
  
  if (isLoading) return <LoadingTable />;
  if (error) return <ErrorTable error={error} />;
  if (sortedAttendants.length === 0) return <EmptyTable />;
  
  return <TableContent attendants={sortedAttendants} {...handlers} />;
}
```

### 4. PrismaProvider Melhorado

```typescript
// Adicionar estados de loading e error para cada entidade
const [attendantsState, setAtendantsState] = useState({
  data: [] as Attendant[],
  loading: true,
  error: null as string | null
});

const [importStatusState, setImportStatusState] = useState({
  data: INITIAL_IMPORT_STATUS,
  loading: false,
  error: null as string | null
});

// Função de fetch com tratamento robusto
const fetchAttendants = useCallback(async () => {
  setAtendantsState(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    const response = await fetch('/api/attendants');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const validData = Array.isArray(data) ? data : [];
    
    setAtendantsState({
      data: validData,
      loading: false,
      error: null
    });
  } catch (error) {
    console.error('Failed to fetch attendants:', error);
    setAtendantsState({
      data: [], // Fallback seguro
      loading: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}, []);
```

## Data Models

### Estado de Dados Seguro

```typescript
interface SafeDataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
}

interface PrismaContextType {
  // Estados seguros para todas as entidades
  attendants: SafeDataState<Attendant[]>;
  evaluations: SafeDataState<Evaluation[]>;
  importStatus: SafeDataState<ImportStatus>;
  gamificationConfig: SafeDataState<GamificationConfig>;
  
  // Funções com tratamento de erro
  fetchAttendants: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  
  // Indicadores globais
  hasAnyError: boolean;
  isAnyLoading: boolean;
}
```

### Validadores de Tipo

```typescript
export const isAttendantArray = (data: any): data is Attendant[] => {
  return Array.isArray(data) && data.every(item => 
    item && 
    typeof item === 'object' && 
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  );
};

export const isImportStatus = (data: any): data is ImportStatus => {
  return data && 
    typeof data === 'object' &&
    typeof data.isOpen === 'boolean' &&
    Array.isArray(data.logs) &&
    typeof data.progress === 'number' &&
    typeof data.status === 'string';
};
```

## Error Handling

### Sistema de Fallbacks em Cascata

1. **Nível de Componente**: Validação local com fallbacks
2. **Nível de Hook**: Estados seguros com valores padrão
3. **Nível de Provider**: Tratamento de erros de API com retry
4. **Nível de Aplicação**: Boundary de erro global

### Componentes de Erro Padronizados

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ComponentErrorBoundary extends Component<
  PropsWithChildren<{}>, 
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Estados de Loading Padronizados

```typescript
export const LoadingStates = {
  Table: () => (
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-10 w-48" /></TableCell>
            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  
  Card: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  )
};
```

## Testing Strategy

### Testes de Validação de Dados

```typescript
describe('AttendantTable Data Validation', () => {
  it('should handle null attendants gracefully', () => {
    render(<AttendantTable attendants={null} {...mockHandlers} />);
    expect(screen.getByText('Nenhum atendente cadastrado')).toBeInTheDocument();
  });

  it('should handle undefined attendants gracefully', () => {
    render(<AttendantTable attendants={undefined} {...mockHandlers} />);
    expect(screen.getByText('Nenhum atendente cadastrado')).toBeInTheDocument();
  });

  it('should handle invalid attendants array gracefully', () => {
    render(<AttendantTable attendants={[null, undefined, {}]} {...mockHandlers} />);
    expect(screen.getByText('Nenhum atendente cadastrado')).toBeInTheDocument();
  });
});
```

### Testes de Estados de Erro

```typescript
describe('PrismaProvider Error Handling', () => {
  it('should set error state when API fails', async () => {
    fetchMock.mockRejectOnce(new Error('API Error'));
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: PrismaProvider
    });
    
    await waitFor(() => {
      expect(result.current.attendants.error).toBe('API Error');
      expect(result.current.attendants.data).toEqual([]);
    });
  });
});
```

### Testes de Integração

```typescript
describe('Page Integration Tests', () => {
  it('should render attendants page without errors when data is null', () => {
    mockUseAuth.mockReturnValue({
      attendants: null,
      appLoading: false,
      // ... outros mocks
    });
    
    render(<AtendentesPage />);
    expect(screen.getByText('Atendentes')).toBeInTheDocument();
  });
});
```

## Implementation Phases

### Fase 1: Correções Críticas Imediatas
- Corrigir AttendantTable.tsx com validação de dados
- Corrigir páginas com erros de runtime
- Implementar estados seguros no PrismaProvider

### Fase 2: Páginas Faltantes
- Criar páginas 404 identificadas
- Implementar rotas de avaliação e relatórios
- Criar páginas de gamificação faltantes

### Fase 3: Melhorias de Robustez
- Implementar sistema de fallbacks
- Adicionar componentes de erro padronizados
- Melhorar tratamento de APIs

### Fase 4: Testes e Validação
- Implementar testes unitários para validação
- Testes de integração para cenários de erro
- Validação completa do sistema

## Performance Considerations

### Memoização de Validações

```typescript
const validatedAttendants = useMemo(() => {
  return validateAttendantsArray(attendants);
}, [attendants]);
```

### Lazy Loading de Componentes

```typescript
const AttendantForm = lazy(() => import('@/components/rh/AttendantForm'));
const QRCodeDialog = lazy(() => import('@/components/rh/QRCodeDialog'));
```

### Debounce de Chamadas de API

```typescript
const debouncedFetchData = useMemo(
  () => debounce(fetchAllData, 300),
  [fetchAllData]
);
```

## Security Considerations

### Validação de Entrada
- Validar todos os dados recebidos de APIs
- Sanitizar dados antes de renderização
- Verificar tipos de dados em runtime

### Tratamento de Erros Seguro
- Não expor informações sensíveis em mensagens de erro
- Logar erros detalhados apenas no servidor
- Implementar rate limiting para tentativas de retry

### Controle de Acesso
- Verificar permissões antes de renderizar componentes
- Implementar fallbacks para usuários sem permissão
- Validar sessão antes de chamadas de API críticas