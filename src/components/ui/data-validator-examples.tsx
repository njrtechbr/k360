import React from 'react';
import { DataValidator, LoadingTable, ErrorTable, EmptyTable } from '@/components/ui/data-validator';
import { useSafeState } from '@/hooks/useSafeState';
import { isValidAttendantArray, isValidImportStatus, DEFAULT_IMPORT_STATUS } from '@/lib/data-validation';
import type { Attendant, ImportStatus } from '@/lib/types';

/**
 * Exemplo 1: Uso básico com array de atendentes
 */
export function AttendantsTableExample() {
  const attendantsState = useSafeState({
    initialValue: [] as Attendant[],
    validator: isValidAttendantArray,
    fallback: []
  });

  const fetchAttendants = async () => {
    attendantsState.setLoading(true);
    try {
      const response = await fetch('/api/attendants');
      const data = await response.json();
      attendantsState.setData(data);
    } catch (error) {
      attendantsState.setError(error instanceof Error ? error.message : 'Erro ao carregar atendentes');
    } finally {
      attendantsState.setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Lista de Atendentes</h2>
      
      <DataValidator
        data={attendantsState.data}
        fallback={[]}
        loading={attendantsState.loading}
        error={attendantsState.error}
        validator={isValidAttendantArray}
        onRetry={fetchAttendants}
        emptyMessage="Nenhum atendente cadastrado no sistema"
      >
        {(attendants) => (
          <div className="border rounded-lg">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4">Nome</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Função</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendants.map((attendant) => (
                  <tr key={attendant.id} className="border-b">
                    <td className="p-4">{attendant.name}</td>
                    <td className="p-4">{attendant.email}</td>
                    <td className="p-4">{attendant.funcao}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        attendant.status === 'ativo' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {attendant.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataValidator>
    </div>
  );
}

/**
 * Exemplo 2: Uso com componentes customizados
 */
export function CustomComponentsExample() {
  const [data, setData] = React.useState<Attendant[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const customLoadingComponent = (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-sm text-gray-600">Carregando dados dos atendentes...</p>
    </div>
  );

  const customErrorComponent = (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center space-x-2">
        <div className="text-red-600">⚠️</div>
        <h3 className="text-lg font-medium text-red-800">Ops! Algo deu errado</h3>
      </div>
      <p className="text-red-700 mt-2">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Recarregar Página
      </button>
    </div>
  );

  const customEmptyComponent = (
    <div className="text-center p-12">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="text-xl font-medium text-gray-900 mb-2">
        Nenhum atendente encontrado
      </h3>
      <p className="text-gray-600 mb-6">
        Parece que ainda não há atendentes cadastrados no sistema.
      </p>
      <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Cadastrar Primeiro Atendente
      </button>
    </div>
  );

  return (
    <DataValidator
      data={data}
      fallback={[]}
      loading={loading}
      error={error}
      loadingComponent={customLoadingComponent}
      errorComponent={customErrorComponent}
      emptyComponent={customEmptyComponent}
    >
      {(attendants) => (
        <div>Renderizando {attendants.length} atendentes...</div>
      )}
    </DataValidator>
  );
}

/**
 * Exemplo 3: Uso com objeto único (ImportStatus)
 */
export function ImportStatusExample() {
  const importState = useSafeState({
    initialValue: DEFAULT_IMPORT_STATUS,
    validator: isValidImportStatus,
    fallback: DEFAULT_IMPORT_STATUS
  });

  return (
    <DataValidator
      data={importState.data}
      fallback={DEFAULT_IMPORT_STATUS}
      loading={importState.loading}
      error={importState.error}
      validator={isValidImportStatus}
      treatEmptyArrayAsEmpty={false} // Não tratar como vazio pois é objeto único
      onRetry={() => importState.reset()}
    >
      {(importStatus) => (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Status da Importação</h3>
          <div className="space-y-2">
            <div>Status: {importStatus.status}</div>
            <div>Progresso: {importStatus.progress}%</div>
            <div>Título: {importStatus.title}</div>
            <div>Aberto: {importStatus.isOpen ? 'Sim' : 'Não'}</div>
            {importStatus.logs.length > 0 && (
              <div>
                <h4 className="font-medium">Logs:</h4>
                <ul className="list-disc list-inside">
                  {importStatus.logs.map((log, index) => (
                    <li key={index} className="text-sm text-gray-600">{log}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </DataValidator>
  );
}

/**
 * Exemplo 4: Uso com validação inline
 */
export function InlineValidationExample() {
  const [users, setUsers] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  // Validador inline para usuários
  const isValidUserArray = (data: any): data is Array<{id: string, name: string, email: string}> => {
    return Array.isArray(data) && data.every(user => 
      user && 
      typeof user.id === 'string' &&
      typeof user.name === 'string' &&
      typeof user.email === 'string' &&
      user.email.includes('@')
    );
  };

  return (
    <DataValidator
      data={users}
      fallback={[]}
      loading={loading}
      validator={isValidUserArray}
      emptyMessage="Nenhum usuário encontrado"
    >
      {(validUsers) => (
        <div className="grid gap-4">
          {validUsers.map(user => (
            <div key={user.id} className="border rounded p-4">
              <h3 className="font-medium">{user.name}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          ))}
        </div>
      )}
    </DataValidator>
  );
}

/**
 * Exemplo 5: Uso com componentes de loading pré-definidos
 */
export function PreDefinedComponentsExample() {
  const [data, setData] = React.useState<Attendant[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-4">Loading Table</h3>
        <LoadingTable rows={3} columns={4} />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Error Table</h3>
        <ErrorTable 
          error="Falha na conexão com o banco de dados" 
          onRetry={() => console.log('Retry clicked')}
        />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Empty Table</h3>
        <EmptyTable 
          message="Nenhum registro encontrado na consulta"
          onRetry={() => console.log('Reload clicked')}
        />
      </div>
    </div>
  );
}

/**
 * Exemplo 6: Uso aninhado com múltiplos DataValidators
 */
export function NestedValidatorsExample() {
  const [attendants, setAttendants] = React.useState<Attendant[] | null>(null);
  const [evaluations, setEvaluations] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="space-y-6">
      <DataValidator
        data={attendants}
        fallback={[]}
        loading={loading}
        emptyMessage="Nenhum atendente para mostrar avaliações"
      >
        {(validAttendants) => (
          <div>
            <h2 className="text-xl font-bold mb-4">
              Avaliações dos Atendentes ({validAttendants.length})
            </h2>
            
            {validAttendants.map(attendant => (
              <div key={attendant.id} className="border rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">{attendant.name}</h3>
                
                <DataValidator
                  data={evaluations?.filter(eval => eval.attendantId === attendant.id)}
                  fallback={[]}
                  emptyMessage={`Nenhuma avaliação para ${attendant.name}`}
                  treatEmptyArrayAsEmpty={true}
                >
                  {(attendantEvaluations) => (
                    <div className="space-y-2">
                      {attendantEvaluations.map((evaluation, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded">
                          <div>Nota: {evaluation.nota}/5</div>
                          {evaluation.comentario && (
                            <div className="text-sm text-gray-600">
                              {evaluation.comentario}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </DataValidator>
              </div>
            ))}
          </div>
        )}
      </DataValidator>
    </div>
  );
}