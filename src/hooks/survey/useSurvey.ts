"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Evaluation, Attendant } from "@/lib/types";

interface SubmitEvaluationData {
  rating: number;
  comment: string;
}

interface UseSurveyProps {
  attendant: Attendant;
  onSuccess?: (evaluation: Evaluation) => void;
  onError?: (error: Error) => void;
}

export function useSurvey({ attendant, onSuccess, onError }: UseSurveyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const submitEvaluation = useCallback(
    async (data: SubmitEvaluationData) => {
      if (isSubmitting || isSubmitted) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/evaluations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendantId: attendant.id,
            nota: data.rating,
            comentario: data.comment,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Erro ao enviar avaliação");
        }

        const evaluation = await response.json();

        setIsSubmitted(true);

        toast({
          title: "Avaliação enviada!",
          description: "Obrigado pelo seu feedback.",
          variant: "default",
        });

        onSuccess?.(evaluation);

        return evaluation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);

        toast({
          title: "Erro ao enviar avaliação",
          description: errorMessage,
          variant: "destructive",
        });

        onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [attendant.id, isSubmitting, isSubmitted, toast, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setIsSubmitted(false);
    setError(null);
  }, []);

  return {
    submitEvaluation,
    isSubmitting,
    isSubmitted,
    error,
    reset,
  };
}
