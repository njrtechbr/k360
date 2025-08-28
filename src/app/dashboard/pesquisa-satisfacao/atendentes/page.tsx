
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { type Attendant } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Power, PowerOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
});

const editFormSchema = formSchema.extend({
    active: z.boolean(),
})


export default function AtendentesPage() {
  const { user, isAuthenticated, loading, attendants, addAttendant, updateAttendant, deleteAttendant } = useAuth();
  const router = useRouter();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);

  const addForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { name: "", email: "", active: true },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (selectedAttendant) {
      editForm.reset({
        name: selectedAttendant.name,
        email: selectedAttendant.email,
        active: selectedAttendant.active,
      });
    }
  }, [selectedAttendant, editForm]);

  async function onAddSubmit(values: z.infer<typeof formSchema>) {
    try {
      await addAttendant(values);
      addForm.reset();
      setIsAddDialogOpen(false);
    } catch (error) { /* toast handled */ }
  }

  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!selectedAttendant) return;
    try {
      await updateAttendant(selectedAttendant.id, values);
      setIsEditDialogOpen(false);
      setSelectedAttendant(null);
    } catch (error) { /* toast handled */ }
  }

  async function onDeleteConfirm() {
    if (!selectedAttendant) return;
    try {
        await deleteAttendant(selectedAttendant.id);
        setIsDeleteDialogOpen(false);
        setSelectedAttendant(null);
    } catch(error) { /* toast handled */ }
  }

  const handleEditClick = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleStatus = (attendant: Attendant) => {
    updateAttendant(attendant.id, { active: !attendant.active });
  }

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }
  
  const sortedAttendants = [...attendants].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Gerenciamento de Atendentes</h1>
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                     <Button><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atendente</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Adicionar Novo Atendente</DialogTitle>
                        <DialogDescription>Cadastre um novo atendente para as pesquisas.</DialogDescription>
                    </DialogHeader>
                    <Form {...addForm}>
                        <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={addForm.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome completo do atendente" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={addForm.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={addForm.formState.isSubmitting}>
                                    {addForm.formState.isSubmitting ? 'Adicionando...' : 'Adicionar Atendente'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Atendentes Cadastrados</CardTitle>
                <CardDescription>Lista de todos os atendentes cadastrados no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAttendants.map((att) => (
                            <TableRow key={att.id}>
                                <TableCell className="font-medium">{att.name}</TableCell>
                                <TableCell className="text-muted-foreground">{att.email}</TableCell>
                                <TableCell>
                                    <Badge variant={att.active ? "secondary" : "destructive"}>
                                        {att.active ? "Ativo" : "Inativo"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(att)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => handleToggleStatus(att)}>
                                                {att.active ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                                                {att.active ? 'Desativar' : 'Ativar'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(att)}>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Editar Atendente</DialogTitle>
                    <DialogDescription>Altere as informações do atendente.</DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={editForm.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Atendente</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={editForm.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={editForm.control}
                            name="active"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                <FormLabel>Status</FormLabel>
                                <FormDescription>
                                    Atendentes inativos não aparecem nas pesquisas.
                                </FormDescription>
                                </div>
                                <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={editForm.formState.isSubmitting}>
                                {editForm.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>


        {/* Delete Alert Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o atendente "{selectedAttendant?.name}".
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
