"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Gift, Check, ChevronsUpDown, Star, Award, Target, Zap, Heart, Trophy, AlertCircle, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { triggerXpGrantedEvent } from "@/hooks/useXpNotifications";
import { triggerXpAvulsoNotification } from "@/components/gamification/notifications/XpAvulsoNotification";
import { triggerXpAvulsoAdminNotification } from "@/components/gamification/notifications/XpAvulsoToast";

// Schema de validação para o formulário
const XpGrantFormSchema = z.object({
  attendantId: z.string().min(1, "Atendente é obrigatório"),
  typeId: z.string().min(1, "Tipo de XP é obrigatório"),
  justification: z.string().optional()
});

type XpGrantFormData = z.infer<typeof XpGrantFormSchema>;

// Interfaces
export interface Attendant {
  id: string;
  name: string;
  email: string;
  funcao: string;
  setor: string;
  status: string;
}

export interface XpTypeConfig {
  id: string;
  name: string;
  description: string;
  points: number;
  active: boolean;
  category: string;
  icon: string;
  color: string;
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

interface XpGrantInterfaceProps {
  userId?: string;
  onGrantSuccess?: () => void;
  disabled?: boolean;
  remainingPoints?: number;
}

export function XpGrantInterface({ userId, onGrantSuccess, disabled = false, remainingPoints }: XpGrantInterfaceProps) {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [xpTypes, setXpTypes] = useState<XpTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
  const [selectedXpType, setSelectedXpType] = useState<XpTypeConfig | null>(null);
  const [attendantSearchOpen, setAttendantSearchOpen] = useState(false);
  const [attendantSearchValue, setAttendantSearchValue] = useState("");

  const form = useForm<XpGrantFormData>({
    resolver: zodResolver(XpGrantFormSchema),
    defaultValues: {
      attendantId: "",
      typeId: "",
      justification: ""
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar atendentes e tipos de XP em paralelo
      const [attendantsResponse, xpTypesResponse] = await Promise.all([
        fetch('/api/attendants'),
        fetch('/api/gamification/xp-types')
      ]);

      if (attendantsResponse.ok) {
        const attendantsData = await attendantsResponse.json();
        // Filtrar apenas atendentes ativos
        const activeAttendants = attendantsData.filter((a: Attendant) => a.status === 'Ativo');
        setAttendants(activeAttendants);
      }

      if (xpTypesResponse.ok) {
        const xpTypesData = await xpTypesResponse.json();
        // Filtrar apenas tipos ativos
        const activeXpTypes = xpTypesData.filter((type: XpTypeConfig) => type.active);
        setXpTypes(activeXpTypes);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados necessários",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Star;
  };

  const handleAttendantSelect = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    form.setValue("attendantId", attendant.id);
    setAttendantSearchOpen(false);
    setAttendantSearchValue(attendant.name);
  };

  const handleXpTypeSelect = (typeId: string) => {
    const xpType = xpTypes.find(t => t.id === typeId);
    setSelectedXpType(xpType || null);
    form.setValue("typeId", typeId);
  };

  const handleSubmit = (data: XpGrantFormData) => {
    // Atualizar dados selecionados
    const attendant = attendants.find(a => a.id === data.attendantId);
    const xpType = xpTypes.find(t => t.id === data.typeId);
    
    setSelectedAttendant(attendant || null);
    setSelectedXpType(xpType || null);
    setShowConfirmDialog(true);
  };

  const confirmGrant = async () => {
    try {
      setIsSubmitting(true);
      
      const formData = form.getValues();
      const payload = {
        ...formData,
        grantedBy: userId
      };

      const response = await fetch('/api/gamification/xp-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Sucesso!",
          description: `XP concedido com sucesso para ${selectedAttendant?.name}`,
          action: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">+{selectedXpType?.points} XP</span>
            </div>
          )
        });

        // Disparar notificações usando os dados retornados pela API
        if (result.data?.notification) {
          const notificationData = result.data.notification;
          
          // Disparar notificação administrativa (para o admin que concedeu)
          triggerXpAvulsoAdminNotification({
            xpAmount: notificationData.xpAmount,
            typeName: notificationData.typeName,
            justification: notificationData.justification,
            levelUp: notificationData.levelUp,
            achievementsUnlocked: notificationData.achievementsUnlocked,
            attendantName: selectedAttendant?.name
          });

          // Disparar notificação específica de XP avulso (para o atendente)
          triggerXpAvulsoNotification({
            xpAmount: notificationData.xpAmount,
            typeName: notificationData.typeName,
            justification: notificationData.justification,
            levelUp: notificationData.levelUp,
            achievementsUnlocked: notificationData.achievementsUnlocked
          });

          // Disparar evento genérico para compatibilidade
          triggerXpGrantedEvent({
            attendantId: selectedAttendant!.id,
            xpAmount: notificationData.xpAmount,
            typeName: notificationData.typeName,
            justification: notificationData.justification,
            achievementsUnlocked: notificationData.achievementsUnlocked
          });
        } else {
          // Fallback para notificação básica se não houver dados específicos
          if (selectedAttendant && selectedXpType) {
            triggerXpAvulsoNotification({
              xpAmount: selectedXpType.points,
              typeName: selectedXpType.name,
              justification: formData.justification
            });

            triggerXpAvulsoAdminNotification({
              xpAmount: selectedXpType.points,
              typeName: selectedXpType.name,
              justification: formData.justification,
              attendantName: selectedAttendant.name
            });
          }
        }
        
        // Reset form
        form.reset();
        setSelectedAttendant(null);
        setSelectedXpType(null);
        setAttendantSearchValue("");
        setShowConfirmDialog(false);
        
        // Callback de sucesso
        onGrantSuccess?.();
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.error || "Erro ao conceder XP",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao conceder XP:', error);
      toast({
        title: "Erro",
        description: "Erro ao conceder XP",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAttendants = attendants.filter(attendant =>
    attendant.name.toLowerCase().includes(attendantSearchValue.toLowerCase()) ||
    attendant.email.toLowerCase().includes(attendantSearchValue.toLowerCase()) ||
    attendant.funcao.toLowerCase().includes(attendantSearchValue.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={disabled ? "opacity-60" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Conceder XP Avulso
            {disabled && (
              <Badge variant="destructive" className="ml-2">
                Indisponível
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {disabled 
              ? "A concessão de XP está temporariamente indisponível devido ao limite diário atingido."
              : "Conceda pontos de experiência extras para reconhecer ações e comportamentos excepcionais dos atendentes"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Seletor de Atendente */}
              <FormField
                control={form.control}
                name="attendantId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Atendente *</FormLabel>
                    <Popover open={attendantSearchOpen} onOpenChange={setAttendantSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={attendantSearchOpen}
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedAttendant ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {selectedAttendant.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium">{selectedAttendant.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {selectedAttendant.funcao} - {selectedAttendant.setor}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              "Selecione um atendente..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar atendente..." 
                            value={attendantSearchValue}
                            onValueChange={setAttendantSearchValue}
                          />
                          <CommandEmpty>Nenhum atendente encontrado.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {filteredAttendants.map((attendant) => (
                              <CommandItem
                                key={attendant.id}
                                value={attendant.name}
                                onSelect={() => handleAttendantSelect(attendant)}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-medium">
                                      {attendant.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{attendant.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {attendant.funcao} - {attendant.setor}
                                    </p>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      selectedAttendant?.id === attendant.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Seletor de Tipo de XP */}
              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de XP *</FormLabel>
                    <Select onValueChange={handleXpTypeSelect} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de XP..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {xpTypes.map((xpType) => {
                          const IconComponent = getIconComponent(xpType.icon);
                          return (
                            <SelectItem key={xpType.id} value={xpType.id}>
                              <div className="flex items-center gap-3 w-full">
                                <div 
                                  className="p-2 rounded-lg"
                                  style={{ 
                                    backgroundColor: `${xpType.color}20`,
                                    color: xpType.color
                                  }}
                                >
                                  <IconComponent size={16} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{xpType.name}</span>
                                    <Badge variant="secondary">+{xpType.points} XP</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                    {xpType.description}
                                  </p>
                                </div>
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

              {/* Preview do Tipo Selecionado */}
              {selectedXpType && (
                <div className={`p-4 border rounded-lg ${
                  remainingPoints !== undefined && selectedXpType.points > remainingPoints
                    ? 'bg-red-50 border-red-200'
                    : 'bg-muted/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ 
                        backgroundColor: `${selectedXpType.color}20`,
                        color: selectedXpType.color
                      }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(selectedXpType.icon);
                        return <IconComponent size={20} />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{selectedXpType.name}</h4>
                        <Badge variant="default">+{selectedXpType.points} XP</Badge>
                        {remainingPoints !== undefined && selectedXpType.points > remainingPoints && (
                          <Badge variant="destructive">Pontos Insuficientes</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedXpType.description}
                      </p>
                      {remainingPoints !== undefined && selectedXpType.points > remainingPoints && (
                        <p className="text-sm text-red-600 mt-1">
                          Este tipo requer {selectedXpType.points} pontos, mas você tem apenas {remainingPoints} restantes hoje.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Campo de Justificativa */}
              <FormField
                control={form.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificativa (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o motivo da concessão deste XP..."
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Adicione uma justificativa para facilitar a auditoria e o acompanhamento
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botão de Submissão */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={disabled || !selectedAttendant || !selectedXpType || (remainingPoints !== undefined && selectedXpType && selectedXpType.points > remainingPoints)}
                  className="flex items-center gap-2"
                >
                  <Gift className="h-4 w-4" />
                  {disabled ? "Limite Atingido" : "Conceder XP"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Concessão de XP
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Você está prestes a conceder XP avulso. Confirme os detalhes:</p>
                
                {selectedAttendant && (
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-medium">
                          {selectedAttendant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{selectedAttendant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedAttendant.funcao} - {selectedAttendant.setor}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedXpType && (
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ 
                          backgroundColor: `${selectedXpType.color}20`,
                          color: selectedXpType.color
                        }}
                      >
                        {(() => {
                          const IconComponent = getIconComponent(selectedXpType.icon);
                          return <IconComponent size={16} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{selectedXpType.name}</span>
                          <Badge variant="default">+{selectedXpType.points} XP</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedXpType.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {form.getValues("justification") && (
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">Justificativa:</p>
                    <p className="text-sm text-muted-foreground">
                      {form.getValues("justification")}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmGrant}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Concedendo...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirmar Concessão
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}