
"use client";

import { usePerformance } from "@/providers/PerformanceProvider";
import { Database, GanttChart, Thermometer } from "lucide-react";

export default function PerformanceStatusBar() {
    const { performanceData } = usePerformance();
    
    if (!performanceData) return null;
    
    const { dataLoadingTime, renderTime, itemCount, collectionName } = performanceData;

    if (dataLoadingTime === null && renderTime === null) {
        return null;
    }

    const formatTime = (time: number | null) => {
        if (time === null) return '...';
        return time < 1 ? '<1ms' : `${time.toFixed(0)}ms`;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-lg animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-6">
                <h3 className="font-bold text-sm border-r pr-4">Status da Página</h3>
                <div className="flex items-center gap-2" title="Tempo de busca dos dados no Firestore">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                        <span className="font-semibold">{formatTime(dataLoadingTime)}</span>
                        <span className="text-muted-foreground"> (Dados)</span>
                    </div>
                </div>
                 <div className="flex items-center gap-2" title="Tempo de renderização do componente no navegador">
                    <GanttChart className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                        <span className="font-semibold">{formatTime(renderTime)}</span>
                        <span className="text-muted-foreground"> (Render)</span>
                    </div>
                </div>
                 {itemCount !== null && (
                     <div className="flex items-center gap-2" title={`Itens carregados da coleção "${collectionName}"`}>
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                            <span className="font-semibold">{itemCount}</span>
                            <span className="text-muted-foreground"> Itens</span>
                        </div>
                    </div>
                 )}
            </div>
        </div>
    );
}
