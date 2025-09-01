
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
import { Star, TrendingDown, TrendingUp, Percent } from "lucide-react";
import { ROLES } from "@/lib/types";

const formSchema = z.object({
  '5': z.coerce.number(),
  '4': z.coerce.number(),
  '3': z.coerce.number(),
  '2': z.coerce.number(),
  '1': z.coerce.number(),
  globalXpMultiplier: z.coerce.number().min(0, "O multiplicador não pode ser negativo.").default(1),
});

export default function GamificacaoPontosPage() {
  const { user, isAuthenticated, loading, gamificationConfig, updateGamificationConfig } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...gamificationConfig.ratingScores,
      globalXpMultiplier: gamificationConfig.globalXpMultiplier || 1,
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
      globalXpMultiplier: gamificationConfig.globalXpMultiplier || 1,
    });
  }, [gamificationConfig, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { globalXpMultiplier, ...ratingScores } = values;
      await updateGamificationConfig({ ratingScores, globalXpMultiplier });
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
        <h1 className="text-3xl font-bold">Pontos e Multiplicadores</h1>
        <p className="text-muted-foreground">
          Defina o XP base por avaliação e ajuste multiplicadores globais para eventos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Multiplicador de XP Global</CardTitle>
          <CardDescription>
            Este fator se aplica a todos os pontos de avaliação, em conjunto com multiplicadores de temporada.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
               <FormField control={form.control} name="globalXpMultiplier" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Fator Multiplicador</FormLabel>
                      <div className="flex items-center gap-2">
                         <FormControl><Input type="number" step="0.1" className="w-28" {...field} /></FormControl>
                         <Percent className="h-4 w-4 text-muted-foreground" />
                      </div>
                       <FormDescription>
                          Use 1 para nenhum bônus, 2 para XP em dobro, etc.
                       </FormDescription>
                      <FormMessage />
                  </FormItem>
              )} />
            </CardContent>
             <CardHeader className="pt-0">
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
                         {field.value >= 0 ? <TrendingUp className="text-green-500" /> : <TrendingDown className="text-red-500" />}
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
          </form>
        </Form>
      </Card>
    </div>
  );
}
