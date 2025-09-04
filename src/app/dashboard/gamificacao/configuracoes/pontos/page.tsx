
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { ROLES } from "@/lib/types";

const formSchema = z.object({
  '5': z.coerce.number(),
  '4': z.coerce.number(),
  '3': z.coerce.number(),
  '2': z.coerce.number(),
  '1': z.coerce.number(),
});

export default function GamificacaoPontosPage() {
  const { user, isAuthenticated, loading, gamificationConfig, updateGamificationConfig } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...gamificationConfig.ratingScores,
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, user]);

  useEffect(() => {
    form.reset({
      ...gamificationConfig.ratingScores,
    });
  }, [gamificationConfig, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateGamificationConfig({ ratingScores: values });
    } catch (error) {
      // Toast handled in provider
    }
  }

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Pontos Base por Avaliação</h1>
        <p className="text-muted-foreground">
          Defina os valores de XP que são a base para o cálculo da pontuação, antes da aplicação de quaisquer multiplicadores.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader className="pt-0 mt-6">
                <CardTitle>Pontos de Experiência (XP) Base</CardTitle>
                <CardDescription>
                  Esses valores são a base para o cálculo da pontuação, antes dos multiplicadores.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[5, 4, 3, 2, 1].map((rating) => (
                <FormField
                  key={rating}
                  control={form.control}
                  name={String(rating) as "5" | "4" | "3" | "2" | "1"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-lg gap-2">
                        <Star className={`h-6 w-6 text-yellow-400 fill-yellow-400`} />
                        {rating} Estrela{rating > 1 ? 's' : ''}
                      </FormLabel>
                      <div className="flex items-center gap-2">
                         {Number(field.value) >= 0 ? <TrendingUp className="text-green-500" /> : <TrendingDown className="text-red-500" />}
                        <FormControl>
                          <Input type="number" className="w-24" {...field} />
                        </FormControl>
                        <span className="font-semibold">XP</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
