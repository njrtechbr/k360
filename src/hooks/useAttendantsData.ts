"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Attendant, AttendantImport } from "@/lib/types";

export function useAttendantsData() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const { toast } = useToast();

  const fetchAttendants = useCallback(async () => {
    const startTime = performance.now();
    console.log("ATTENDANTS: Buscando atendentes da API...");
    try {
      const response = await fetch("/api/attendants");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const attendantsList = await response.json();
      setAttendants(attendantsList);
      const endTime = performance.now();
      console.log(
        `PERF: fetchAttendants (${attendantsList.length} items) took ${(endTime - startTime).toFixed(2)}ms`,
      );
      return attendantsList;
    } catch (error) {
      console.error("Error fetching attendants from API: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar atendentes",
        description: "Não foi possível buscar os dados da API.",
      });
      return [];
    }
  }, [toast]);

  const fetchAttendantImports = useCallback(async (): Promise<
    AttendantImport[]
  > => {
    const startTime = performance.now();
    console.log("ATTENDANTS: Buscando histórico de importações da API...");
    try {
      const response = await fetch("/api/attendants/imports");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const list = await response.json();
      const endTime = performance.now();
      console.log(
        `PERF: fetchAttendantImports (${list.length} items) took ${(endTime - startTime).toFixed(2)}ms`,
      );
      return list;
    } catch (error) {
      console.error(
        "ATTENDANTS: Erro ao buscar históricos de importação:",
        error,
      );
      return [];
    }
  }, []);

  const addAttendant = async (
    attendantData: Omit<Attendant, "id">,
  ): Promise<Attendant> => {
    try {
      const response = await fetch("/api/attendants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attendantData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const finalAttendantData = await response.json();
      await fetchAttendants(); // Refresh the list
      toast({
        title: "Atendente Adicionado!",
        description: "O novo atendente foi adicionado com sucesso.",
      });
      return finalAttendantData;
    } catch (error) {
      console.error("Error adding attendant: ", error);
      toast({ variant: "destructive", title: "Erro ao adicionar atendente" });
      throw error;
    }
  };

  const updateAttendant = async (
    attendantId: string,
    attendantData: Partial<Omit<Attendant, "id">>,
  ) => {
    try {
      const response = await fetch(`/api/attendants/${attendantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attendantData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchAttendants(); // Refresh the list
      toast({
        title: "Atendente Atualizado!",
        description: "Os dados do atendente foram atualizados.",
      });
    } catch (error) {
      console.error("Error updating attendant: ", error);
      toast({ variant: "destructive", title: "Erro ao atualizar atendente" });
      throw error;
    }
  };

  const deleteAttendants = async (attendantIds: string[]) => {
    if (attendantIds.length === 0) return;
    try {
      // Delete each attendant individually since we don't have a bulk delete endpoint
      const deletePromises = attendantIds.map((id) =>
        fetch(`/api/attendants/${id}`, {
          method: "DELETE",
        }),
      );

      const responses = await Promise.all(deletePromises);

      // Check if all deletions were successful
      for (const response of responses) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      await fetchAttendants(); // Refresh the list
      toast({
        title: "Atendentes Removidos!",
        description: `${attendantIds.length} atendente(s) foram removidos.`,
      });
    } catch (error) {
      console.error("Error deleting attendants: ", error);
      toast({ variant: "destructive", title: "Erro ao remover atendentes" });
      throw error;
    }
  };

  const addAttendantImportRecord = async (
    importData: Omit<AttendantImport, "id">,
  ): Promise<AttendantImport> => {
    try {
      const response = await fetch("/api/attendants/imports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(importData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newImport = await response.json();
      return newImport;
    } catch (error) {
      console.error(
        "ATTENDANTS: Erro ao salvar histórico de importação:",
        error,
      );
      throw error;
    }
  };

  const revertAttendantImport = async (importId: string) => {
    try {
      const response = await fetch(`/api/attendants/imports/${importId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchAttendants(); // Refresh the list
      await fetchAttendantImports(); // Refresh imports list

      toast({
        title: "Importação de Atendentes Revertida!",
        description: "Os atendentes da importação selecionada foram removidos.",
      });
    } catch (error) {
      console.error("Error reverting attendant import: ", error);
      toast({ variant: "destructive", title: "Erro ao reverter importação" });
      throw error;
    }
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
