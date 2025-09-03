
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Checkbox } from "@/components/ui/checkbox";
import ImportProgressModal from "@/components/ImportProgressModal";

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

export default function GerenciarAvaliacoesPage() {
    const { user, isAuthenticated, loading, evaluations, attendants, deleteEvaluations, isProcessing } = useAuth();
    const router = useRouter();

    const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const attendantMap = useMemo(() => {
        return attendants.reduce((acc, attendant) => {
            acc[attendant.id] = attendant.name;
            return acc;
        }, {} as Record<string, string>);
    }, [attendants]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }
    
    const sortedEvaluations = [...evaluations].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(sortedEvaluations.map(e => e.id));
        } else {
            setSelectedIds([]);
        }
    };
    
    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(rowId => rowId !== id));
        }
    };

    const handleDeleteSelected = async () => {
        await deleteEvaluations(selectedIds, 'Excluindo Avaliações Selecionadas');
        setSelectedIds([]);
        setIsDeleteSelectedOpen(false);
    };

    const handleDeleteAll = async () => {
        const allIds = sortedEvaluations.map(e => e.id);
        await deleteEvaluations(allIds, 'Excluindo TODAS as Avaliações');
        setSelectedIds([]);
        setIsDeleteAllOpen(false);
    };

    return (
        <>
            <ImportProgressModal />
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Gerenciar Avaliações</h1>
                        <p className="text-muted-foreground">
                            Selecione e exclua avaliações específicas ou apague todos os registros de uma só vez.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteSelectedOpen(true)}
                            disabled={selectedIds.length === 0 || isProcessing}
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Excluir {selectedIds.length} Selecionadas
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteAllOpen(true)}
                            disabled={sortedEvaluations.length === 0 || isProcessing}
                        >
                            <AlertCircle className="mr-2 h-4 w-4"/>
                            Excluir Todas
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Tabela de Avaliações</CardTitle>
                        <CardDescription>
                            Selecione as avaliações que deseja excluir. As avaliações nativas (criadas diretamente pelo sistema) não podem ser excluídas por aqui.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedIds.length > 0 && selectedIds.length === sortedEvaluations.filter(e => e.importId !== 'native').length}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedIds(sortedEvaluations.filter(e => e.importId !== 'native').map(e => e.id));
                                                } else {
                                                    setSelectedIds([]);
                                                }
                                            }}
                                            aria-label="Selecionar tudo"
                                        />
                                    </TableHead>
                                    <TableHead>Atendente</TableHead>
                                    <TableHead>Nota</TableHead>
                                    <TableHead>Comentário</TableHead>
                                    <TableHead className="text-right">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedEvaluations.length > 0 ? (
                                    sortedEvaluations.map((evaluation) => (
                                        <TableRow key={evaluation.id} data-state={selectedIds.includes(evaluation.id) && "selected"}>
                                             <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(evaluation.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(evaluation.id, !!checked)}
                                                    aria-label={`Selecionar avaliação ${evaluation.id}`}
                                                    disabled={evaluation.importId === 'native'}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Badge variant="outline">{attendantMap[evaluation.attendantId] || "Desconhecido"}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <RatingStars rating={evaluation.nota} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-sm truncate">
                                                {evaluation.comentario}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {format(new Date(evaluation.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            Nenhuma avaliação encontrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog for deleting selected */}
            <AlertDialog open={isDeleteSelectedOpen} onOpenChange={setIsDeleteSelectedOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Excluir Avaliações Selecionadas?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Você tem certeza que deseja excluir permanentemente as <strong>{selectedIds.length}</strong> avaliações selecionadas?
                           Esta ação não pode ser desfeita e os dados de gamificação serão recalculados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                           Sim, excluir selecionadas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Dialog for deleting all */}
             <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Excluir TODAS as Avaliações?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Você tem certeza absoluta? Esta ação excluirá permanentemente <strong>TODAS as {sortedEvaluations.length}</strong> avaliações do sistema.
                           Esta ação não pode ser desfeita e os dados de gamificação de todos os atendentes serão zerados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                           Sim, excluir TUDO
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
