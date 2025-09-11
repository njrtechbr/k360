/**
 * Exemplos práticos de uso do useSafeState
 * Estes exemplos mostram como migrar código existente para usar o hook seguro
 */

import { useCallback, useEffect, useMemo } from "react";
import { useSafeState, validators } from "@/hooks/useSafeState";
import type { Attendant, Evaluation, GamificationConfig } from "@/lib/types";

// Tipo para ImportStatus (não existe no types.ts, vamos definir aqui)
interface ImportStatus {
  isOpen: boolean;
  status: "idle" | "processing" | "completed" | "error";
  progress: number;
  logs: string[];
  currentFile: string | null;
  totalFiles: number;
  processedFiles: number;
}

// ============================================================================
// EXEMPLO 1: Hook para Atendentes (substitui useState problemático)
// ============================================================================

export const useAttendants = () => {
  const attendantsState = useSafeState({
    initialValue: [] as Attendant[],
    validator: validators.isArrayOfObjects(["id", "name", "email"]),
    fallback: [],
    enableWarnings: true,
  });

  const fetchAttendants = useCallback(async () => {
    attendantsState.setLoading(true);
    attendantsState.clearError();

    try {
      const response = await fetch("/api/attendants");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      attendantsState.setData(data); // Validação automática
    } catch (error) {
      console.error("Failed to fetch attendants:", error);
      attendantsState.setError(
        error instanceof Error ? error.message : "Erro ao carregar atendentes",
      );
    } finally {
      attendantsState.setLoading(false);
    }
  }, [attendantsState]);

  useEffect(() => {
    fetchAttendants();
  }, [fetchAttendants]);

  return {
    attendants: attendantsState.data,
    loading: attendantsState.loading,
    error: attendantsState.error,
    refetch: fetchAttendants,
    reset: attendantsState.reset,
  };
};

// ============================================================================
// EXEMPLO 2: Hook para Status de Importação
// ============================================================================

const INITIAL_IMPORT_STATUS: ImportStatus = {
  isOpen: false,
  status: "idle",
  progress: 0,
  logs: [],
  currentFile: null,
  totalFiles: 0,
  processedFiles: 0,
};

export const useImportStatus = () => {
  const importState = useSafeState({
    initialValue: INITIAL_IMPORT_STATUS,
    validator: validators.isObjectWithProps([
      "isOpen",
      "status",
      "progress",
      "logs",
    ]),
    fallback: INITIAL_IMPORT_STATUS,
    enableWarnings: true,
  });

  const updateImportStatus = useCallback(
    (updates: Partial<ImportStatus>) => {
      const currentData = importState.data;
      const newData = { ...currentData, ...updates };
      importState.setData(newData);
    },
    [importState],
  );

  const startImport = useCallback(() => {
    updateImportStatus({
      isOpen: true,
      status: "processing",
      progress: 0,
      logs: ["Iniciando importação..."],
    });
  }, [updateImportStatus]);

  const finishImport = useCallback(
    (success: boolean) => {
      updateImportStatus({
        status: success ? "completed" : "error",
        progress: 100,
        logs: [
          ...importState.data.logs,
          success ? "Importação concluída!" : "Erro na importação",
        ],
      });
    },
    [updateImportStatus, importState.data.logs],
  );

  return {
    importStatus: importState.data,
    loading: importState.loading,
    error: importState.error,
    updateImportStatus,
    startImport,
    finishImport,
    reset: importState.reset,
  };
};

// ============================================================================
// EXEMPLO 3: Hook para Configuração de Gamificação
// ============================================================================

export const useGamificationConfig = () => {
  const configState = useSafeState({
    initialValue: null as GamificationConfig | null,
    validator: (data): data is GamificationConfig | null => {
      if (data === null) return true;
      return (
        data &&
        typeof data === "object" &&
        typeof data.xpPerEvaluation === "number" &&
        typeof data.levelMultiplier === "number"
      );
    },
    fallback: null,
    enableWarnings: true,
  });

  const fetchConfig = useCallback(async () => {
    configState.setLoading(true);

    try {
      const response = await fetch("/api/gamification/config");
      if (response.ok) {
        const data = await response.json();
        configState.setData(data);
      } else {
        // Não é erro crítico se não há configuração
        configState.setData(null);
      }
    } catch (error) {
      console.error("Failed to fetch gamification config:", error);
      configState.setError("Erro ao carregar configuração de gamificação");
    } finally {
      configState.setLoading(false);
    }
  }, [configState]);

  return {
    config: configState.data,
    loading: configState.loading,
    error: configState.error,
    fetchConfig,
    hasConfig: configState.data !== null,
  };
};

// ============================================================================
// EXEMPLO 4: Componente AttendantTable Refatorado
// ============================================================================

interface AttendantTableProps {
  onEdit?: (attendant: Attendant) => void;
  onDelete?: (attendant: Attendant) => void;
  onQrCode?: (attendant: Attendant) => void;
  onCopyLink?: (attendant: Attendant) => void;
}

export const AttendantTableExample = ({
  onEdit = () => {},
  onDelete = () => {},
  onQrCode = () => {},
  onCopyLink = () => {},
}: AttendantTableProps) => {
  const { attendants, loading, error, refetch } = useAttendants();

  // Ordenação segura - nunca quebra mesmo se attendants for null/undefined
  const sortedAttendants = useMemo(() => {
    return [...attendants].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [attendants]);

  // Estados de loading e error são gerenciados automaticamente
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (sortedAttendants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Nenhum atendente cadastrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nome
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedAttendants.map((attendant) => (
            <tr key={attendant.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {attendant.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {attendant.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onEdit(attendant)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => onQrCode(attendant)}
                  className="text-green-600 hover:text-green-900"
                >
                  QR Code
                </button>
                <button
                  onClick={() => onCopyLink(attendant)}
                  className="text-purple-600 hover:text-purple-900"
                >
                  Copiar Link
                </button>
                <button
                  onClick={() => onDelete(attendant)}
                  className="text-red-600 hover:text-red-900"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// EXEMPLO 5: Hook Composto para Múltiplos Estados
// ============================================================================

export const useDashboardData = () => {
  const attendantsState = useSafeState({
    initialValue: [] as Attendant[],
    validator: validators.isArray,
    fallback: [],
  });

  const evaluationsState = useSafeState({
    initialValue: [] as Evaluation[],
    validator: validators.isArray,
    fallback: [],
  });

  const importState = useSafeState({
    initialValue: INITIAL_IMPORT_STATUS,
    validator: validators.isObjectWithProps(["isOpen", "status"]),
    fallback: INITIAL_IMPORT_STATUS,
  });

  const fetchAllData = useCallback(async () => {
    // Definir loading para todos os estados
    attendantsState.setLoading(true);
    evaluationsState.setLoading(true);

    try {
      const [attendantsRes, evaluationsRes] = await Promise.all([
        fetch("/api/attendants"),
        fetch("/api/evaluations"),
      ]);

      if (attendantsRes.ok) {
        const attendantsData = await attendantsRes.json();
        attendantsState.setData(attendantsData);
      } else {
        attendantsState.setError("Erro ao carregar atendentes");
      }

      if (evaluationsRes.ok) {
        const evaluationsData = await evaluationsRes.json();
        evaluationsState.setData(evaluationsData);
      } else {
        evaluationsState.setError("Erro ao carregar avaliações");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro de conectividade";
      attendantsState.setError(errorMessage);
      evaluationsState.setError(errorMessage);
    } finally {
      attendantsState.setLoading(false);
      evaluationsState.setLoading(false);
    }
  }, [attendantsState, evaluationsState]);

  // Indicadores globais
  const isAnyLoading = attendantsState.loading || evaluationsState.loading;
  const hasAnyError = Boolean(attendantsState.error || evaluationsState.error);

  return {
    // Estados individuais
    attendants: attendantsState.data,
    attendantsLoading: attendantsState.loading,
    attendantsError: attendantsState.error,

    evaluations: evaluationsState.data,
    evaluationsLoading: evaluationsState.loading,
    evaluationsError: evaluationsState.error,

    importStatus: importState.data,

    // Indicadores globais
    isAnyLoading,
    hasAnyError,

    // Ações
    fetchAllData,
    refreshAttendants: () => attendantsState.setData([]),
    updateImportStatus: importState.setData,
  };
};
