
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { File, Calendar, User, List, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvaluationImport } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HistoricoImportacoesPage() {
    const { user, isAuthenticated, loading, evaluationImports, allUsers, revertImport, recalculateAllGamificationData, attendants, evaluations, aiAnalysisResults } = useAuth();
    const router = useRouter();

    const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
    const [selectedImport, setSelectedImport] = useState<EvaluationImport | null>(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    const userMap = useMemo(() => {
        return allUsers.reduce((acc, u) => {
            acc[u.id] = u.name;
            return acc;
        }, {} as Record<string, string>);
    }, [allUsers]);

    const handleRevertClick = (importRecord: EvaluationImport) => {
        setSelectedImport(importRecord);
        setIsRevertDialogOpen(true);
    };

    const handleRevertConfirm = async () => {
        if (!selectedImport) return;
        revertImport(selectedImport.id);
        
        // After reverting, we need to get the new state of evaluations
        const updatedEvaluations = JSON.parse(localStorage.getItem('controle_acesso_evaluations') || '[]');
        recalculateAllGamificationData(attendants, updatedEvaluations, aiAnalysisResults);
        
        setIsRevertDialogOpen(false);
        setSelectedImport(null);
    };

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const sortedImports = [...evaluationImports].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

    return (
        <>
            <div className="space-y-8">
                <h1 className="text-3xl font-bold">Histórico de Importações de Avaliações</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Lotes Importados</CardTitle>
                        <CardDescription>
                            Aqui está a lista de todas as importações de avaliações via CSV. Você pode reverter uma importação se ela foi feita incorretamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Arquivo</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Importado por</TableHead>
                                    <TableHead>Nº de Avaliações</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedImports.length > 0 ? (
                                    sortedImports.map((importRecord) => (
                                        <TableRow key={importRecord.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                                {importRecord.fileName}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {format(new Date(importRecord.importedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                 <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {userMap[importRecord.importedBy] || "Usuário Desconhecido"}
                                                 </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <List className="h-4 w-4 text-muted-foreground" />
                                                    {importRecord.evaluationIds.length}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="destructive" size="sm" onClick={() => handleRevertClick(importRecord)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Reverter
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            Nenhuma importação foi realizada ainda.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Reverter Importação?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja reverter esta importação? Esta ação não pode ser desfeita.
                            Todas as <strong>{selectedImport?.evaluationIds.length}</strong> avaliações associadas
                            a este lote (arquivo: <strong>{selectedImport?.fileName}</strong>) serão permanentemente excluídas.
                            Os pontos de gamificação e conquistas relacionados também serão recalculados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevertConfirm} className="bg-destructive hover:bg-destructive/90">
                           Sim, reverter importação
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
