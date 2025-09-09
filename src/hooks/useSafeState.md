# useSafeState Hook

Hook customizado que gerencia dados, loading e error states com validação automática e fallbacks seguros.

## Características

- ✅ **Validação automática** de dados com fallbacks seguros
- ✅ **Estados integrados** de loading, error e data
- ✅ **Tratamento de exceções** robusto
- ✅ **Validadores pré-construídos** para casos comuns
- ✅ **TypeScript** com tipagem completa
- ✅ **Logging configurável** para debugging

## Uso Básico

```typescript
import { useSafeState, validators } from '@/hooks/useSafeState';

// Exemplo com array de atendentes
const attendantsState = useSafeState({
  initialValue: [] as Attendant[],
  validator: validators.isArray,
  fallback: [],
  enableWarnings: true
});

// Uso no componente
if (attendantsState.loading) return <Loading />;
if (attendantsState.error) return <Error message={attendantsState.error} />;

return <AttendantTable attendants={attendantsState.data} />;
```

## Exemplos de Uso

### 1. Array de Atendentes com Validação

```typescript
const attendantsState = useSafeState({
  initialValue: [] as Attendant[],
  validator: validators.isArrayOfObjects(['id', 'name', 'email']),
  fallback: [],
  enableWarnings: true
});

// Fetch seguro de dados
const fetchAttendants = async () => {
  attendantsState.setLoading(true);
  try {
    const response = await fetch('/api/attendants');
    const data = await response.json();
    attendantsState.setData(data); // Validação automática
  } catch (error) {
    attendantsState.setError(error.message);
  } finally {
    attendantsState.setLoading(false);
  }
};
```

### 2. Status de Importação

```typescript
const importState = useSafeState({
  initialValue: {
    isOpen: false,
    status: 'idle',
    progress: 0,
    logs: []
  } as ImportStatus,
  validator: validators.isObjectWithProps(['isOpen', 'status', 'progress', 'logs']),
  fallback: {
    isOpen: false,
    status: 'idle',
    progress: 0,
    logs: []
  }
});
```

### 3. Dados de Gamificação

```typescript
const gamificationState = useSafeState({
  initialValue: null as GamificationConfig | null,
  validator: (data): data is GamificationConfig => 
    data !== null && typeof data === 'object' && 'xpPerEvaluation' in data,
  fallback: null,
  enableWarnings: false // Silenciar warnings para dados opcionais
});
```

### 4. String de Pesquisa

```typescript
const searchState = useSafeState({
  initialValue: '',
  validator: validators.isNonEmptyString,
  fallback: '',
  enableWarnings: false
});

// Uso com debounce
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchState.setData(query);
  }, 300),
  [searchState.setData]
);
```

## Validadores Disponíveis

### `validators.isArray`
Valida se o valor é um array.

```typescript
validators.isArray([1, 2, 3]) // true
validators.isArray('not array') // false
```

### `validators.isArrayOfObjects(requiredProps)`
Valida se o valor é um array de objetos com propriedades específicas.

```typescript
const validator = validators.isArrayOfObjects(['id', 'name']);
validator([{ id: 1, name: 'Test' }]) // true
validator([{ id: 1 }]) // false - falta 'name'
```

### `validators.isObjectWithProps(requiredProps)`
Valida se o valor é um objeto com propriedades específicas.

```typescript
const validator = validators.isObjectWithProps(['id', 'name']);
validator({ id: 1, name: 'Test' }) // true
validator({ id: 1 }) // false - falta 'name'
```

### `validators.isNonEmptyString`
Valida se o valor é uma string não vazia.

```typescript
validators.isNonEmptyString('test') // true
validators.isNonEmptyString('') // false
validators.isNonEmptyString('   ') // false
```

### `validators.isValidNumber`
Valida se o valor é um número válido (não NaN ou Infinity).

```typescript
validators.isValidNumber(123) // true
validators.isValidNumber(NaN) // false
validators.isValidNumber(Infinity) // false
```

## Validadores Customizados

```typescript
// Validador para Attendant
const isAttendant = (data: any): data is Attendant => {
  return data && 
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.email === 'string';
};

const attendantState = useSafeState({
  initialValue: null as Attendant | null,
  validator: isAttendant,
  fallback: null
});
```

## Padrões de Uso

### 1. Fetch de API com Tratamento Completo

```typescript
const useAttendants = () => {
  const state = useSafeState({
    initialValue: [] as Attendant[],
    validator: validators.isArray,
    fallback: []
  });

  const fetchAttendants = useCallback(async () => {
    state.setLoading(true);
    state.clearError();
    
    try {
      const response = await fetch('/api/attendants');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      state.setData(data); // Validação automática
    } catch (error) {
      console.error('Failed to fetch attendants:', error);
      state.setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      state.setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    fetchAttendants();
  }, [fetchAttendants]);

  return {
    ...state,
    refetch: fetchAttendants
  };
};
```

### 2. Componente com Estados Seguros

```typescript
interface AttendantTableProps {
  // Não precisa mais de validação manual
}

export default function AttendantTable() {
  const attendantsState = useSafeState({
    initialValue: [] as Attendant[],
    validator: validators.isArrayOfObjects(['id', 'name']),
    fallback: []
  });

  // Estados sempre seguros
  const sortedAttendants = useMemo(() => {
    return [...attendantsState.data].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [attendantsState.data]);

  if (attendantsState.loading) return <LoadingTable />;
  if (attendantsState.error) return <ErrorTable error={attendantsState.error} />;
  if (attendantsState.data.length === 0) return <EmptyTable />;

  return <TableContent attendants={sortedAttendants} />;
}
```

## Benefícios

1. **Prevenção de Erros**: Evita erros como "Cannot read properties of null" e "attendants is not iterable"
2. **Consistência**: Padrão uniforme para gerenciamento de estado em toda a aplicação
3. **Debugging**: Logs automáticos quando dados inválidos são detectados
4. **Performance**: Validação otimizada com memoização automática
5. **Manutenibilidade**: Código mais limpo e fácil de entender
6. **Robustez**: Fallbacks automáticos garantem que a aplicação não quebra

## Migração de useState

### Antes (problemático)
```typescript
const [attendants, setAttendants] = useState<Attendant[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Uso perigoso
const sortedAttendants = [...attendants].sort(); // Pode quebrar se attendants for null
```

### Depois (seguro)
```typescript
const attendantsState = useSafeState({
  initialValue: [] as Attendant[],
  validator: validators.isArray,
  fallback: []
});

// Uso sempre seguro
const sortedAttendants = [...attendantsState.data].sort(); // Nunca quebra
```