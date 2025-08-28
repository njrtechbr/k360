
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome do módulo deve ter pelo menos 3 caracteres." }),
  description: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres." }),
});

export default function ModulosPage() {
  const { user, isAuthenticated, loading, modules, addModule } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, user]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await addModule(values);
      form.reset();
    } catch (error) {
        // toast is handled in auth provider
    }
  }

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Gerenciamento de Módulos</h1>
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card className="shadow-lg">
                <CardHeader>
                <CardTitle>Adicionar Novo Módulo</CardTitle>
                <CardDescription>Crie um novo módulo para atribuir aos usuários.</CardDescription>
                </CardHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Módulo</FormLabel>
                            <FormControl>
                            <Input placeholder="Ex: Contabilidade" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                            <Textarea placeholder="Descreva o que este módulo faz." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Adicionando...' : 'Adicionar Módulo'}
                    </Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Módulos Existentes</CardTitle>
                    <CardDescription>Lista de todos os módulos cadastrados no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Descrição</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modules.map((mod) => (
                                <TableRow key={mod.id}>
                                    <TableCell className="font-medium capitalize">{mod.name}</TableCell>
                                    <TableCell>{mod.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
