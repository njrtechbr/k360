import { PrismaClient, Evaluation } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateEvaluationSchema = z.object({
  attendantId: z.string().min(1, 'ID do atendente é obrigatório'),
  nota: z.number().min(1, 'Nota mínima é 1').max(5, 'Nota máxima é 5'),
  comentario: z.string().default(''),
  data: z.date(),
  xpGained: z.number().default(0),
  importId: z.string().optional()
});

export const UpdateEvaluationSchema = z.object({
  nota: z.number().min(1, 'Nota mínima é 1').max(5, 'Nota máxima é 5').optional(),
  comentario: z.string().optional(),
  data: z.date().optional(),
  xpGained: z.number().optional()
});

export type CreateEvaluationData = z.infer<typeof CreateEvaluationSchema>;
export type UpdateEvaluationData = z.infer<typeof UpdateEvaluationSchema>;

export class EvaluationService {
  // Buscar todas as avaliações
  static async findAll(): Promise<Evaluation[]> {
    try {
      return await prisma.evaluation.findMany({
        include: {
          attendant: true,
          import: true
        },
        orderBy: {
          data: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      throw new Error('Falha ao buscar avaliações');
    }
  }

  // Buscar avaliação por ID
  static async findById(id: string): Promise<Evaluation | null> {
    try {
      return await prisma.evaluation.findUnique({
        where: { id },
        include: {
          attendant: true,
          import: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar avaliação:', error);
      throw new Error('Falha ao buscar avaliação');
    }
  }

  // Buscar avaliações por atendente
  static async findByAttendantId(attendantId: string): Promise<Evaluation[]> {
    try {
      return await prisma.evaluation.findMany({
        where: { attendantId },
        include: {
          attendant: true,
          import: true
        },
        orderBy: {
          data: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar avaliações do atendente:', error);
      throw new Error('Falha ao buscar avaliações do atendente');
    }
  }

  // Criar avaliação
  static async create(evaluationData: CreateEvaluationData): Promise<Evaluation> {
    try {
      // Validar dados
      const validatedData = CreateEvaluationSchema.parse(evaluationData);
      
      // Verificar se atendente existe
      const attendant = await prisma.attendant.findUnique({
        where: { id: validatedData.attendantId }
      });
      
      if (!attendant) {
        throw new Error('Atendente não encontrado');
      }

      // Calcular XP se não fornecido
      if (validatedData.xpGained === 0) {
        validatedData.xpGained = await this.calculateXpFromRating(validatedData.nota);
      }

      const evaluation = await prisma.evaluation.create({
        data: validatedData,
        include: {
          attendant: true,
          import: true
        }
      });

      // Criar evento XP relacionado
      await this.createXpEvent(evaluation);

      return evaluation;
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }