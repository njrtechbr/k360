
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ROLES } from "@/lib/types";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

export default function CreateSuperAdminPage() {
  const { register, hasSuperAdmin, loading } = useAuth();
  const [superAdminExists, setSuperAdminExists] = useState(true); // Default to true to prevent flash
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      hasSuperAdmin().then(exists => {
        setSuperAdminExists(exists);
        setChecking(false);
      });
    }
  }, [loading, hasSuperAdmin]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Superadmin gets all modules by default
      await register({ ...values, role: ROLES.SUPERADMIN, modules: [] });
    } catch (error) {
      // Toast handled in auth provider
    }
  }

  if (checking) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <p>Verificando...</p>
          </div>
      )
  }

  if (superAdminExists) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4">
             <Alert variant="destructive" className="max-w-md">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Acesso Negado</AlertTitle>
                <AlertDescription>
                    Um Super Admin já existe no sistema. Esta página é apenas para a configuração inicial.
                    <Button asChild className="mt-4 w-full">
                        <Link href="/login">Ir para Login</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    )
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl animate-in fade-in zoom-in-95">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Criar Super Admin</CardTitle>
          <CardDescription>Crie o primeiro usuário com acesso total ao sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Super Admin</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Criando...' : 'Criar Super Admin'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
