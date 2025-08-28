
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLES, type User, type Module, Role } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  role: z.nativeEnum(ROLES),
  modules: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Você deve selecionar pelo menos um módulo.",
  }),
});

export default function UsuariosPage() {
  const { user, isAuthenticated, loading, getUsers, modules, updateUser, deleteUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", role: ROLES.USER, modules: [] },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
      router.push("/dashboard");
    } else if (isAuthenticated) {
        setUsers(getUsers());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading, router, user]);

  useEffect(() => {
    if (selectedUser) {
      form.reset({
        name: selectedUser.name,
        role: selectedUser.role,
        modules: selectedUser.modules,
      });
    }
  }, [selectedUser, form]);

  const activeModules = useMemo(() => modules.filter(m => m.active), [modules]);
  const moduleMap = useMemo(() => {
    return modules.reduce((acc, module) => {
        acc[module.id] = module.name;
        return acc;
    }, {} as Record<string, string>);
  }, [modules]);


  async function onEditSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, values);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      setUsers(getUsers()); // Refresh users list
    } catch (error) { /* toast handled in auth provider */ }
  }

  async function onDeleteConfirm() {
    if (!selectedUser) return;
    try {
        await deleteUser(selectedUser.id);
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        setUsers(getUsers()); // Refresh users list
    } catch(error) { /* toast handled */ }
  }

  const handleEditClick = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (userToDelete: User) => {
    setSelectedUser(userToDelete);
    setIsDeleteDialogOpen(true);
  };

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }
  
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <Button asChild>
                <Link href="/registrar"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário</Link>
            </Button>
        </div>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
                <CardDescription>Lista de todos os usuários cadastrados.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Nível</TableHead>
                            <TableHead>Módulos</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedUsers.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.name}</TableCell>
                                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                                </TableCell>
                                <TableCell className="flex gap-1 flex-wrap max-w-xs">
                                    {u.modules?.map(mId => (
                                        <Badge key={mId} variant="outline" className="capitalize">{moduleMap[mId] || 'inválido'}</Badge>
                                    ))}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={u.role === ROLES.SUPERADMIN && user.role !== ROLES.SUPERADMIN}>
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(u)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(u)}>
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
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>Altere as informações e permissões do usuário.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Usuário</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nível de Acesso</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um nível de acesso" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.values(ROLES).map((role) => (
                                            role !== ROLES.SUPERADMIN &&
                                            <SelectItem key={role} value={role} className="capitalize">
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="modules"
                            render={() => (
                            <FormItem>
                                <div className="mb-4">
                                <FormLabel className="text-base">Módulos</FormLabel>
                                <FormDescription>
                                    Selecione os módulos que este usuário terá acesso.
                                </FormDescription>
                                </div>
                                {activeModules.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="modules"
                                    render={({ field }) => {
                                    return (
                                        <FormItem
                                        key={item.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(
                                                    (field.value || [])?.filter(
                                                        (value) => value !== item.id
                                                    )
                                                    )
                                            }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal capitalize">
                                            {item.name}
                                        </FormLabel>
                                        </FormItem>
                                    )
                                    }}
                                />
                                ))}
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
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
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário "{selectedUser?.name}" 
                        e removerá seu acesso ao sistema.
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

    