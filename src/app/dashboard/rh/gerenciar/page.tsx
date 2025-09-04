
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, UserCircle } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function GerenciarAtendentesPage() {
    const { user, isAuthenticated, loading, attendants, deleteAttendants } = useAuth();
    const router = useRouter();

    const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }
    
    const sortedAttendants = [...attendants].sort((a, b) => a.name.localeCompare(b.name));

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(sortedAttendants.map(a => a.id));
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
        await deleteAttendants(selectedIds);
        setSelectedIds([]);
        setIsDeleteSelectedOpen(false);
    };

    const handleDeleteAll = async () => {
        const allIds = sortedAttendants.map(a => a.id);
        await deleteAttendants(allIds);
        setSelectedIds([]);
        setIsDeleteAllOpen(false);
    };

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Gerenciar Atendentes</h1>
                        <p className="text-muted-foreground">
                            Selecione e exclua atendentes específicos ou apague todos os registros de uma só vez.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteSelectedOpen(true)}
                            disabled={selectedIds.length === 0}
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Excluir {selectedIds.length} Selecionados
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteAllOpen(true)}
                            disabled={sortedAttendants.length === 0}
                        >
                            <AlertCircle className="mr-2 h-4 w-4"/>
                            Excluir Todos
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Tabela de Atendentes</CardTitle>
                        <CardDescription>
                            Selecione os atendentes que deseja excluir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedIds.length > 0 && selectedIds.length === sortedAttendants.length}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Selecionar tudo"
                                        />
                                    </TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Setor</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAttendants.length > 0 ? (
                                    sortedAttendants.map((attendant) => (
                                        <TableRow key={attendant.id} data-state={selectedIds.includes(attendant.id) && "selected"}>
                                             <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(attendant.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(attendant.id, !!checked)}
                                                    aria-label={`Selecionar atendente ${attendant.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={attendant.avatarUrl} alt={attendant.name}/>
                                                    <AvatarFallback><UserCircle /></AvatarFallback>
                                                </Avatar>
                                                {attendant.name}
                                            </TableCell>
                                            <TableCell>{attendant.funcao}</TableCell>
                                            <TableCell className="capitalize">{attendant.setor}</TableCell>
                                            <TableCell>
                                                <Badge variant={attendant.status === 'Ativo' ? "secondary" : "outline"}>
                                                    {attendant.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            Nenhum atendente encontrado.
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
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Excluir Atendentes Selecionados?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Você tem certeza que deseja excluir permanentemente os <strong>{selectedIds.length}</strong> atendentes selecionados?
                           Esta ação não pode ser desfeita e todos os dados associados (avaliações, etc.) serão perdidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                           Sim, excluir selecionados
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Dialog for deleting all */}
             <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Excluir TODOS os Atendentes?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Você tem certeza absoluta? Esta ação excluirá permanentemente <strong>TODOS os {sortedAttendants.length}</strong> atendentes do sistema, assim como todas as suas avaliações.
                           Esta ação não pode ser desfeita.
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
