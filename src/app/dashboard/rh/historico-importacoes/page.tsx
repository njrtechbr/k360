
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { File, Calendar, User, List, Trash2, AlertCircle, Eye, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Attendant, AttendantImport } from "@/lib/types";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function HistoricoImportacoesAtendentesPage() {
    const { user, isAuthenticated, loading, allUsers, attendantImports, revertAttendantImport, attendants } = useAuth();
    const router = useRouter();

    const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [selectedImport, setSelectedImport] = useState<AttendantImport | null>(null);

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

    const attendantsForSelectedImport = useMemo(() => {
        if (!selectedImport) return [];
        const attendantIds = new Set(selectedImport.attendantIds);
        return attendants.filter(att => attendantIds.has(att.id));
    }, [selectedImport, attendants]);


    const handleRevertClick = (importRecord: AttendantImport) => {
        setSelectedImport(importRecord);
        setIsRevertDialogOpen(true);
    };

    const handleDetailsClick = (importRecord: AttendantImport) => {
        setSelectedImport(importRecord);
        setIsDetailsDialogOpen(true);
    }

    const handleRevertConfirm = async () => {
        if (!selectedImport) return;
        revertAttendantImport(selectedImport.id);
        setIsRevertDialogOpen(false);
        setSelectedImport(null);
    };

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const sortedImports = [...attendantImports].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

    return (
        <>
            <div className="space-y-8">
                <h1 className="text-3xl font-bold">Histórico de Importações de Atendentes</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Lotes Importados</CardTitle>
                        <CardDescription>
                            Aqui está a lista de todas as importações de atendentes via CSV. Você pode ver os detalhes ou reverter uma importação.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Arquivo</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Importado por</TableHead>
                                    <TableHead>Nº de Atendentes</TableHead>
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
                                                    {importRecord.attendantIds.length}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleDetailsClick(importRecord)}>
                                                    <Eye className="mr-2 h-4 w-4" /> Detalhes
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleRevertClick(importRecord)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Reverter
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
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Atendentes Importados</DialogTitle>
                         <DialogDescription>
                           Arquivo: <span className="font-semibold">{selectedImport?.fileName}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendantsForSelectedImport.map(att => (
                                    <TableRow key={att.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={att.avatarUrl} alt={att.name}/>
                                                <AvatarFallback><UserCircle /></AvatarFallback>
                                            </Avatar>
                                            {att.name}
                                        </TableCell>
                                        <TableCell>{att.email}</TableCell>
                                        <TableCell>{att.funcao}</TableCell>
                                        <TableCell>
                                            <Badge variant={att.status === 'Ativo' ? 'secondary' : 'destructive'}>{att.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert Dialog */}
            <AlertDialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Reverter Importação?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja reverter esta importação? Esta ação não pode ser desfeita.
                            Todos os <strong>{selectedImport?.attendantIds.length}</strong> atendentes associados
                            a este lote (arquivo: <strong>{selectedImport?.fileName}</strong>) serão permanentemente excluídos.
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
