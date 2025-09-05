import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { User, Module, Attendant } from '@/lib/types';

interface AuthData {
  modules: Module[] | null;
  attendants: Attendant[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuthData(): AuthData {
  const { data: session, status } = useSession();
  const [modules, setModules] = useState<Module[] | null>(null);
  const [attendants, setAttendants] = useState<Attendant[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [modulesResponse, attendantsResponse] = await Promise.all([
        fetch('/api/modules'),
        fetch('/api/attendants')
      ]);

      if (!modulesResponse.ok || !attendantsResponse.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const [modulesData, attendantsData] = await Promise.all([
        modulesResponse.json(),
        attendantsResponse.json()
      ]);

      setModules(modulesData);
      setAttendants(attendantsData);
    } catch (err) {
      console.error('Erro ao carregar dados de autenticação:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    modules,
    attendants,
    isLoading,
    error,
    refetch: fetchData
  };
}