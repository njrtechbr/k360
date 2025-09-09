
"use client";

import { usePrisma } from "@/providers/PrismaProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Edit } from "lucide-react";
import { type GamificationSeason } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { ROLES } from "@/lib/types";

const formSchema = z.object({
  globalXpMultiplier: z.coerce.number().min(0, "O multiplicador não pode ser negativo.").default(1),
  seasons: z.array(z.object({
    id: z.string(),
    xpMultiplier: z.coerce.number().min(0, "O multiplicador não pode ser negativo.").default(1),
  })),
});

export default function GamificacaoMultiplicadoresPage() {
  const { data: session, status } = useSession();
  const { gamificationConfig, updateGamificationConfig, seasons, updateSeason, appLoading } = usePrisma();
  const router = useRouter();
  
  const user = session?.user;
  const isAuthenticated = !!session;
  const loading = status === "loading" || appLoading;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      globalXpMultiplier: gamificationConfig.data?.globalXpMultiplier || 1,
      seasons: seasons.data?.map(s => ({ id: s.id, xpMultiplier: s.xpMultiplier })) || [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "seasons",
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, user]);

  useEffect(() => {
    if (gamificationConfig.data && seasons.data) {
      form.reset({
        globalXpMultiplier: gamificationConfig.data.globalXpMultiplier || 1,
        seasons: seasons.data.map(s => ({ id: s.id, xpMultiplier: s.xpMultiplier })),
      });
    }
  }, [gamificationConfig.data, seasons.data, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateGamificationConfig({ globalXpMultiplier: values.globalXpMultiplier });
      
      const seasonUpdatePromises = values.seasons.map(seasonData => 
        updateSeason(seasonData.id, { xpMultiplier: seasonData.xpMultiplier })
      );
      await Promise.all(seasonUpdatePromises);

    } catch (error) {
      // Toast handled in provider
    }
  }

  const findSeasonInfo = (id: string) => seasons.find(s => s.id === id);

  if (loading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }
  
  const sortedSeasons = [...fields].sort((a, b) => {
    const seasonA = findSeasonInfo(a.id);
    const seasonB = findSeasonInfo(b.id);
    if (!seasonA || !seasonB) return 0;
    return new Date(seasonB.startDate).getTime() - new Date(seasonA.startDate).getTime();
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Multiplicadores de XP</h1>
        <p className="text-muted-foreground">
          Ajuste o multiplicador global e os multiplicadores de cada temporada.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicador de XP Global</CardTitle>
              <CardDescription>
                Este fator se aplica a todas as fontes de XP (avaliações e troféus), em conjunto com os multiplicadores de temporada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="globalXpMultiplier" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Fator Multiplicador</FormLabel>
                      <div className="flex items-center gap-2">
                         <FormControl><Input type="number" step="0.1" className="w-28" {...field} /></FormControl>
                         <X className="h-4 w-4 text-muted-foreground" />
                      </div>
                       <FormDescription>
                          Use 1 para nenhum bônus, 2 para XP em dobro, etc.
                       </FormDescription>
                      <FormMessage />
                  </FormItem>
              )} />
            </CardContent>
          </Card>
          
          <Card>
             <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Multiplicadores por Temporada</CardTitle>
                        <CardDescription>Defina um multiplicador específico para cada temporada. Ele será combinado com o global.</CardDescription>
                    </div>
                     <Button variant="outline" asChild>
                        <Link href="/dashboard/gamificacao/configuracoes/sessoes"><Edit className="mr-2 h-4 w-4"/> Gerenciar Sessões</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome da Temporada</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead className="w-[150px]">Multiplicador</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedSeasons.map((field, index) => {
                             const seasonInfo = findSeasonInfo(field.id);
                             if (!seasonInfo) return null;
                             const originalIndex = fields.findIndex(f => f.id === field.id);
                             return (
                                <TableRow key={field.id}>
                                    <TableCell className="font-medium">{seasonInfo.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={seasonInfo.active ? "secondary" : "destructive"}>
                                            {seasonInfo.active ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                       {format(new Date(seasonInfo.startDate), 'dd/MM/yy')} - {format(new Date(seasonInfo.endDate), 'dd/MM/yy')}
                                    </TableCell>
                                    <TableCell>
                                         <FormField
                                            control={form.control}
                                            name={`seasons.${originalIndex}.xpMultiplier`}
                                            render={({ field: seasonField }) => (
                                                <FormItem>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl>
                                                            <Input type="number" step="0.1" className="w-24" {...seasonField} />
                                                        </FormControl>
                                                        <X className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                     <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                </TableRow>
                             )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Todas as Alterações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
