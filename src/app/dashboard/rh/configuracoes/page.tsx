
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
});

type ItemType = 'funcao' | 'setor';

export default function RHConfiguracoesPage() {
    const { user, isAuthenticated, loading, funcoes, setores, addFuncao, updateFuncao, deleteFuncao, addSetor, updateSetor, deleteSetor } = useAuth();
    const router = useRouter();

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ type: ItemType, value: string } | null>(null);
    const [itemType, setItemType] = useState<ItemType>('funcao');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "" },
    });

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router, user]);

    useEffect(() => {
        if (selectedItem) {
            form.reset({ name: selectedItem.value });
        } else {
            form.reset({ name: "" });
        }
    }, [selectedItem, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!selectedItem) { // Adding new item
            if (itemType === 'funcao') await addFuncao(values.name);
            else await addSetor(values.name);
        } else { // Editing existing item
            if (selectedItem.type === 'funcao') await updateFuncao(selectedItem.value, values.name);
            else await updateSetor(selectedItem.value, values.name);
        }
        form.reset();
        setIsFormDialogOpen(false);
        setSelectedItem(null);
    }
    
    async function onDeleteConfirm() {
        if (!selectedItem) return;
        if (selectedItem.type === 'funcao') await deleteFuncao(selectedItem.value);
        else await deleteSetor(selectedItem.value);

        setIsDeleteDialogOpen(false);
        setSelectedItem(null);
    }
    
    const handleAddClick = (type: ItemType) => {
        setItemType(type);
        setSelectedItem(null);
        form.reset();
        setIsFormDialogOpen(true);
    };

    const handleEditClick = (type: ItemType, value: string) => {
        setItemType(type);
        setSelectedItem({ type, value });
        setIsFormDialogOpen(true);
    };

    const handleDeleteClick = (type: ItemType, value: string) => {
        setSelectedItem({ type, value });
        setIsDeleteDialogOpen(true);
    };

    const renderTable = (type: ItemType, data: string[]) => (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="capitalize">{type === 'funcao' ? 'Funções' : 'Setores'}</CardTitle>
                        <CardDescription>Gerencie as {type === 'funcao' ? 'funções' : 'setores'} disponíveis no sistema.</CardDescription>
                    </div>
                    <Button onClick={() => handleAddClick(type)}>Adicionar {type === 'funcao' ? 'Função' : 'Setor'}</Button>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="text-right w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item}>
                                <TableCell className="font-medium capitalize">{item}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(type, item)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(type, item)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Configurações de RH</h1>
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {renderTable('funcao', funcoes)}
                {renderTable('setor', setores)}
            </div>
            
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="capitalize">{selectedItem ? 'Editar' : 'Adicionar'} {itemType}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome d{itemType === 'funcao' ? 'a Função' : 'o Setor'}</FormLabel>
                                    <FormControl><Input {...field} className="capitalize"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsFormDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Esta ação não pode ser desfeita. Isso excluirá permanentemente o item "{selectedItem?.value}".
                           Se este item estiver em uso por algum atendente, pode ser necessário atualizar o cadastro dele manualmente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
