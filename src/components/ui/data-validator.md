# DataValidator Component

O `DataValidator` é um componente genérico que fornece validação robusta de dados e renderização condicional baseada no estado dos dados (loading, error, empty, valid).

## Características

- **Validação automática**: Verifica se os dados são válidos antes de renderizar
- **Estados múltiplos**: Suporta loading, error, empty e valid states
- **Fallbacks seguros**: Usa valores de fallback quando dados são inválidos
- **Componentes customizáveis**: Permite customizar componentes de loading, error e empty
- **TypeScript**: Totalmente tipado com generics para type safety
- **Retry automático**: Suporte a função de retry para recarregar dados

## Uso Básico

```tsx
import { DataValidator } from "@/components/ui/data-validator";

function AttendantsPage() {
  const { attendants, loading, error, refetch } = useAttendants();

  return (
    <DataValidator
      data={attendants}
      fallback={[]}
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="Nenhum atendente cadastrado"
    >
      {(validAttendants) => (
        <AttendantTable attendants={validAttendants} />
      )}
    </DataValidator>
  );
}
```

## Props

### Obrigatórias

- `data: T | null | undefined` - Dados a serem validados
- `fallback: T` - Valor de fallback usado quando dados são inválidos
- `children: (validData: T) => React.ReactNode` - Função que renderiza o conteúdo quando dados são válidos

### Opcionais

- `loading?: boolean` - Estado de carregamento (padrão: false)
- `error?: string | null` - Mensagem de erro (padrão: null)
- `validator?: (data: any) => data is T` - Função de validação customizada
- `loadingComponent?: React.ReactNode` - Componente de loading customizado
- `errorComponent?: React.ReactNode` - Componente de erro customizado
- `emptyComponent?: React.ReactNode` - Componente para dados vazios
- `onRetry?: () => void` - Função chamada quando usuário clica em retry
- `className?: string` - Classe CSS adicional
- `enableWarnings?: boolean` - Se deve mostrar avisos no console (padrão: true)
- `emptyMessage?: string` - Mensagem customizada para dados vazios
- `treatEmptyArrayAsEmpty?: boolean` - Se deve tratar arrays vazios como estado vazio (padrão: true)

## Exemplos de Uso

### Com Validação Customizada

```tsx
import { isValidAttendantArray } from "@/lib/data-validation";

<DataValidator
  data={attendants}
  fallback={[]}
  validator={isValidAttendantArray}
  loading={loading}
  error={error}
>
  {(validAttendants) => (
    <AttendantTable attendants={validAttendants} />
  )}
</DataValidator>
```

### Com Componentes Customizados

```tsx
<DataValidator
  data={evaluations}
  fallback={[]}
  loading={loading}
  error={error}
  loadingComponent={<CustomLoadingSpinner />}
  errorComponent={<CustomErrorMessage />}
  emptyComponent={<CustomEmptyState />}
>
  {(validEvaluations) => (
    <EvaluationList evaluations={validEvaluations} />
  )}
</DataValidator>
```

### Para Objetos Únicos

```tsx
<DataValidator
  data={importStatus}
  fallback={DEFAULT_IMPORT_STATUS}
  loading={loading}
  error={error}
  validator={isValidImportStatus}
  treatEmptyArrayAsEmpty={false}
>
  {(validStatus) => (
    <ImportProgressModal status={validStatus} />
  )}
</DataValidator>
```

### Com useSafeState

```tsx
function MyComponent() {
  const attendantsState = useSafeState({
    initialValue: [] as Attendant[],
    validator: isValidAttendantArray,
    fallback: []
  });

  return (
    <DataValidator
      data={attendantsState.data}
      fallback={[]}
      loading={attendantsState.loading}
      error={attendantsState.error}
      onRetry={() => fetchAttendants()}
    >
      {(attendants) => (
        <AttendantTable attendants={attendants} />
      )}
    </DataValidator>
  );
}
```

## Componentes Auxiliares

### LoadingTable

Componente de loading padrão para tabelas:

```tsx
import { LoadingTable } from "@/components/ui/data-validator";

<LoadingTable rows={10} columns={5} />
```

### LoadingCard

Componente de loading padrão para cards:

```tsx
import { LoadingCard } from "@/components/ui/data-validator";

<LoadingCard />
```

### ErrorTable

Componente de erro padrão para tabelas:

```tsx
import { ErrorTable } from "@/components/ui/data-validator";

<ErrorTable 
  error="Falha ao carregar dados" 
  onRetry={() => refetch()} 
/>
```

### EmptyTable

Componente de estado vazio padrão para tabelas:

```tsx
import { EmptyTable } from "@/components/ui/data-validator";

<EmptyTable 
  message="Nenhum atendente encontrado"
  onRetry={() => refetch()} 
/>
```

## Estados do Componente

### 1. Loading State
- Exibido quando `loading={true}`
- Mostra skeleton loading por padrão
- Pode ser customizado com `loadingComponent`

### 2. Error State
- Exibido quando `error` não é null
- Mostra alert de erro com botão de retry
- Pode ser customizado com `errorComponent`

### 3. Empty State
- Exibido quando dados são array vazio (se `treatEmptyArrayAsEmpty={true}`)
- Mostra mensagem de dados não encontrados
- Pode ser customizado com `emptyComponent`

### 4. Valid State
- Exibido quando dados passam na validação
- Renderiza o conteúdo através da função `children`

## Integração com Validadores

O DataValidator funciona perfeitamente com os validadores da biblioteca de validação:

```tsx
import { 
  isValidAttendantArray,
  isValidImportStatus,
  validateAttendantArray 
} from "@/lib/data-validation";

// Validação simples
<DataValidator
  data={attendants}
  fallback={[]}
  validator={isValidAttendantArray}
>
  {(attendants) => <AttendantTable attendants={attendants} />}
</DataValidator>

// Validação com resultado detalhado
function MyComponent() {
  const validationResult = validateAttendantArray(rawData);
  
  return (
    <DataValidator
      data={validationResult.data}
      fallback={[]}
      error={validationResult.errors.length > 0 ? validationResult.errors.join(', ') : null}
    >
      {(attendants) => <AttendantTable attendants={attendants} />}
    </DataValidator>
  );
}
```

## Boas Práticas

1. **Sempre forneça fallback apropriado**: Use arrays vazios para listas, objetos padrão para entidades
2. **Use validadores específicos**: Prefira validadores tipados da biblioteca de validação
3. **Implemente retry**: Sempre forneça função `onRetry` para melhor UX
4. **Customize mensagens**: Use `emptyMessage` específicas para cada contexto
5. **Desabilite warnings em produção**: Use `enableWarnings={false}` em produção se necessário

## Troubleshooting

### Dados não aparecem
- Verifique se `validator` está retornando true para dados válidos
- Confirme que `fallback` tem o tipo correto
- Verifique console para warnings de validação

### Loading infinito
- Confirme que `loading` está sendo definido como false após fetch
- Verifique se não há loop infinito no useEffect que busca dados

### Erro não aparece
- Confirme que `error` está sendo definido corretamente
- Verifique se string de erro não está vazia

### Performance
- Use `React.memo` no componente pai se necessário
- Considere `useMemo` para validadores custosos
- Evite criar novas funções em cada render para `onRetry`