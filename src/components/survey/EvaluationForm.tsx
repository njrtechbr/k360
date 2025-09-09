"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, User, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataValidator } from '@/components/ui/data-validator';
import type { Attendant } from '@/lib/types';

export interface EvaluationFormProps {
  attendants: Attendant[];
  onSubmit: (data: {
    attendantId: string;
    nota: number;
    comentario: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: {
    attendantId?: string;
    nota?: number;
    comentario?: string;
  };
}

export function EvaluationForm({
  attendants,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData
}: EvaluationFormProps) {
  const [formData, setFormData] = useState({
    attendantId: initialData?.attendantId || '',
    nota: initialData?.nota || 0,
    comentario: initialData?.comentario || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validação do formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.attendantId) {
      newErrors.attendantId = 'Selecione um atendente';
    }

    if (formData.nota < 1 || formData.nota > 5) {
      newErrors.nota = 'A nota deve ser entre 1 e 5 estrelas';
    }

    if (formData.comentario.trim().length < 3) {
      newErrors.comentario = 'O comentário deve ter pelo menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        attendantId: formData.attendantId,
        nota: formData.nota,
        comentario: formData.comentario.trim()
      });
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, nota: rating }));
    if (errors.nota) {
      setErrors(prev => ({ ...prev, nota: '' }));
    }
  };

  const selectedAttendant = attendants.find(a => a.id === formData.attendantId);

  return (
    <DataValidator
      data={attendants}
      fallback={[]}
      loading={false}
    >
      {(validAttendants) => (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Atendente */}
          <div className="space-y-2">
            <Label htmlFor="attendant" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Atendente
            </Label>
            <Select
              value={formData.attendantId}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, attendantId: value }));
                if (errors.attendantId) {
                  setErrors(prev => ({ ...prev, attendantId: '' }));
                }
              }}
            >
              <SelectTrigger className={cn(errors.attendantId && "border-red-500")}>
                <SelectValue placeholder="Selecione um atendente" />
              </SelectTrigger>
              <SelectContent>
                {validAttendants.length === 0 ? (
                  <SelectItem value="" disabled>
                    Nenhum atendente disponível
                  </SelectItem>
                ) : (
                  validAttendants.map((attendant) => (
                    <SelectItem key={attendant.id} value={attendant.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={attendant.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {attendant.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{attendant.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {attendant.funcao} - {attendant.setor}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.attendantId && (
              <p className="text-sm text-red-500">{errors.attendantId}</p>
            )}
          </div>

          {/* Preview do Atendente Selecionado */}
          {selectedAttendant && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedAttendant.avatarUrl} />
                    <AvatarFallback>
                      {selectedAttendant.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedAttendant.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAttendant.funcao} - {selectedAttendant.setor}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAttendant.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Avaliação por Estrelas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Avaliação
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => {
                  const rating = i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleRatingClick(rating)}
                      className={cn(
                        "p-1 rounded transition-colors hover:bg-muted",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      )}
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          rating <= formData.nota
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-sm font-medium ml-2">
                {formData.nota > 0 ? `${formData.nota}/5` : 'Não avaliado'}
              </span>
            </div>
            {errors.nota && (
              <p className="text-sm text-red-500">{errors.nota}</p>
            )}
          </div>

          {/* Comentário */}
          <div className="space-y-2">
            <Label htmlFor="comentario" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentário
            </Label>
            <Textarea
              id="comentario"
              placeholder="Descreva sua experiência com o atendimento..."
              value={formData.comentario}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, comentario: e.target.value }));
                if (errors.comentario) {
                  setErrors(prev => ({ ...prev, comentario: '' }));
                }
              }}
              className={cn(
                "min-h-[100px] resize-none",
                errors.comentario && "border-red-500"
              )}
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              {errors.comentario && (
                <p className="text-sm text-red-500">{errors.comentario}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {formData.comentario.length}/500 caracteres
              </p>
            </div>
          </div>

          {/* Informações sobre XP */}
          {formData.nota > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Esta avaliação gerará XP para o atendente
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  O XP será calculado automaticamente com base na nota e multiplicadores ativos.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Avaliação'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </DataValidator>
  );
}