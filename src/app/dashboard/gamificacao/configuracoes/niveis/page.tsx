"use client";

import { useSession } from "next-auth/react";
import { useApi } from "@/providers/ApiProvider";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLES, type LevelReward } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import {
  MoreHorizontal,
  Pencil,
  Trophy,
  Star,
  Crown,
  Award,
  Medal,
  Target,
  Zap,
  Gem,
  Shield,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<any>> = {
  Trophy,
  Star,
  Crown,
  Award,
  Medal,
  Target,
  Zap,
  Gem,
  Shield,
};

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || Trophy; // Trophy como fallback
};

const formSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z
    .string()
    .min(10, "A descrição deve ter pelo menos 10 caracteres."),
  active: z.boolean(),
});

export default function ConfigurarNiveisPage() {
  const { data: session, status } = useSession();
  const { levelRewards, updateLevelReward, isAnyLoading } = useApi();
  const router = useRouter();

  const user = session?.user;
  const isAuthenticated = !!session;
  const loading = status === "loading" || isAnyLoading;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<LevelReward | null>(
    null,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", active: true },
  });

  useEffect(() => {
    if (
      !loading &&
      (!isAuthenticated ||
        (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))
    ) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router, user]);

  useEffect(() => {
    if (selectedReward) {
      form.reset(selectedReward);
    }
  }, [selectedReward, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedReward) return;
    try {
      await updateLevelReward(selectedReward.level, values);
      setIsEditDialogOpen(false);
      setSelectedReward(null);
    } catch (error) {
      /* toast handled */
    }
  }

  const handleEditClick = (reward: LevelReward) => {
    setSelectedReward(reward);
    setIsEditDialogOpen(true);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  const sortedRewards = [...levelRewards].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurar Trilha de Níveis</h1>
        <p className="text-muted-foreground">
          Edite as recompensas desbloqueadas em cada nível da jornada de
          gamificação.
        </p>
      </div>

      {/* Link para Escala de Níveis */}
      <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Visualizar Escala de Níveis
                </h3>
                <p className="text-sm text-muted-foreground">
                  Veja a tabela completa de XP necessário para cada nível e
                  estatísticas do sistema
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/gamificacao/configuracoes/escala-niveis">
                Ver Escala Completa
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recompensas por Nível</CardTitle>
              <CardDescription>
                Ative, desative e edite as recompensas para cada marco de nível.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nível</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRewards.map((reward) => (
                <TableRow key={reward.level}>
                  <TableCell className="font-bold">{reward.level}</TableCell>
                  <TableCell>
                    <div
                      className={`p-2 bg-muted rounded-full w-fit ${reward.color}`}
                    >
                      {React.createElement(getIconComponent(reward.icon), {
                        className: "h-5 w-5",
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{reward.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {reward.description}
                    </p>
                  </TableCell>
                  <TableCell>{reward.active ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditClick(reward)}
                        >
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
            <DialogTitle>
              Editar Recompensa do Nível {selectedReward?.level}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Recompensa</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {field.value
                          ? "Esta recompensa está ativa e aparecerá na trilha."
                          : "Esta recompensa está inativa."}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Salvando..."
                    : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
