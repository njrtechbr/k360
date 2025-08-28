
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
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
import { type Attendant, ATTENDANT_STATUS } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, PlusCircle, CalendarIcon, UserCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  funcao: z.string().min(2, { message: "A função é obrigatória." }),
  setor: z.string().min(2, { message: "O setor é obrigatório." }),
  status: z.nativeEnum(ATTENDANT_STATUS),
  avatarUrl: z.any(),
  telefone: z.string().min(10, { message: "O telefone deve ter pelo menos 10 dígitos." }),
  portaria: z.string().optional(),
  situacao: z.string().optional(),
  dataAdmissao: z.date({ required_error: "A data de admissão é obrigatória." }),
  dataNascimento: z.date({ required_error: "A data de nascimento é obrigatória." }),
  rg: z.string().min(5, { message: "O RG é obrigatório." }),
  cpf: z.string().min(11, { message: "O CPF é obrigatório." }),
});

const defaultFormValues = {
  name: "",
  email: "",
  funcao: "",
  setor: "",
  status: ATTENDANT_STATUS.ACTIVE,
  avatarUrl: "",
  telefone: "",
  portaria: "",
  situacao: "",
  rg: "",
  cpf: "",
  dataAdmissao: undefined,
  dataNascimento: undefined,
}

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function AtendentesPage() {
  const { user, isAuthenticated, loading, attendants, addAttendant, updateAttendant, deleteAttendant } = useAuth();
  const router = useRouter();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isFormDialogOpen) {
      if (selectedAttendant) {
        form.reset({
          ...selectedAttendant,
          avatarUrl: null, // Clear file input on open
          dataAdmissao: new Date(selectedAttendant.dataAdmissao),
          dataNascimento: new Date(selectedAttendant.dataNascimento),
        });
        setAvatarPreview(selectedAttendant.avatarUrl);
      } else {
        form.reset(defaultFormValues);
        setAvatarPreview(null);
      }
    }
  }, [isFormDialogOpen, selectedAttendant, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let avatarUrl = selectedAttendant?.avatarUrl || "";
      if (values.avatarUrl && values.avatarUrl[0]) {
          avatarUrl = await fileToDataUrl(values.avatarUrl[0]);
      }
        
      const dataToSave = {
          ...values,
          avatarUrl,
          dataAdmissao: values.dataAdmissao.toISOString(),
          dataNascimento: values.dataNascimento.toISOString(),
      }

      if (selectedAttendant) {
        await updateAttendant(selectedAttendant.id, dataToSave);
      } else {
        await addAttendant(dataToSave);
      }
      setIsFormDialogOpen(false);
      setSelectedAttendant(null);
      setAvatarPreview(null);
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
    setIsFormDialogOpen(true);
  };

  const handleAddClick = () => {
    setSelectedAttendant(null);
    setIsFormDialogOpen(true);
  }

  const handleDeleteClick = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsDeleteDialogOpen(true);
  };

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }
  
  const sortedAttendants = [...attendants].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Gerenciamento de Atendentes</h1>
            <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atendente</Button>
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
                            <TableHead>Função</TableHead>
                            <TableHead>Setor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAttendants.map((att) => (
                            <TableRow key={att.id}>
                                <TableCell className="font-medium flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={att.avatarUrl} alt={att.name}/>
                                        <AvatarFallback><UserCircle /></AvatarFallback>
                                    </Avatar>
                                    {att.name}
                                </TableCell>
                                <TableCell>{att.funcao}</TableCell>
                                <TableCell>{att.setor}</TableCell>
                                <TableCell>
                                    <Badge variant={att.status === 'Ativo' ? "secondary" : "outline"}>
                                        {att.status}
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

        {/* Add/Edit Dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>{selectedAttendant ? 'Editar Atendente' : 'Adicionar Novo Atendente'}</DialogTitle>
                    <DialogDescription>
                      {selectedAttendant ? 'Altere as informações do atendente.' : 'Preencha os dados do novo atendente.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6 pl-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="telefone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="funcao" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Função</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="setor" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Setor</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.values(ATTENDANT_STATUS).map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name="cpf" render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="rg" render={({ field }) => (
                          <FormItem>
                            <FormLabel>RG</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                          <FormItem className="flex flex-col pt-2">
                            <FormLabel>Data de Nascimento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "dd/MM/yyyy")) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="dataAdmissao" render={({ field }) => (
                          <FormItem className="flex flex-col pt-2">
                            <FormLabel>Data de Admissão</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? (format(field.value, "dd/MM/yyyy")) : (<span>Escolha uma data</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="situacao" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Situação</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="portaria" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Informações de Portaria</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                         <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                          <FormItem className="md:col-span-1 lg:col-span-3">
                             <FormLabel>Avatar</FormLabel>
                             <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={avatarPreview ?? undefined} />
                                    <AvatarFallback><UserCircle className="h-10 w-10" /></AvatarFallback>
                                </Avatar>
                                <FormControl>
                                  <Input 
                                      type="file" 
                                      accept="image/*"
                                      className="max-w-xs"
                                      onChange={(e) => {
                                          field.onChange(e.target.files);
                                          if (e.target.files && e.target.files[0]) {
                                              const file = e.target.files[0];
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                  setAvatarPreview(reader.result as string);
                                              };
                                              reader.readAsDataURL(file);
                                          }
                                      }}
                                  />
                                </FormControl>
                             </div>
                            <FormDescription>
                                {selectedAttendant ? "Faça upload de uma nova foto para alterar o avatar." : "Faça upload da foto do atendente."}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                        <DialogFooter className="pt-8">
                            <Button type="button" variant="secondary" onClick={() => setIsFormDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Atendente'}
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

    