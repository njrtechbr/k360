"use client";

import { useAuth } from "@/hooks/useAuth";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  password: z
    .string()
    .optional()
    .refine((val) => val === "" || !val || val.length >= 6, {
      message: "A nova senha deve ter pelo menos 6 caracteres.",
    }),
});

export default function ProfilePage() {
  const { user, isAuthenticated, loading, updateProfile, logout } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
    if (user) {
      form.reset({
        name: user.name,
        password: "",
      });
    }
  }, [isAuthenticated, loading, router, user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToUpdate: { name: string; password?: string } = {
      name: values.name,
    };
    if (values.password) {
      dataToUpdate.password = values.password;
    }
    try {
      await updateProfile(dataToUpdate);
      form.reset({ ...form.getValues(), password: "" });
    } catch (error) {
      // toast is handled in auth provider
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Perfil do Usuário
          </CardTitle>
          <CardDescription>
            Veja e edite suas informações pessoais.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Nível de Acesso</p>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
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
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Deixe em branco para não alterar"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Salvando..."
                  : "Salvar Alterações"}
              </Button>
              <Button variant="destructive" onClick={logout}>
                Sair
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
