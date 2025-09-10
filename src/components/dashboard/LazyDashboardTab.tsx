import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface LazyDashboardTabProps {
  tabName: string;
  children: React.ReactNode;
  onTabActive?: () => void;
  isActive: boolean;
}

export function LazyDashboardTab({ tabName, children, onTabActive, isActive }: LazyDashboardTabProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadTabData = useCallback(async () => {
    if (hasLoaded || !isActive) return;
    
    setIsLoading(true);
    try {
      // Simular delay para carregamento progressivo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (onTabActive) {
        await onTabActive();
      }
      
      setHasLoaded(true);
    } catch (error) {
      console.error(`Erro ao carregar dados da aba ${tabName}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isActive, onTabActive, tabName]);

  useEffect(() => {
    if (isActive) {
      loadTabData();
    }
  }, [isActive, loadTabData]);

  if (!isActive) {
    return null;
  }

  if (isLoading || !hasLoaded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando dados da {tabName}...</span>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <div className="space-y-6">{children}</div>;
}