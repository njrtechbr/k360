
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { ROLES, type Module } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome do módulo deve ter pelo menos 3 caracteres." }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres." }),
});

export default function ModulosPage() {
  const { user, isAuthenticated, loading, modules, addModule, updateModule, toggleModuleStatus, deleteModule } = useAuth();
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, user]);

  useEffect(() => {
    if (selectedModule) {
      editForm.reset({
        name: selectedModule.name,
        description: selectedModule.description,
      });
    }
  }, [selectedModule, editForm]);


  async function onAddSubmit(values: z.infer<typeof formSchema>) {
    try {
      await addModule(values);
      form.reset();
    } catch (error) { /* toast handled in auth provider */ }
  }

  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedModule) return;
    try {
      await updateModule(selectedModule.id, values);
      setIsEditDialogOpen(false);
      setSelectedModule(null);
    } catch (error) { /* toast handled in auth provider */ }
  }

  async function onToggleStatus() {
    if (!selectedModule) return;
    await toggleModuleStatus(selectedModule.id);
  }

  async function onDeleteConfirm() {
    if (!selectedModule) return;
    try {
        await deleteModule(selectedModule.id);
        setIsDeleteDialogOpen(false);
        setSelectedModule(null);
    } catch(error) { /* toast handled */ }
  }

  const handleEditClick = (mod: Module) => {
    setSelectedModule(mod);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (mod: Module) => {
    setSelectedModule(mod);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleClick = (mod: Module) => {
    setSelectedModule(mod);
    // Use a timeout to ensure the state is set before the async operation
    setTimeout(() => onToggleStatus(), 0);
  }

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }
  
  const sortedModules = [...modules].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Gerenciamento de Módulos</h1>
        <div className="grid md:grid-cols-3 gap-8 items-start">
            <Card className="md:col-span-1 shadow-lg">
                <CardHeader>
                <CardTitle>Adicionar Novo Módulo</CardTitle>
                <CardDescription>Crie um novo módulo para o sistema.</CardDescription>
                </CardHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddSubmit)}>
                    <CardContent className="space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome do Módulo</FormLabel> <FormControl> <Input placeholder="Ex: Contabilidade" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                     <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Descrição</FormLabel> <FormControl> <Textarea placeholder="Descreva o que este módulo faz." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Adicionando...' : 'Adicionar Módulo'}
                    </Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>

            <Card className="md:col-span-2 shadow-lg">
                <CardHeader>
                    <CardTitle>Módulos Existentes</CardTitle>
                    <CardDescription>Lista de todos os módulos cadastrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedModules.map((mod) => (
                                <TableRow key={mod.id}>
                                    <TableCell className="font-medium capitalize">{mod.name}</TableCell>
                                    <TableCell>{mod.description}</TableCell>
                                    <TableCell>
                                        <Badge variant={mod.active ? "secondary" : "destructive"}>
                                            {mod.active ? "Ativo" : "Inativo"}
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
                                                <DropdownMenuItem onClick={() => handleEditClick(mod)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleClick(mod)}>
                                                    {mod.active ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                                                    {mod.active ? 'Desativar' : 'Ativar'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(mod)}>
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
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Módulo</DialogTitle>
                    <DialogDescription>Altere as informações do módulo.</DialogDescription>
                </DialogHeader>
                 <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                        <FormField control={editForm.control} name="name" render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Nome do Módulo</FormLabel> 
                                <FormControl> 
                                    <Input {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}/>
                        <FormField control={editForm.control} name="description" render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Descrição</FormLabel> 
                                <FormControl> 
                                    <Textarea {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}/>
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
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o módulo "{selectedModule?.name}" 
                        e o removerá de todos os usuários associados a ele.
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
