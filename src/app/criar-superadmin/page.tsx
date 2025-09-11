"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z
    .string()
    .min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

export default function CreateSuperAdminPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [superAdminExists, setSuperAdminExists] = useState<boolean | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const response = await fetch("/api/superadmin/check");
        const data = await response.json();
        setSuperAdminExists(data.exists);
      } catch (error) {
        console.error("Erro ao verificar super admin:", error);
        setError("Erro ao verificar se já existe um super admin.");
      }
    };

    checkSuperAdmin();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar super admin");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setIsCreating(false);
    }
  };

  // Loading state
  if (isLoading || superAdminExists === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Verificando sistema...</span>
        </div>
      </div>
    );
  }

  // Super admin already exists
  if (superAdminExists) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4">
        <Card className="w-full max-w-md shadow-2xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Sistema Configurado
            </CardTitle>
            <CardDescription className="text-center">
              O super admin já foi criado. Faça login para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <Button onClick={() => router.push("/login")} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4">
        <Card className="w-full max-w-md shadow-2xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Super Admin Criado!
            </CardTitle>
            <CardDescription className="text-center">
              O super admin foi criado com sucesso. Redirecionando para o
              login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecionando...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl animate-in fade-in zoom-in-95">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Criar Super Admin
          </CardTitle>
          <CardDescription>
            Crie o primeiro usuário com acesso total ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Digite seu nome completo"
                {...form.register("name")}
                disabled={isCreating}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                {...form.register("email")}
                disabled={isCreating}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                {...form.register("password")}
                disabled={isCreating}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Super Admin"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
