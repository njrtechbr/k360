
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Attendant } from '@/lib/types';
import { ATTENDANT_STATUS } from '@/lib/types';

const ATTENDANTS_STORAGE_KEY = "controle_acesso_attendants";
const EVALUATIONS_STORAGE_KEY = "controle_acesso_evaluations";

const parseDate = (dateString: string | null) => {
    if (!dateString || dateString.toLowerCase() === 'não informado' || dateString.split('/').length !== 3) {
      return new Date(0).toISOString();
    }
    const parts = dateString.split('/');
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).toISOString();
};


const INITIAL_ATTENDANTS: Attendant[] = [
  {
    id: "65a585d7-adce-4da7-837e-74c25516c7ad",
    name: "Ana Flávia de Souza",
    email: "anaflaviadesouza@outlook.com",
    funcao: "Escrevente II",
    setor: "escritura",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998050854",
    portaria: "116º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("23/02/2023"),
    dataNascimento: parseDate("12/10/2002"),
    rg: "2235185304 SSP/BA",
    cpf: "08727591565",
  },
  {
    id: "c1a09a74-7662-4fc5-be5f-c0c7288ad03b",
    name: "Ana Nery Conceição dos Santos",
    email: "ananeryconceicao030@gmail.com",
    funcao: "Auxiliar de cartório",
    setor: "protesto",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999795192",
    portaria: "160º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("14/05/2024"),
    dataNascimento: parseDate("14/10/1983"),
    rg: "1164544900 SSP/BA",
    cpf: "02356995510",
  },
   // ... all other attendants from the original file
];

export function useAttendantsData() {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const { toast } = useToast();

    const getAttendantsFromStorage = useCallback((): Attendant[] => {
        if (typeof window === "undefined") return [];
        try {
            const attendantsJson = localStorage.getItem(ATTENDANTS_STORAGE_KEY);
            if (attendantsJson) {
                const parsed = JSON.parse(attendantsJson);
                if (parsed && parsed.length > 0) return parsed;
            }
            localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANTS));
            return INITIAL_ATTENDANTS;
        } catch (error) {
            console.error("Failed to parse attendants from localStorage", error);
            localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANTS));
            return INITIAL_ATTENDANTS;
        }
    }, []);

    useEffect(() => {
        setAttendants(getAttendantsFromStorage());
    }, [getAttendantsFromStorage]);

    const saveAttendantsToStorage = (attendantsToSave: Attendant[]) => {
        localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(attendantsToSave));
        setAttendants(attendantsToSave);
    }

    const addAttendant = async (attendantData: Omit<Attendant, 'id'>) => {
        const currentAttendants = getAttendantsFromStorage();
        if (currentAttendants.some(a => a.email.toLowerCase() === attendantData.email.toLowerCase())) {
            toast({
                variant: "destructive",
                title: "Erro ao adicionar atendente",
                description: "Um atendente com este email já existe.",
            });
            throw new Error("Atendente já existe");
        }
        if (currentAttendants.some(a => a.cpf === attendantData.cpf && a.cpf !== '')) {
            toast({
                variant: "destructive",
                title: "Erro ao adicionar atendente",
                description: "Um atendente com este CPF já existe.",
            });
            throw new Error("CPF já existe");
        }

        const newAttendant: Attendant = {
            ...attendantData,
            id: new Date().toISOString(),
        }

        const newAttendants = [...currentAttendants, newAttendant];
        saveAttendantsToStorage(newAttendants);
        toast({
            title: "Atendente Adicionado!",
            description: `O atendente "${newAttendant.name}" foi adicionado com sucesso.`
        });
    };

    const updateAttendant = async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
        const currentAttendants = getAttendantsFromStorage();

        if (attendantData.email && currentAttendants.some(a => a.id !== attendantId && a.email.toLowerCase() === attendantData.email?.toLowerCase())) {
            toast({ variant: "destructive", title: "Erro", description: "Email já cadastrado." });
            throw new Error("Email já existe");
        }
        if (attendantData.cpf && attendantData.cpf !== '' && currentAttendants.some(a => a.id !== attendantId && a.cpf === attendantData.cpf)) {
            toast({ variant: "destructive", title: "Erro", description: "CPF já cadastrado." });
            throw new Error("CPF já existe");
        }

        const newAttendants = currentAttendants.map(a =>
            a.id === attendantId ? { ...a, ...attendantData } : a
        );
        saveAttendantsToStorage(newAttendants);
        toast({
            title: "Atendente Atualizado!",
            description: "Os dados do atendente foram atualizados."
        });
    };

    const deleteAttendant = async (attendantId: string) => {
        const currentAttendants = getAttendantsFromStorage();
        const newAttendants = currentAttendants.filter(a => a.id !== attendantId);
        saveAttendantsToStorage(newAttendants);
        
        const evaluationsJson = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
        const currentEvaluations = evaluationsJson ? JSON.parse(evaluationsJson) : [];
        const newEvaluations = currentEvaluations.filter((e: any) => e.attendantId !== attendantId);
        localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(newEvaluations));

        toast({
            title: "Atendente Removido!",
            description: "O atendente e todas as suas avaliações foram removidos do sistema."
        });
    };
    
    return { attendants, addAttendant, updateAttendant, deleteAttendant };
}
