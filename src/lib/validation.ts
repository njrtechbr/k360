import { z } from "zod";
import { ROLES, ATTENDANT_STATUS } from "./types";

// Schemas de validação para tipos principais

// Schema para Role
export const RoleSchema = z.enum([
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.SUPERVISOR,
  ROLES.USER,
]);

// Schema para Status do Atendente
export const AttendantStatusSchema = z.enum([
  ATTENDANT_STATUS.ACTIVE,
  ATTENDANT_STATUS.INACTIVE,
  ATTENDANT_STATUS.ON_VACATION,
  ATTENDANT_STATUS.AWAY,
]);

// Schema para validação de email
export const EmailSchema = z.string().email("Email inválido");

// Schema para validação de telefone brasileiro
export const PhoneSchema = z
  .string()
  .regex(
    /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
    "Formato de telefone inválido",
  )
  .optional();

// Schema para validação de CPF
export const CPFSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "Formato de CPF inválido");

// Schema para validação de RG
export const RGSchema = z
  .string()
  .min(7, "RG deve ter pelo menos 7 caracteres")
  .max(12, "RG deve ter no máximo 12 caracteres");

// Schema para validação de data ISO
export const ISODateSchema = z
  .string()
  .datetime("Data deve estar no formato ISO");

// Schema para validação de nota (1-5)
export const RatingSchema = z
  .number()
  .min(1, "Nota deve ser no mínimo 1")
  .max(5, "Nota deve ser no máximo 5")
  .int("Nota deve ser um número inteiro");

// Schema para validação de XP
export const XPSchema = z
  .number()
  .min(0, "XP não pode ser negativo")
  .int("XP deve ser um número inteiro");

// Schema para Attendant
export const AttendantSchema = z.object({
  id: z.string().uuid("ID deve ser um UUID válido"),
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  email: EmailSchema,
  funcao: z
    .string()
    .min(1, "Função é obrigatória")
    .max(50, "Função deve ter no máximo 50 caracteres"),
  setor: z
    .string()
    .min(1, "Setor é obrigatório")
    .max(50, "Setor deve ter no máximo 50 caracteres"),
  status: AttendantStatusSchema,
  avatarUrl: z.string().url("URL do avatar inválida").nullable(),
  telefone: PhoneSchema.default(""),
  portaria: z
    .string()
    .max(100, "Portaria deve ter no máximo 100 caracteres")
    .nullable(),
  situacao: z
    .string()
    .max(100, "Situação deve ter no máximo 100 caracteres")
    .nullable(),
  dataAdmissao: ISODateSchema,
  dataNascimento: ISODateSchema,
  rg: RGSchema,
  cpf: CPFSchema,
  importId: z.string().uuid().nullable().optional(),
});

// Schema para criação de Attendant (sem ID)
export const CreateAttendantSchema = AttendantSchema.omit({ id: true });

// Schema para atualização de Attendant (campos opcionais)
export const UpdateAttendantSchema = AttendantSchema.partial().omit({
  id: true,
});

// Schema para Evaluation
export const EvaluationSchema = z.object({
  id: z.string().uuid("ID deve ser um UUID válido"),
  attendantId: z.string().uuid("ID do atendente deve ser um UUID válido"),
  nota: RatingSchema,
  comentario: z
    .string()
    .max(1000, "Comentário deve ter no máximo 1000 caracteres")
    .trim(),
  data: ISODateSchema,
  xpGained: XPSchema,
  importId: z.string().uuid().nullable().optional(),
});

// Schema para criação de Evaluation (sem ID e XP)
export const CreateEvaluationSchema = z.object({
  attendantId: z.string().uuid("ID do atendente deve ser um UUID válido"),
  nota: RatingSchema,
  comentario: z
    .string()
    .max(1000, "Comentário deve ter no máximo 1000 caracteres")
    .trim(),
});

// Schema para atualização de Evaluation
export const UpdateEvaluationSchema = EvaluationSchema.partial().omit({
  id: true,
  xpGained: true,
});

// Schema para User
export const UserSchema = z.object({
  id: z.string().uuid("ID deve ser um UUID válido"),
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  email: EmailSchema,
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .optional(),
  role: RoleSchema,
  modules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      path: z.string(),
      active: z.boolean(),
    }),
  ),
});

// Schema para criação de User
export const CreateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  email: EmailSchema,
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número",
    ),
  role: RoleSchema,
  modules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      path: z.string(),
      active: z.boolean(),
    }),
  ),
});

// Schema para login
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

// Schema para análise de sentimento
export const SentimentAnalysisSchema = z.object({
  evaluationId: z.string().uuid("ID da avaliação deve ser um UUID válido"),
  sentiment: z.enum(["Positivo", "Negativo", "Neutro"]),
  summary: z
    .string()
    .min(10, "Resumo deve ter pelo menos 10 caracteres")
    .max(200, "Resumo deve ter no máximo 200 caracteres"),
  confidence: z
    .number()
    .min(0, "Confiança deve ser entre 0 e 1")
    .max(1, "Confiança deve ser entre 0 e 1"),
  analyzedAt: ISODateSchema,
  originalComment: z.string(),
});

// Schema para XP Event
export const XpEventSchema = z.object({
  id: z.string().uuid("ID deve ser um UUID válido"),
  attendantId: z.string().uuid("ID do atendente deve ser um UUID válido"),
  points: XPSchema,
  basePoints: XPSchema,
  multiplier: z.number().min(0, "Multiplicador não pode ser negativo"),
  reason: z
    .string()
    .min(1, "Razão é obrigatória")
    .max(200, "Razão deve ter no máximo 200 caracteres"),
  date: ISODateSchema,
  type: z.enum(["evaluation", "achievement"]),
  relatedId: z.string().uuid("ID relacionado deve ser um UUID válido"),
});

// Schema para Season
export const SeasonSchema = z
  .object({
    id: z.string().uuid("ID deve ser um UUID válido"),
    name: z
      .string()
      .min(1, "Nome da temporada é obrigatório")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    startDate: ISODateSchema,
    endDate: ISODateSchema,
    active: z.boolean(),
    xpMultiplier: z
      .number()
      .min(0.1, "Multiplicador deve ser pelo menos 0.1")
      .max(10, "Multiplicador deve ser no máximo 10"),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "Data de fim deve ser posterior à data de início",
    path: ["endDate"],
  });

// Schema para filtros de avaliação
export const EvaluationFiltersSchema = z
  .object({
    attendantId: z.string().uuid().optional(),
    startDate: ISODateSchema.optional(),
    endDate: ISODateSchema.optional(),
    minRating: RatingSchema.optional(),
    maxRating: RatingSchema.optional(),
    hasComment: z.boolean().optional(),
    sentiment: z.enum(["Positivo", "Negativo", "Neutro"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "Data de fim deve ser posterior ou igual à data de início",
      path: ["endDate"],
    },
  )
  .refine(
    (data) => {
      if (data.minRating && data.maxRating) {
        return data.maxRating >= data.minRating;
      }
      return true;
    },
    {
      message: "Nota máxima deve ser maior ou igual à nota mínima",
      path: ["maxRating"],
    },
  );

// Schema para paginação
export const PaginationSchema = z.object({
  page: z.number().int().min(1, "Página deve ser pelo menos 1").default(1),
  limit: z
    .number()
    .int()
    .min(1, "Limite deve ser pelo menos 1")
    .max(100, "Limite deve ser no máximo 100")
    .default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Tipos inferidos dos schemas
export type AttendantInput = z.infer<typeof AttendantSchema>;
export type CreateAttendantInput = z.infer<typeof CreateAttendantSchema>;
export type UpdateAttendantInput = z.infer<typeof UpdateAttendantSchema>;
export type EvaluationInput = z.infer<typeof EvaluationSchema>;
export type CreateEvaluationInput = z.infer<typeof CreateEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof UpdateEvaluationSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SentimentAnalysisInput = z.infer<typeof SentimentAnalysisSchema>;
export type XpEventInput = z.infer<typeof XpEventSchema>;
export type SeasonInput = z.infer<typeof SeasonSchema>;
export type EvaluationFiltersInput = z.infer<typeof EvaluationFiltersSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

// Função utilitária para validar dados
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join(".")}: ` : "";
    return `${path}${err.message}`;
  });

  return { success: false, errors };
}

// Função para validar e transformar dados de entrada
export function validateAndTransform<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  const result = validateData(schema, data);

  if (!result.success) {
    throw new Error(`Validation failed: ${result.errors.join(", ")}`);
  }

  return result.data;
}
