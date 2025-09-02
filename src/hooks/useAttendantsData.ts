
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Attendant, AttendantImport } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query, getCountFromServer } from 'firebase/firestore';
import { INITIAL_ATTENDANTS } from '@/lib/initial-data';


const ATTENDANT_IMPORTS_STORAGE_KEY = "controle_acesso_attendant_imports";

export function useAttendantsData(isAuthenticated: boolean) {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [loading, setLoading] = useState(true);
    const [attendantImports, setAttendantImports] = useState<AttendantImport[]>([]);
    const { toast } = useToast();

    const seedInitialData = useCallback(async () => {
        try {
            const attendantsCollection = collection(db, "attendants");
            const countSnapshot = await getCountFromServer(attendantsCollection);

            if (countSnapshot.data().count === 0) {
                console.log("Banco de dados de atendentes vazio. Semeando dados iniciais...");
                const batch = writeBatch(db);
                INITIAL_ATTENDANTS.forEach(attendant => {
                    const docRef = doc(db, "attendants", attendant.id);
                    batch.set(docRef, attendant);
                });
                await batch.commit();
                console.log(`${INITIAL_ATTENDANTS.length} atendentes foram semeados com sucesso.`);
                 toast({
                    title: "Migração Concluída!",
                    description: "Seus atendentes foram carregados no banco de dados na nuvem.",
                });
                // Return the seeded data directly to avoid another fetch
                return INITIAL_ATTENDANTS as Attendant[];
            }
            return null; // No data was seeded
        } catch (error) {
            console.error("Erro ao semear dados iniciais:", error);
            toast({
                variant: "destructive",
                title: "Erro na Migração",
                description: "Não foi possível popular o banco de dados com os dados iniciais."
            });
            return null;
        }
    }, [toast]);


    const fetchAttendants = useCallback(async () => {
        if (!isAuthenticated) {
            setAttendants([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const seededData = await seedInitialData();

            if (seededData) {
                setAttendants(seededData);
            } else {
                const attendantsCollection = collection(db, "attendants");
                const attendantsSnapshot = await getDocs(attendantsCollection);
                const attendantsList = attendantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendant));
                setAttendants(attendantsList);
            }

        } catch (error) {
            console.error("Error fetching attendants from Firestore: ", error);
            toast({ variant: "destructive", title: "Erro ao carregar atendentes", description: "Não foi possível buscar os dados do Firestore." });
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, toast, seedInitialData]);


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
        if (isAuthenticated) {
            fetchAttendants();
        } else {
            setLoading(false);
        }
        setAttendantImports(getAttendantImportsFromStorage());
    }, [isAuthenticated, fetchAttendants, getAttendantImportsFromStorage]);


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
