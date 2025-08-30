
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ROLES, type GamificationSeason } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Pencil, PlusCircle, Trash2, CalendarIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  dateRange: z.object({
    from: z.date({ required_error: "A data de início é obrigatória." }),
    to: z.date({ required_error: "A data de término é obrigatória." }),
  }),
  active: z.boolean(),
});

export default function ConfigurarSessoesPage() {
    const { user, isAuthenticated, loading, seasons, addSeason, updateSeason, deleteSeason } = useAuth();
    const router = useRouter();

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<GamificationSeason | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, loading, router, user]);

    useEffect(() => {
        if (selectedSeason) {
            form.reset({
                name: selectedSeason.name,
                active: selectedSeason.active,
                dateRange: {
                    from: new Date(selectedSeason.startDate),
                    to: new Date(selectedSeason.endDate),
                }
            });
        } else {
            form.reset({
                name: "",
                active: true,
                dateRange: { from: new Date(), to: addDays(new Date(), 30) },
            });
        }
    }, [selectedSeason, form]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        const seasonData = {
            name: values.name,
            active: values.active,
            startDate: values.dateRange.from.toISOString(),
            endDate: values.dateRange.to.toISOString(),
        }
        try {
            if (selectedSeason) {
                await updateSeason(selectedSeason.id, seasonData);
            } else {
                await addSeason(seasonData);
            }
            setIsFormDialogOpen(false);
            setSelectedSeason(null);
        } catch (error) { /* toast handled */ }
    }

    const handleEditClick = (season: GamificationSeason) => {
        setSelectedSeason(season);
        setIsFormDialogOpen(true);
    };

    const handleAddClick = () => {
        setSelectedSeason(null);
        setIsFormDialogOpen(true);
    }
    
    const handleDeleteClick = (season: GamificationSeason) => {
        setSelectedSeason(season);
        setIsDeleteDialogOpen(true);
    };
    
    async function onDeleteConfirm() {
        if (!selectedSeason) return;
        try {
            await deleteSeason(selectedSeason.id);
            setIsDeleteDialogOpen(false);
            setSelectedSeason(null);
        } catch(error) { /* toast handled */ }
    }

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const sortedSeasons = [...seasons].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Configurar Sessões (Temporadas)</h1>
                    <p className="text-muted-foreground">
                        Gerencie os períodos de competição do sistema de gamificação.
                    </p>
                </div>
                 <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Sessão</Button>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Sessões Criadas</CardTitle>
                    <CardDescription>Ative, desative e edite o nome e a duração de cada sessão.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Período de Validade</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedSeasons.map((season) => (
                                <TableRow key={season.id}>
                                    <TableCell className="font-medium">{season.name}</TableCell>
                                    <TableCell>{format(new Date(season.startDate), 'dd/MM/yy')} - {format(new Date(season.endDate), 'dd/MM/yy')}</TableCell>
                                    <TableCell>
                                         <Badge variant={season.active ? "secondary" : "destructive"}>
                                            {season.active ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(season)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(season)}>
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

            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedSeason ? "Editar Sessão" : "Criar Nova Sessão"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Sessão</FormLabel>
                                    <FormControl><Input placeholder="Ex: Temporada 3, Q4 2025" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                           <FormField control={form.control} name="dateRange" render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Período da Sessão</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn("justify-start text-left font-normal", !field.value?.from && "text-muted-foreground" )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value?.from ? (
                                        field.value.to ? (
                                            <>
                                            {format(field.value.from, "dd 'de' LLL, y", { locale: ptBR })} -{" "}
                                            {format(field.value.to, "dd 'de' LLL, y", { locale: ptBR })}
                                            </>
                                        ) : (
                                            format(field.value.from, "dd 'de' LLL, y", { locale: ptBR })
                                        )
                                        ) : (
                                        <span>Escolha um período</span>
                                        )}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={field.value?.from}
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        numberOfMonths={2}
                                        locale={ptBR}
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="active" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Status</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            {field.value ? "Esta sessão está ativa." : "Esta sessão está inativa."}
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
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
                           Esta ação não pode ser desfeita. Isso excluirá permanentemente a sessão de gamificação. 
                           Os dados de XP dos atendentes não serão afetados, mas a sessão será removida.
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

