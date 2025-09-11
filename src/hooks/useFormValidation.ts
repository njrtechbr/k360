import { useState, useCallback, useMemo } from "react";
import { z } from "zod";
import {
  validateFormData,
  formatValidationErrors,
} from "@/lib/validation-utils";

/**
 * Hook para gerenciar validação de formulários
 */
export function useFormValidation<T extends z.ZodSchema>(
  schema: T,
  initialData?: Partial<z.infer<T>>,
) {
  type FormData = z.infer<T>;
  type ValidationErrors = Record<string, string>;

  const [data, setData] = useState<Partial<FormData>>(initialData || {});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validar dados completos
  const validateAll = useCallback(() => {
    const result = validateFormData(schema, data);

    if (!result.isValid) {
      setErrors(result.errors || {});
      return false;
    }

    setErrors({});
    return true;
  }, [schema, data]);

  // Validar campo específico
  const validateField = useCallback(
    (fieldName: string, value: any) => {
      try {
        // Cria um schema parcial para validar apenas o campo específico
        const fieldSchema = schema.pick({ [fieldName]: true } as any);
        const result = validateFormData(fieldSchema, { [fieldName]: value });

        if (!result.isValid) {
          setErrors((prev) => ({
            ...prev,
            [fieldName]: result.errors?.[fieldName] || "Valor inválido",
          }));
          return false;
        }

        // Remove erro do campo se válido
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });

        return true;
      } catch {
        // Se não conseguir validar o campo individualmente, ignora
        return true;
      }
    },
    [schema],
  );

  // Atualizar valor de campo
  const setValue = useCallback(
    (fieldName: string, value: any) => {
      setData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      // Valida o campo se já foi tocado
      if (touched[fieldName]) {
        validateField(fieldName, value);
      }
    },
    [touched, validateField],
  );

  // Marcar campo como tocado
  const setFieldTouched = useCallback(
    (fieldName: string, isTouched: boolean = true) => {
      setTouched((prev) => ({
        ...prev,
        [fieldName]: isTouched,
      }));

      // Valida o campo quando é tocado
      if (isTouched && data[fieldName as keyof FormData] !== undefined) {
        validateField(fieldName, data[fieldName as keyof FormData]);
      }
    },
    [data, validateField],
  );

  // Resetar formulário
  const reset = useCallback((newData?: Partial<FormData>) => {
    setData(newData || {});
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  // Submeter formulário
  const handleSubmit = useCallback(
    async (
      onSubmit: (data: FormData) => Promise<void> | void,
      onError?: (errors: ValidationErrors) => void,
    ) => {
      setIsSubmitting(true);

      try {
        const isValid = validateAll();

        if (!isValid) {
          onError?.(errors);
          return false;
        }

        await onSubmit(data as FormData);
        return true;
      } catch (error) {
        console.error("Erro ao submeter formulário:", error);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [data, errors, validateAll],
  );

  // Verificar se formulário é válido
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && Object.keys(data).length > 0;
  }, [errors, data]);

  // Verificar se formulário foi modificado
  const isDirty = useMemo(() => {
    return Object.keys(data).length > 0;
  }, [data]);

  // Obter erro de campo específico
  const getFieldError = useCallback(
    (fieldName: string) => {
      return errors[fieldName];
    },
    [errors],
  );

  // Verificar se campo foi tocado
  const isFieldTouched = useCallback(
    (fieldName: string) => {
      return touched[fieldName] || false;
    },
    [touched],
  );

  // Verificar se campo tem erro
  const hasFieldError = useCallback(
    (fieldName: string) => {
      return Boolean(errors[fieldName]);
    },
    [errors],
  );

  // Obter valor de campo
  const getFieldValue = useCallback(
    (fieldName: string) => {
      return data[fieldName as keyof FormData];
    },
    [data],
  );

  // Criar props para input
  const getFieldProps = useCallback(
    (fieldName: string) => {
      return {
        value: getFieldValue(fieldName) || "",
        onChange: (
          e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >,
        ) => {
          setValue(fieldName, e.target.value);
        },
        onBlur: () => {
          setFieldTouched(fieldName, true);
        },
        error: hasFieldError(fieldName),
        helperText: isFieldTouched(fieldName)
          ? getFieldError(fieldName)
          : undefined,
      };
    },
    [
      getFieldValue,
      setValue,
      setFieldTouched,
      hasFieldError,
      isFieldTouched,
      getFieldError,
    ],
  );

  return {
    // Estado
    data,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,

    // Ações
    setValue,
    setFieldTouched,
    reset,
    handleSubmit,
    validateAll,
    validateField,

    // Helpers
    getFieldError,
    isFieldTouched,
    hasFieldError,
    getFieldValue,
    getFieldProps,
  };
}

/**
 * Hook simplificado para validação de formulários com estado mínimo
 */
export function useSimpleValidation<T extends z.ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (data: unknown) => {
      const result = validateFormData(schema, data);

      if (!result.isValid) {
        setErrors(result.errors || {});
        return { isValid: false, data: null, errors: result.errors || {} };
      }

      setErrors({});
      return { isValid: true, data: result.data, errors: {} };
    },
    [schema],
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validate,
    clearErrors,
    setFieldError,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
}

/**
 * Hook para validação em tempo real
 */
export function useRealtimeValidation<T extends z.ZodSchema>(
  schema: T,
  debounceMs: number = 300,
) {
  const [data, setData] = useState<Partial<z.infer<T>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounce para validação
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const validateData = useCallback(
    (dataToValidate: Partial<z.infer<T>>) => {
      setIsValidating(true);

      const result = validateFormData(schema, dataToValidate);

      if (!result.isValid) {
        setErrors(result.errors || {});
      } else {
        setErrors({});
      }

      setIsValidating(false);
    },
    [schema],
  );

  const updateData = useCallback(
    (newData: Partial<z.infer<T>>) => {
      setData(newData);

      // Cancela timer anterior
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Inicia novo timer
      const timer = setTimeout(() => {
        validateData(newData);
      }, debounceMs);

      setDebounceTimer(timer);
    },
    [debounceTimer, debounceMs, validateData],
  );

  const updateField = useCallback(
    (fieldName: string, value: any) => {
      const newData = {
        ...data,
        [fieldName]: value,
      };
      updateData(newData);
    },
    [data, updateData],
  );

  // Cleanup do timer
  React.useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    data,
    errors,
    isValidating,
    updateData,
    updateField,
    isValid: Object.keys(errors).length === 0,
  };
}
