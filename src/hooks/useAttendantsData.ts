
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Attendant, AttendantImport } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';

export function useAttendantsData() {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const { toast } = useToast();

    const fetchAttendants = useCallback(async () => {
        console.log("ATTENDANTS: Buscando atendentes do Firestore...");
        try {
            const attendantsCollection = collection(db, "attendants");
            const attendantsSnapshot = await getDocs(attendantsCollection);
            const attendantsList = attendantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendant));
            setAttendants(attendantsList);
            console.log(`ATTENDANTS: ${attendantsList.length} atendentes carregados.`);
            return attendantsList;
        } catch (error) {
            console.error("Error fetching attendants from Firestore: ", error);
            toast({ variant: "destructive", title: "Erro ao carregar atendentes", description: "Não foi possível buscar os dados do Firestore." });
            return [];
        }
    }, [toast]);


     const fetchAttendantImports = useCallback(async (): Promise<AttendantImport[]> => {
        console.log("ATTENDANTS: Buscando histórico de importações do Firestore...");
        try {
            const snapshot = await getDocs(collection(db, "attendantImports"));
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendantImport));
            console.log(`ATTENDANTS: ${list.length} históricos de importação carregados.`);
            return list;
        } catch (error) {
            console.error("ATTENDANTS: Erro ao buscar históricos de importação:", error);
            return [];
        }
    }, []);

    const addAttendant = async (attendantData: Omit<Attendant, 'id'>): Promise<Attendant> => {
        try {
            const newId = attendantData.id || doc(collection(db, "attendants")).id;
            const finalAttendantData = { ...attendantData, id: newId };
            const attendantDocRef = doc(db, "attendants", newId);
            await setDoc(attendantDocRef, finalAttendantData);
            await fetchAttendants(); // Refresh the list
            return finalAttendantData;
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

    const addAttendantImportRecord = async (importData: Omit<AttendantImport, 'id'>, userId: string): Promise<AttendantImport> => {
         try {
            const docRef = doc(collection(db, "attendantImports"));
            const newImport = { ...importData, id: docRef.id, importedBy: userId };
            await setDoc(docRef, newImport);
            return newImport;
        } catch (error) {
            console.error("ATTENDANTS: Erro ao salvar histórico de importação:", error);
            throw error;
        }
    };

    const revertAttendantImport = async (importId: string) => {
        const importToRevertDoc = await getDoc(doc(db, "attendantImports", importId));
        if (!importToRevertDoc.exists()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Importação não encontrada.' });
            return;
        }
        const importToRevert = importToRevertDoc.data() as AttendantImport;
        await deleteAttendants(importToRevert.attendantIds);
        await deleteDoc(doc(db, "attendantImports", importId));
        
        toast({
            title: "Importação de Atendentes Revertida!",
            description: "Os atendentes da importação selecionada foram removidos.",
        });
    };
    
    return { 
        attendants, 
        fetchAttendants, 
        addAttendant, 
        updateAttendant, 
        deleteAttendants, 
        addAttendantImportRecord, 
        revertAttendantImport,
        fetchAttendantImports,
    };
}
