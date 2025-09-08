
"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePrisma } from "@/providers/PrismaProvider";
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
import { ROLES, type User, type Role } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

const editFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  role: z.nativeEnum(ROLES),
  modules: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Você deve selecionar pelo menos um módulo.",
  }),
});

const addFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  role: z.nativeEnum(ROLES),
  modules: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Você deve selecionar pelo menos um módulo.",
  }),
});


export default function UsuariosPage() {
  const { user, isAuthenticated, authLoading, appLoading, modules } = useAuth();
  const { allUsers, createUser, updateUser, deleteUser } = usePrisma();
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { name: "", role: ROLES.USER, modules: [] },
  });

  const addForm = useForm<z.infer<typeof addFormSchema>>({
    resolver: zodResolver(addFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: ROLES.USER,
      modules: [],
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
      router.push("/dashboard");
    }
  }, [authLoading, isAuthenticated, user?.role, router]);


  useEffect(() => {
    if (selectedUser) {
      editForm.reset({
        name: selectedUser.name,
        role: selectedUser.role,
        modules: selectedUser.modules?.map(m => m.id) || [],
      });
    }
  }, [selectedUser, editForm]);

  const activeModules = useMemo(() => modules?.filter(m => m.active) || [], [modules]);
  const moduleMap = useMemo(() => {
    return modules?.reduce((acc, module) => {
        acc[module.id] = module.name;
        return acc;
    }, {} as Record<string, string>) || {};
  }, [modules]);

  async function onAddSubmit(values: z.infer<typeof addFormSchema>) {
    try {
      await createUser(values);
      addForm.reset();
      setIsAddDialogOpen(false);
    } catch (error) { /* toast handled */ }
  }


  async function onEditSubmit(values: z.infer<typeof editFormSchema>) {
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, values);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) { /* toast handled in auth provider */ }
  }

  async function onDeleteConfirm() {
    if (!selectedUser) return;
    try {
        await deleteUser(selectedUser.id);
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
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

  if (authLoading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }

  // Verificar permissões
  if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPERADMIN) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }
  
  const sortedUsers = [...(allUsers || [])].sort((a, b) => a.name.localeCompare(b.name));

  const availableRoles = Object.values(ROLES).filter(role => {
    if (user?.role === ROLES.SUPERADMIN) return true;
    if (user?.role === ROLES.ADMIN) return role !== ROLES.SUPERADMIN;
    return false;
  });

  return (
    <>
      <div className="space-y-8">
          <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                      <Button><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                          <DialogDescription>Crie uma nova conta e defina suas permissões.</DialogDescription>
                      </DialogHeader>
                      <Form {...addForm}>
                          <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                              <div className="space-y-4">
                                  <FormField
                                      control={addForm.control}
                                      name="name"
                                      render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Nome</FormLabel>
                                          <FormControl>
                                              <Input placeholder="Nome completo do usuário" {...field} />
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
                                  <FormField
                                      control={addForm.control}
                                      name="password"
                                      render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Senha</FormLabel>
                                          <FormControl>
                                              <Input type="password" placeholder="********" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                      )}
                                  />
                                  <FormField
                                      control={addForm.control}
                                      name="role"
                                      render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Nível de Acesso</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Selecione um nível" />
                                                  </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  {availableRoles.map((role) => (
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
                              </div>
                              <FormField
                                  control={addForm.control}
                                  name="modules"
                                  render={() => (
                                  <FormItem className="space-y-3 rounded-lg border p-4">
                                      <div className="mb-4">
                                      <FormLabel className="text-base">Módulos de Acesso</FormLabel>
                                      <FormDescription>
                                          Selecione os módulos que este usuário poderá acessar.
                                      </FormDescription>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                          {activeModules.map((item) => (
                                          <FormField
                                              key={item.id}
                                              control={addForm.control}
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
                                      </div>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />

                              <DialogFooter className="col-span-1 md:col-span-2">
                                  <Button type="button" variant="secondary" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                                  <Button type="submit" disabled={addForm.formState.isSubmitting}>
                                      {addForm.formState.isSubmitting ? 'Criando...' : 'Criar Usuário'}
                                  </Button>
                              </DialogFooter>
                          </form>
                      </Form>
                  </DialogContent>
              </Dialog>
          </div>

          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle>Usuários do Sistema</CardTitle>
                  <CardDescription>Lista de todos os usuários cadastrados no sistema.</CardDescription>
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
                          {appLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                  <TableRow key={i}>
                                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                      <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                                      <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                                  </TableRow>
                            ))
                          ) : sortedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8">
                                <div className="text-muted-foreground">
                                  <p className="text-lg mb-2">Nenhum usuário encontrado</p>
                                  <p className="text-sm">
                                    {!isAuthenticated 
                                      ? "Faça login para visualizar os usuários" 
                                      : "Você pode não ter permissão para visualizar usuários ou não há usuários cadastrados"}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : sortedUsers.map((u) => (
                              <TableRow key={u.id}>
                                  <TableCell className="font-medium">{u.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                  <TableCell>
                                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                                  </TableCell>
                                  <TableCell className="flex gap-1 flex-wrap max-w-xs">
                                      {u.modules?.map(module => (
                                          <Badge key={module.id} variant="outline" className="capitalize">{module.name}</Badge>
                                      ))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0" 
                                                disabled={
                                                  u.id === user.id || 
                                                  (u.role === ROLES.SUPERADMIN && user.role !== ROLES.SUPERADMIN)
                                                }
                                              >
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
                  <Form {...editForm}>
                      <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                          <FormField
                              control={editForm.control}
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
                              control={editForm.control}
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
                                          {availableRoles.map((role) => (
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
                              control={editForm.control}
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
                                      control={editForm.control}
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
    </>
  );
}
