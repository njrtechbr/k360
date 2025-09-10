

"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { File, Calendar, User, List, Trash2, AlertCircle, Eye, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Evaluation, EvaluationImport } from "@/lib/types";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const RatingStars = ({ rating }: { rating: number }) => {
    const totalStars = 5;
    return (
        <div className="flex items-center">
            {[...Array(totalStars)].map((_, index) => (
                <Star
                    key={index}
                    className={`h-4 w-4 ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );
};


export default function HistoricoImportacoesPage() {
    const { user, isAuthenticated, loading, evaluationImports, revertEvaluationImport, evaluations, attendants, deleteEvaluations, allUsers } = useAuth();
    const router = useRouter();

    const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);

    const [selectedImport, setSelectedImport] = useState<EvaluationImport | null>(null);
    const [selectedEvaluationIds, setSelectedEvaluationIds] = useState<string[]>([]);


    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    useEffect(() => {
        if (!isDetailsDialogOpen) {
            setSelectedEvaluationIds([]);
        }
    }, [isDetailsDialogOpen]);

    const userMap = useMemo(() => {
        return allUsers.reduce((acc, u) => {
            acc[u.id] = u.name;
            return acc;
        }, {} as Record<string, string>);
    }, [allUsers]);

    const attendantMap = useMemo(() => {
        return attendants.reduce((acc, a) => {
            acc[a.id] = a.name;
            return acc;
        }, {} as Record<string, string>);
    }, [attendants]);

    const evaluationsForSelectedImport = useMemo(() => {
        if (!selectedImport) return [];
        const evaluationIds = new Set(selectedImport.evaluationIds);
        return evaluations.filter(ev => evaluationIds.has(ev.id));
    }, [selectedImport, evaluations]);

    const handleRevertClick = (importRecord: EvaluationImport) => {
        setSelectedImport(importRecord);
        setIsRevertDialogOpen(true);
    };

    const handleDetailsClick = (importRecord: EvaluationImport) => {
        setSelectedImport(importRecord);
        setIsDetailsDialogOpen(true);
    }
    
    const handleDeleteSelectedClick = () => {
        if (selectedEvaluationIds.length > 0) {
            setIsDeleteSelectedOpen(true);
        }
    };

    const handleRevertConfirm = async () => {
        if (!selectedImport) return;
        await revertEvaluationImport(selectedImport.id);
        setIsRevertDialogOpen(false);
        setSelectedImport(null);
    };
    
    const handleDeleteSelectedConfirm = async () => {
        const evaluationsToDelete = evaluationsForSelectedImport
            .filter(ev => selectedEvaluationIds.includes(ev.id))
            .filter(ev => ev.importId !== 'native'); // Double check to not delete native ones

        if (evaluationsToDelete.length !== selectedEvaluationIds.length) {
            // This case shouldn't happen with the current UI, but it's a good safeguard
        }

        await deleteEvaluations(Array.isArray(evaluationsToDelete) ? evaluationsToDelete.map(e => e.id) : []);
        setIsDeleteSelectedOpen(false);
        
        // Optimistically update the view in the modal
        if (selectedImport) {
            const updatedImport = {
                ...selectedImport,
                evaluationIds: selectedImport.evaluationIds.filter(id => !selectedEvaluationIds.includes(id))
            };
            setSelectedImport(updatedImport);
        }
        setSelectedEvaluationIds([]);
    };
    
    const formatDateSafe = (dateStr: string | null) => {
        if (!dateStr) return "Data inválida";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return "Data inválida";
            }
            return format(date, "dd/MM/yy HH:mm", { locale: ptBR });
        } catch (error) {
            return "Data inválida";
        }
    };
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Only select non-native evaluations
            const selectableIds = evaluationsForSelectedImport
                .filter(e => e.importId !== 'native')
                .map(e => e.id);
            setSelectedEvaluationIds(selectableIds);
        } else {
            setSelectedEvaluationIds([]);
        }
    };
    
    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedEvaluationIds(prev => [...prev, id]);
        } else {
            setSelectedEvaluationIds(prev => prev.filter(rowId => rowId !== id));
        }
    };

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }
    
    const sortedImports = [...evaluationImports].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

    return (
        <>
            <div className="space-y-8">
                <h1 className="text-3xl font-bold">Gerenciar Importações de Avaliações</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Lotes Importados</CardTitle>
                        <CardDescription>
                            Gerencie os lotes de avaliações importados. Você pode ver os detalhes de cada lote, reverter uma importação inteira ou excluir avaliações específicas.
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
                                                    {formatDateSafe(importRecord.importedAt)}
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
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleDetailsClick(importRecord)}>
                                                    <Eye className="mr-2 h-4 w-4" /> Detalhes
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleRevertClick(importRecord)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Reverter Lote
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

            {/* Details Dialog */}
            <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Importação</DialogTitle>
                        <DialogDescription>
                           Arquivo: <span className="font-semibold">{selectedImport?.fileName}</span>. Visualize e gerencie as avaliações deste lote.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedEvaluationIds.length > 0 && selectedEvaluationIds.length === evaluationsForSelectedImport.filter(e => e.importId !== 'native').length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Atendente</TableHead>
                                    <TableHead>Nota</TableHead>
                                    <TableHead>Comentário</TableHead>
                                    <TableHead>Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluationsForSelectedImport.map(ev => (
                                    <TableRow key={ev.id}>
                                         <TableCell>
                                            <Checkbox
                                                checked={selectedEvaluationIds.includes(ev.id)}
                                                onCheckedChange={(checked) => handleSelectRow(ev.id, !!checked)}
                                                disabled={ev.importId === 'native'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{attendantMap[ev.attendantId] || 'Desconhecido'}</Badge>
                                        </TableCell>
                                        <TableCell><RatingStars rating={ev.nota} /></TableCell>
                                        <TableCell className="text-muted-foreground">{ev.comentario}</TableCell>
                                        <TableCell>{formatDateSafe(ev.data)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter className="justify-between sm:justify-between">
                         <Button variant="destructive" onClick={handleDeleteSelectedClick} disabled={selectedEvaluationIds.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir {selectedEvaluationIds.length} Selecionadas
                        </Button>
                        <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert Dialog */}
            <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Reverter Importação Completa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja reverter este lote de importação? Todas as <strong>{selectedImport?.evaluationIds.length}</strong> avaliações associadas
                            ao arquivo <strong>{selectedImport?.fileName}</strong> serão permanentemente excluídas. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevertConfirm} className="bg-destructive hover:bg-destructive/90">
                           Sim, reverter lote
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Delete Selected Evaluations Dialog */}
             <AlertDialog open={isDeleteSelectedOpen} onOpenChange={setIsDeleteSelectedOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Excluir Avaliações Selecionadas?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Tem certeza que deseja excluir as <strong>{selectedEvaluationIds.length}</strong> avaliações selecionadas deste lote? Esta ação é irreversível.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelectedConfirm} className="bg-destructive hover:bg-destructive/90">
                           Sim, excluir selecionadas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

