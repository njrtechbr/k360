
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type PerformanceData = {
    dataLoadingTime: number | null;
    renderTime: number | null;
    itemCount: number | null;
    collectionName: string;
} | null;

interface PerformanceContextType {
    performanceData: PerformanceData;
    setPerformanceData: React.Dispatch<React.SetStateAction<PerformanceData>>;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const PerformanceProvider = ({ children }: { children: ReactNode }) => {
    const [performanceData, setPerformanceData] = useState<PerformanceData>(null);

    return (
        <PerformanceContext.Provider value={{ performanceData, setPerformanceData }}>
            {children}
        </PerformanceContext.Provider>
    );
};

export const usePerformance = () => {
    const context = useContext(PerformanceContext);
    if (context === undefined) {
        throw new Error('usePerformance must be used within a PerformanceProvider');
    }
    return context;
};
