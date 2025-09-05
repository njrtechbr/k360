"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Power, Star, Award, Target, Zap, Heart, Trophy } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";

// Schema de validação para o formulário
const XpTypeFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição deve ter no máximo 500 caracteres"),
  points: z.number().min(1, "Pontos devem ser positivos").max(1000, "Pontos devem ser no máximo 1000"),
  category: z.string().default("general"),
  icon: z.string().default("star"),
  color: z.string().default("#3B82F6")
});

type XpTypeFormData = z.infer<typeof XpTypeFormSchema>;

export interface XpTypeConfig {
  id: string;
  name: string;
  description: string;
  points: number;
  active: boolean;
  category: string;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    xpGrants: number;
  };
}

// Opções de ícones disponíveis
const iconOptions = [
  { value: "star", label: "Estrela", icon: Star },
  { value: "award", label: "Prêmio", icon: Award },
  { value: "target", label: "Alvo", icon: Target },
  { value: "zap", label: "Raio", icon: Zap },
  { value: "heart", label: "Coração", icon: Heart },
  { value: "trophy", label: "Troféu", icon: Trophy }
];

// Opções de categorias
const categoryOptions = [
  { value: "general", label: "Geral" },
  { value: "performance", label: "Performance" },
  { value: "behavior", label: "Comportamento" },
  { value: "initiative", label: "Iniciativa" },
  { value: "teamwork", label: "Trabalho em Equipe" },
  { value: "excellence", label: "Excelência" }
];

// Opções de cores
const colorOptions = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#F97316", label: "Laranja" }
];

interface XpTypeManagerProps {
  userId?: string;
}

export function XpTypeManager({ userId }: XpTypeManagerProps) {
  const [xpTypes, setXpTypes] = useState<XpTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<XpTypeConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<XpTypeFormData>({
    resolver: zodResolver(XpTypeFormSchema),
    mode: "onChange", // Validação em tempo real
    defaultValues: {
      name: "",
      description: "",
      points: 10,
      category: "general",
      icon: "star",
      color: "#3B82F6"
    }
  });

  useEffect(() => {
    fetchXpTypes();
  }, []);

  const fetchXpTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/gamification/xp-types');
      
      if (response.ok) {
        const data = await response.json();
        setXpTypes(data);
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar tipos de XP",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar tipos de XP:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tipos de XP",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateType = () => {
    setEditingType(null);
    form.reset({
      name: "",
      description: "",
      points: 10,
      category: "general",
      icon: "star",
      color: "#3B82F6"
    });
    setIsDialogOpen(true);
  };

  const handleEditType = (type: XpTypeConfig) => {
    setEditingType(type);
    form.reset({
      name: type.name,
      description: type.description,
      points: type.points,
      category: type.category,
      icon: type.icon,
      color: type.color
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: XpTypeFormData) => {
    try {
      setIsSubmitting(true);
      
      const payload = {
        ...data,
        createdBy: userId
      };

      let response;
      if (editingType) {
        // Atualizar tipo existente
        response = await fetch(`/api/gamification/xp-types/${editingType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        // Criar novo tipo
        response = await fetch('/api/gamification/xp-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: editingType ? "Tipo de XP atualizado com sucesso" : "Tipo de XP criado com sucesso"
        });
        
        setIsDialogOpen(false);
        fetchXpTypes();
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao salvar tipo de XP",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao salvar tipo de XP:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar tipo de XP",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (type: XpTypeConfig) => {
    try {
      const response = await fetch(`/api/gamification/xp-types/${type.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Tipo de XP ${type.active ? 'desativado' : 'ativado'} com sucesso`
        });
        fetchXpTypes();
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao alterar status do tipo de XP",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do tipo de XP",
        variant: "destructive"
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Star;
  };

  const getCategoryLabel = (category: string) => {
    const categoryOption = categoryOptions.find(opt => opt.value === category);
    return categoryOption ? categoryOption.label : category;
  };

  // Definição das colunas da DataTable
  const columns: ColumnDef<XpTypeConfig>[] = [
    {
      accessorKey: "name",
      header: "Tipo",
      cell: ({ row }) => {
        const type = row.original;
        const IconComponent = getIconComponent(type.icon);
        return (
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: `${type.color}20`,
                color: type.color
              }}
            >
              <IconComponent size={16} />
            </div>
            <div>
              <p className="font-medium">{type.name}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                {type.description}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => (
        <Badge variant="outline">
          {getCategoryLabel(row.original.category)}
        </Badge>
      )
    },
    {
      accessorKey: "points",
      header: "Pontos",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.points} XP
        </Badge>
      )
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Ativo" : "Inativo"}
        </Badge>
      )
    },
    {
      accessorKey: "_count.xpGrants",
      header: "Concessões",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original._count?.xpGrants || 0} concessões
        </span>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      )
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const type = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditType(type)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={type.active ? "destructive" : "default"}
              onClick={() => handleToggleStatus(type)}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Star size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Tipos</p>
                <p className="text-2xl font-bold">{xpTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Power size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipos Ativos</p>
                <p className="text-2xl font-bold">{xpTypes.filter(t => t.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos Médios</p>
                <p className="text-2xl font-bold">
                  {xpTypes.length > 0 
                    ? Math.round(xpTypes.reduce((sum, t) => sum + t.points, 0) / xpTypes.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concessões Totais</p>
                <p className="text-2xl font-bold">
                  {xpTypes.reduce((sum, t) => sum + (t._count?.xpGrants || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cabeçalho com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tipos de XP Configurados</h2>
          <p className="text-muted-foreground">
            Gerencie os tipos de XP que podem ser concedidos manualmente aos atendentes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateType} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Editar Tipo de XP' : 'Criar Novo Tipo de XP'}
              </DialogTitle>
              <DialogDescription>
                {editingType 
                  ? 'Atualize as informações do tipo de XP avulso'
                  : 'Configure um novo tipo de XP que pode ser concedido manualmente aos atendentes'
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Excelência no Atendimento" 
                            {...field}
                            maxLength={100}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pontos *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            max="1000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva quando este tipo de XP deve ser concedido..."
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ícone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um ícone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {iconOptions.map((option) => {
                              const IconComponent = option.icon;
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma cor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {colorOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: option.value }}
                                  />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : (editingType ? 'Atualizar' : 'Criar')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* DataTable */}
      <Card>
        <CardContent className="p-6">
          {xpTypes.length > 0 ? (
            <DataTable
              columns={columns}
              data={xpTypes}
              searchKey="name"
              searchPlaceholder="Buscar tipos de XP..."
              isLoading={isLoading}
            />
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum tipo de XP configurado</h3>
              <p className="text-muted-foreground mb-4">
                Crie o primeiro tipo de XP avulso para começar a conceder pontos manualmente.
              </p>
              <Button onClick={handleCreateType}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Tipo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}