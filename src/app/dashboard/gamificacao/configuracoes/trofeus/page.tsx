"use client";

import { useAuth } from "@/hooks/useAuth";
import { useGamificationData } from "@/hooks/useGamificationData";
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
import { ROLES, type Achievement } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Pencil, Award, BarChart, BadgeCent, Crown, Sparkles, Target, Trophy, Zap, Rocket, StarHalf, Users, Smile, HeartHandshake, Gem, Medal, MessageSquareQuote, MessageSquarePlus, MessageSquareHeart, MessageSquareWarning, TrendingUp, ShieldCheck, Star, Component, Braces, UserCheck, BookOpen, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

// Mapeamento de ícones para achievements
const iconMap: Record<string, any> = {
    Award, BarChart, BadgeCent, Crown, Sparkles, Target, Trophy, Zap, Rocket, StarHalf, Users, Smile, HeartHandshake, Gem, Medal, MessageSquareQuote, MessageSquarePlus, MessageSquareHeart, MessageSquareWarning, TrendingUp, ShieldCheck, Star, Component, Braces, UserCheck, BookOpen
};

const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Trophy; // Trophy como fallback
};

const formSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  xp: z.coerce.number().min(0, "O XP não pode ser negativo."),
  active: z.boolean(),
});

export default function ConfigurarTrofeusPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const { achievements, updateAchievement, isLoading: gamificationLoading, refreshData } = useGamificationData();
    const router = useRouter();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { title: "", description: "", xp: 0, active: true },
    });

    useEffect(() => {
        if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, loading, router, user]);

    useEffect(() => {
        if (selectedAchievement) {
            form.reset(selectedAchievement);
        }
    }, [selectedAchievement, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!selectedAchievement) return;
        try {
            await updateAchievement(selectedAchievement.id, values);
            setIsEditDialogOpen(false);
            setSelectedAchievement(null);
        } catch (error) { /* toast handled */ }
    }

    const handleEditClick = (achievement: Achievement) => {
        setSelectedAchievement(achievement);
        setIsEditDialogOpen(true);
    };

    if (loading || gamificationLoading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const sortedAchievements = Array.isArray(achievements) ? [...achievements].sort((a, b) => a.xp - b.xp) : [];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Configurar Troféus (Conquistas)</h1>
                <p className="text-muted-foreground">
                    Gerencie os troféus que os atendentes podem desbloquear para ganhar XP bônus.
                </p>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Troféus Disponíveis</CardTitle>
                            <CardDescription>Ative, desative e edite o nome, descrição e XP de cada troféu.</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshData}
                            disabled={gamificationLoading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${gamificationLoading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ícone</TableHead>
                                <TableHead>Título</TableHead>
                                <TableHead>XP Concedido</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedAchievements.map((ach) => (
                                <TableRow key={ach.id}>
                                    <TableCell>
                                        <div className={`p-2 bg-muted rounded-full w-fit ${ach.color}`}>
                                            {React.createElement(getIconComponent(ach.icon), { className: "h-5 w-5" })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{ach.title}</p>
                                        <p className="text-xs text-muted-foreground">{ach.description}</p>
                                    </TableCell>
                                    <TableCell className="font-bold text-green-600">+{ach.xp} XP</TableCell>
                                    <TableCell>{ach.active ? "Ativo" : "Inativo"}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(ach)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
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

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Troféu</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título do Troféu</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="xp" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>XP Concedido</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="active" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Status</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            {field.value ? "Este troféu está ativo e pode ser desbloqueado." : "Este troféu está inativo."}
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />
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
        </div>
    );
}
