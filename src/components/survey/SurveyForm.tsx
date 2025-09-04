'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCircle, ShieldCheck, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import RatingStars, { useRating } from './RatingStars';
import { useFormValidation } from '@/hooks/useFormValidation';
import { CreateEvaluationSchema } from '@/lib/validation';
import Link from 'next/link';
import type { Attendant } from '@/lib/types';

export interface SurveyFormData {
  rating: number;
  comment: string;
  attendantId: string;
}

export interface SurveyFormProps {
  /** Atendente sendo avaliado */
  attendant: Attendant;
  /** Callback chamado ao submeter o formulário */
  onSubmit: (data: SurveyFormData) => Promise<void>;
  /** Se o formulário está carregando */
  loading?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

const SurveyForm: React.FC<SurveyFormProps> = ({
  attendant,
  onSubmit,
  loading = false,
  className
}) => {
  const [comment, setComment] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const {
    rating,
    setRating,
    reset: resetRating
  } = useRating(0);

  const {
    errors,
    validateField,
    validateForm,
    clearErrors
  } = useFormValidation(CreateEvaluationSchema);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
    
    // Validação em tempo real
    if (newComment.length > 0) {
      validateField('comment', newComment);
    } else {
      clearErrors(['comment']);
    }
  }, [validateField, clearErrors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading || isSubmitted) return;
    
    setSubmitError(null);

    // Validações customizadas
    const customErrors: Record<string, string> = {};
    
    if (rating === 0) {
      customErrors.rating = 'Por favor, selecione uma avaliação';
    }
    
    if (comment.trim().length < 10) {
      customErrors.comment = 'Por favor, deixe um comentário com pelo menos 10 caracteres';
    }

    if (Object.keys(customErrors).length > 0) {
      Object.entries(customErrors).forEach(([field, message]) => {
        validateField(field, '', message);
      });
      return;
    }

    // Dados para submissão
    const submissionData: SurveyFormData = {
      rating,
      comment: comment.trim(),
      attendantId: attendant.id
    };

    // Validação com schema
    const validation = validateForm(submissionData);
    if (!validation.success) {
      return;
    }

    try {
      await onSubmit(submissionData);
      setIsSubmitted(true);
      
      // Reset do formulário após sucesso
      setTimeout(() => {
        setComment('');
        resetRating();
        clearErrors();
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'Erro inesperado ao enviar avaliação. Tente novamente.'
      );
    }
  }, [rating, comment, attendant.id, loading, isSubmitted, validateField, validateForm, clearErrors, onSubmit, resetRating]);

  const isFormValid = rating > 0 && comment.trim().length >= 10;

  if (isSubmitted) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4 py-8',
        className
      )}>
        <Card className="w-full max-w-md shadow-2xl rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Avaliação Enviada!</h3>
                <p className="text-green-600 mt-1">Obrigado pelo seu feedback.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4 py-8',
      className
    )}>
      <Card className="w-full max-w-md shadow-2xl rounded-2xl animate-in fade-in zoom-in-95">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative p-1 bg-white rounded-full shadow-lg">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-white">
                <AvatarImage src={attendant.avatarUrl || ''} alt={attendant.nome} />
                <AvatarFallback>
                  <UserCircle className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full ring-4 ring-primary/20 animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold">{attendant.nome}</h1>
          <Badge variant="secondary">{attendant.funcao}</Badge>
          
          <h2 className="text-lg font-semibold mt-6">Pesquisa de Satisfação</h2>
          <p className="text-muted-foreground text-sm">
            Como você avalia o atendimento recebido?
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="rating" className="text-base font-medium">
                Avaliação *
              </Label>
              <div className="flex justify-center">
                <RatingStars
                  value={rating}
                  onChange={setRating}
                  size="lg"
                  showLabels
                  className=""
                />
              </div>
              {errors.rating && (
                <p className="text-sm text-red-600 text-center">{errors.rating}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="comment" className="text-base font-medium">
                Comentário *
              </Label>
              <Textarea
                id="comment"
                placeholder="Conte-nos mais sobre sua experiência..."
                value={comment}
                onChange={handleCommentChange}
                rows={3}
                className={cn(
                  'text-base resize-none',
                  errors.comment && 'border-red-500 focus:border-red-500'
                )}
                maxLength={500}
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {errors.comment ? (
                    <span className="text-red-600">{errors.comment}</span>
                  ) : (
                    'Mínimo 10 caracteres'
                  )}
                </span>
                <span>{comment.length}/500</span>
              </div>
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              size="lg" 
              className="w-full text-lg font-bold" 
              disabled={!isFormValid || loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-4 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-semibold">Koerner 360</span>
          </div>
        </CardFooter>
      </Card>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          Quer um sistema de avaliação como este para a sua empresa?
        </p>
        <Button variant="link" asChild>
          <Link href="/">
            Conheça o Sistema 360
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default SurveyForm;