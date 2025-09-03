
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAttendantsData } from '@/hooks/useAttendantsData';
import type { Attendant, AttendantImport } from '@/lib/types';

interface AttendantsContextType {
    attendants: Attendant[];
    attendantImports: AttendantImport[];
    fetchAttendants: () => Promise<Attendant[]>;
    fetchAttendantImports: () => Promise<AttendantImport[]>;
    addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<Attendant>;
    updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
    deleteAttendants: (attendantIds: string[]) => Promise<void>;
    addAttendantImportRecord: (importData: Omit<AttendantImport, 'id'>, userId: string) => Promise<AttendantImport>;
    revertAttendantImport: (importId: string) => Promise<void>;
}

const AttendantsContext = createContext<AttendantsContextType | undefined>(undefined);

export const AttendantsProvider = ({ children }: { children: ReactNode }) => {
    const data = useAttendantsData();
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [attendantImports, setAttendantImports] = useState<AttendantImport[]>([]);

    const fetchAttendants = useCallback(async () => {
        const fetched = await data.fetchAttendants();
        setAttendants(fetched);
        return fetched;
    }, [data]);

    const fetchAttendantImports = useCallback(async () => {
        const fetched = await data.fetchAttendantImports();
        setAttendantImports(fetched);
        return fetched;
    }, [data]);

    const addAttendant = async (attendantData: Omit<Attendant, 'id'>) => {
        const newAttendant = await data.addAttendant(attendantData);
        setAttendants(prev => [...prev, newAttendant]);
        return newAttendant;
    };

    const updateAttendant = async (id: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
        await data.updateAttendant(id, attendantData);
        await fetchAttendants();
    };

    const deleteAttendants = async (ids: string[]) => {
        await data.deleteAttendants(ids);
        setAttendants(prev => prev.filter(att => !ids.includes(att.id)));
    };
    
    const addAttendantImportRecord = async (importData: Omit<AttendantImport, 'id'>, userId: string) => {
        const newRecord = await data.addAttendantImportRecord(importData, userId);
        setAttendantImports(prev => [...prev, newRecord]);
        return newRecord;
    };

    const revertAttendantImport = async (importId: string) => {
        await data.revertAttendantImport(importId);
        setAttendantImports(prev => prev.filter(imp => imp.id !== importId));
        await fetchAttendants();
    };


    return (
        <AttendantsContext.Provider value={{ 
            attendants, 
            fetchAttendants,
            addAttendant,
            updateAttendant,
            deleteAttendants,
            attendantImports,
            fetchAttendantImports,
            addAttendantImportRecord,
            revertAttendantImport,
        }}>
            {children}
        </AttendantsContext.Provider>
    );
};

export const useAttendants = () => {
    const context = useContext(AttendantsContext);
    if (context === undefined) {
        throw new Error('useAttendants must be used within an AttendantsProvider');
    }
    return context;
};
