
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Attendant, AttendantImport } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query } from 'firebase/firestore';


const ATTENDANT_IMPORTS_STORAGE_KEY = "controle_acesso_attendant_imports";

export function useAttendantsData(isAuthenticated: boolean) {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [loading, setLoading] = useState(true);
    const [attendantImports, setAttendantImports] = useState<AttendantImport[]>([]);
    const { toast } = useToast();

    const fetchAttendants = useCallback(async () => {
        if (!isAuthenticated) {
            setAttendants([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const attendantsCollection = collection(db, "attendants");
            const attendantsSnapshot = await getDocs(attendantsCollection);
            const attendantsList = attendantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendant));
            setAttendants(attendantsList);
        } catch (error) {
            console.error("Error fetching attendants from Firestore: ", error);
            toast({ variant: "destructive", title: "Erro ao carregar atendentes", description: "Não foi possível buscar os dados do Firestore." });
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, toast]);


     const getAttendantImportsFromStorage = useCallback((): AttendantImport[] => {
        if (typeof window === "undefined") return [];
        try {
            const importsJson = localStorage.getItem(ATTENDANT_IMPORTS_STORAGE_KEY);
            return importsJson ? JSON.parse(importsJson) : [];
        } catch (error) {
            console.error("Failed to parse attendant imports from localStorage", error);
            return [];
        }
    }, []);


    useEffect(() => {
        fetchAttendants();
        setAttendantImports(getAttendantImportsFromStorage());
    }, [fetchAttendants, getAttendantImportsFromStorage]);


     const saveAttendantImportsToStorage = (importsToSave: AttendantImport[]) => {
        localStorage.setItem(ATTENDANT_IMPORTS_STORAGE_KEY, JSON.stringify(importsToSave));
        setAttendantImports(importsToSave);
    }

    const addAttendant = async (attendantData: Attendant): Promise<Attendant> => {
        try {
            const attendantDocRef = doc(db, "attendants", attendantData.id);
            await setDoc(attendantDocRef, attendantData);
            await fetchAttendants(); // Refresh the list
            return attendantData;
        } catch(error) {
            console.error("Error adding attendant: ", error);
            toast({ variant: "destructive", title: "Erro ao adicionar atendente" });
            throw error;
        }
    };

    const updateAttendant = async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
         try {
            const attendantDocRef = doc(db, "attendants", attendantId);
            await updateDoc(attendantDocRef, attendantData);
            await fetchAttendants(); // Refresh the list
            toast({
                title: "Atendente Atualizado!",
                description: "Os dados do atendente foram atualizados."
            });
        } catch (error) {
             console.error("Error updating attendant: ", error);
            toast({ variant: "destructive", title: "Erro ao atualizar atendente" });
            throw error;
        }
    };

    const deleteAttendants = async (attendantIds: string[]) => {
        if(attendantIds.length === 0) return;
        try {
            const batch = writeBatch(db);
            attendantIds.forEach(id => {
                const docRef = doc(db, "attendants", id);
                batch.delete(docRef);
            });
            await batch.commit();
            await fetchAttendants(); // Refresh the list
            toast({
                title: "Atendentes Removidos!",
                description: `${attendantIds.length} atendente(s) foram removidos.`
            });
        } catch (error) {
            console.error("Error deleting attendants: ", error);
            toast({ variant: "destructive", title: "Erro ao remover atendentes" });
            throw error;
        }
    };

    const addAttendantImportRecord = (importData: Omit<AttendantImport, 'id' | 'importedAt'>, userId: string): AttendantImport => {
        const newImport: AttendantImport = {
            ...importData,
            id: crypto.randomUUID(),
            importedAt: new Date().toISOString(),
            importedBy: userId,
        };
        const allImports = getAttendantImportsFromStorage();
        saveAttendantImportsToStorage([...allImports, newImport]);
        return newImport;
    };

    const revertAttendantImport = async (importId: string) => {
        const importToRevert = getAttendantImportsFromStorage().find(i => i.id === importId);
        if (!importToRevert) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Importação não encontrada.' });
            return;
        }

        await deleteAttendants(importToRevert.attendantIds);
        
        const currentImports = getAttendantImportsFromStorage();
        const importsToKeep = currentImports.filter(imp => imp.id !== importId);
        saveAttendantImportsToStorage(importsToKeep);
        
        toast({
            title: "Importação de Atendentes Revertida!",
            description: "Os atendentes da importação selecionada foram removidos.",
        });
    };
    
    return { loadingAttendants: loading, attendants, addAttendant, updateAttendant, deleteAttendants, attendantImports, addAttendantImportRecord, revertAttendantImport, fetchAttendants };
}
