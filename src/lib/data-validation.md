# Utilitários de Validação de Dados

Este documento descreve como usar os utilitários de validação de dados implementados para prevenir erros de runtime causados por dados null, undefined ou com tipos incorretos.

## Visão Geral

O arquivo `data-validation.ts` fornece um conjunto abrangente de funções para validação segura de dados, especialmente focado em prevenir os erros identificados no sistema:

- **attendants is not iterable**
- **Cannot read properties of null**
- **importStatus undefined**
- **attendants.map em null**

## Principais Funcionalidades

### 1. Validadores de Tipos Básicos

```typescript
import { 
  isValidArray, 
  isNonEmptyArray, 
  isValidObject, 
  isNonEmptyString,
  isValidNumber,
  isValidUUID 
} from '@/lib/data-validation';

// Verificar se é array válido
if (isValidArray(attendants)) {
  // Seguro usar métodos de array
  const sorted = attendants.sort(...);
}

// Verificar se array não está vazio
if (isNonEmptyArray(attendants)) {
  const first = attendants[0]; // Garantido que existe
}
```

### 2. Validadores de Entidades Específicas

```typescript
import { 
  isValidAttendant,
  isValidAttendantArray,
  isValidEvaluation,
  isValidImportStatus 
} from '@/lib/data-validation';

// Validar attendant individual
if (isValidAttendant(data)) {
  // data é garantidamente um Attendant válido
  console.log(data.name); // Seguro
}

// Validar array de attendants
if (isValidAttendantArray(attendants)) {
  // Todos os itens são Attendants válidos
  attendants.forEach(attendant => {
    console.log(attendant.email); // Seguro
  });
}
```

### 3. Funções de Validação com Fallback

```typescript
import { 
  validateAttendantArray,
  validateImportStatus,
  DEFAULT_IMPORT_STATUS 
} from '@/lib/data-validation';

// Validar array com fallback automático
const result = validateAttendantArray(apiData);
if (result.isValid) {
  // Usar result.data (array válido)
  const sorted = result.data.sort(...);
} else {
  // Tratar erros: result.errors
  console.warn('Dados inválidos:', result.errors);
  // result.data ainda é um array vazio seguro
}

// Validar ImportStatus com fallback
const statusResult = validateImportStatus(importData);
const safeStatus = statusResult.data; // Sempre um ImportStatus válido
```

### 4. Helper Functions para Operações Seguras

```typescript
import { 
  safeArrayOperation,
  safeFindInArray,
  safeMapArray,
  safeFilterArray,
  safeReduceArray,
  safeObjectProperty 
} from '@/lib/data-validation';

// Substituir operações diretas por versões seguras

// ❌ Problemático
const sorted = [...attendants].sort(...); // Erro se attendants é null

// ✅ Seguro
const sorted = safeArrayOperation(
  attendants,
  (arr) => [...arr].sort(...),
  [] // fallback
);

// ❌ Problemático  
const found = attendants.find(a => a.id === id); // Erro se attendants é null

// ✅ Seguro
const found = safeFindInArray(
  attendants,
  (a) => a.id === id,
  isValidAttendant // validator opcional
);

// ❌ Problemático
const names = attendants.map(a => a.name); // Erro se attendants é null

// ✅ Seguro
const names = safeMapArray(
  attendants,
  (a) => a.name,
  isValidAttendant // validator opcional
);
```

## Padrões de Uso Recomendados

### 1. Em Componentes React

```typescript
import { validateAttendantArray, isDataReady } from '@/lib/data-validation';

function AttendantTable({ attendants, loading, error }) {
  // Validar dados recebidos
  const validation = validateAttendantArray(attendants);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  if (!validation.isValid) {
    console.warn('Dados de attendants inválidos:', validation.errors);
  }
  
  // Usar validation.data que é sempre um array seguro
  const safeAttendants = validation.data;
  
  return (
    <table>
      {safeAttendants.map(attendant => (
        <tr key={attendant.id}>
          <td>{attendant.name}</td>
        </tr>
      ))}
    </table>
  );
}
```

### 2. Em Providers/Context

```typescript
import { 
  createSafeDataState, 
  updateSafeDataState,
  validateAttendantArray,
  DEFAULT_IMPORT_STATUS 
} from '@/lib/data-validation';

function PrismaProvider({ children }) {
  // Estados seguros
  const [attendantsState, setAttendantsState] = useState(
    createSafeDataState([])
  );
  
  const [importStatusState, setImportStatusState] = useState(
    createSafeDataState(DEFAULT_IMPORT_STATUS)
  );
  
  const fetchAttendants = async () => {
    setAttendantsState(prev => updateSafeDataState(prev, { loading: true }));
    
    try {
      const response = await fetch('/api/attendants');
      const data = await response.json();
      
      // Validar dados recebidos
      const validation = validateAttendantArray(data);
      
      setAttendantsState(prev => updateSafeDataState(prev, {
        data: validation.data, // Sempre array seguro
        loading: false,
        error: validation.isValid ? null : validation.errors.join(', ')
      }));
      
    } catch (error) {
      setAttendantsState(prev => updateSafeDataState(prev, {
        loading: false,
        error: error.message
      }));
    }
  };
}
```

### 3. Em Páginas

```typescript
import { safeMapArray, isValidAttendant } from '@/lib/data-validation';

function AtendentesPage() {
  const { attendants } = useAuth();
  
  // Operações seguras
  const attendantNames = safeMapArray(
    attendants,
    (attendant) => attendant.name,
    isValidAttendant
  );
  
  const activeAttendants = safeFilterArray(
    attendants,
    (attendant) => attendant.status === 'Ativo',
    isValidAttendant
  );
  
  return (
    <div>
      <h1>Total: {safeArrayLength(attendants)} atendentes</h1>
      <AttendantTable attendants={activeAttendants} />
    </div>
  );
}
```

## Estados de Dados Seguros

### SafeDataState

```typescript
interface SafeDataState<T> {
  data: T;           // Dados sempre válidos
  loading: boolean;  // Estado de carregamento
  error: string | null; // Erro se houver
  lastFetch?: Date;  // Última atualização
}

// Utilitários
const state = createSafeDataState([]);
const updated = updateSafeDataState(state, { loading: true });

// Verificações
if (isDataLoading(state)) { /* mostrar loading */ }
if (hasDataError(state)) { /* mostrar erro */ }
if (isDataReady(state)) { /* dados prontos */ }
```

## Constantes de Fallback

```typescript
import { 
  DEFAULT_IMPORT_STATUS,
  EMPTY_ATTENDANT_ARRAY,
  EMPTY_EVALUATION_ARRAY 
} from '@/lib/data-validation';

// Usar como valores padrão seguros
const [importStatus, setImportStatus] = useState(DEFAULT_IMPORT_STATUS);
const [attendants, setAttendants] = useState(EMPTY_ATTENDANT_ARRAY);
```

## Migração de Código Existente

### Antes (Problemático)

```typescript
// ❌ Pode quebrar se attendants é null
const sortedAttendants = [...attendants].sort((a, b) => 
  a.name.localeCompare(b.name)
);

// ❌ Pode quebrar se attendants é null  
const found = attendants.find(a => a.id === selectedId);

// ❌ Pode quebrar se importStatus é undefined
const progress = importStatus.progress;
```

### Depois (Seguro)

```typescript
// ✅ Sempre funciona
const sortedAttendants = safeArrayOperation(
  attendants,
  (arr) => [...arr].sort((a, b) => a.name.localeCompare(b.name)),
  [],
  isValidAttendant
);

// ✅ Sempre funciona
const found = safeFindInArray(
  attendants,
  (a) => a.id === selectedId,
  isValidAttendant
);

// ✅ Sempre funciona
const validation = validateImportStatus(importStatus);
const progress = validation.data.progress; // Sempre um número válido
```

## Logging e Debugging

As funções incluem logging automático para ajudar no debugging:

```typescript
// Logs automáticos quando dados são inválidos
safeArrayOperation(null, (arr) => arr.length, 0);
// Console: "safeArrayOperation: dados não são um array válido null"

safeObjectProperty({}, 'missing', 'default');  
// Console: "safeObjectProperty: propriedade 'missing' é null/undefined"
```

## Testes

Todos os utilitários têm testes unitários abrangentes em `src/__tests__/data-validation.test.ts`. Execute com:

```bash
npm test -- --testPathPattern=data-validation.test.ts
```

## Benefícios

1. **Prevenção de Erros**: Elimina erros de runtime por dados null/undefined
2. **Fallbacks Automáticos**: Sempre retorna dados válidos ou fallbacks seguros  
3. **Type Safety**: Mantém tipagem TypeScript correta
4. **Debugging**: Logs automáticos para identificar problemas
5. **Performance**: Validações otimizadas e memoizáveis
6. **Manutenibilidade**: Código mais robusto e fácil de manter

## Próximos Passos

1. Migrar componentes existentes para usar os utilitários
2. Atualizar PrismaProvider com estados seguros
3. Implementar validação em todas as páginas problemáticas
4. Adicionar mais validadores conforme necessário