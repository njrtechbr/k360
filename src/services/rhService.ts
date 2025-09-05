import { PrismaClient, Funcao, Setor } from '@prisma/client';
import { z } from 'zod';
import { handlePrismaError, logError } from '@/lib/errors';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateFuncaoSchema = z.object({
  name: z.string().min(1, 'Nome da função é obrigatório')
});

export const CreateSetorSchema = z.object({
  name: z.string().min(1, 'Nome do setor é obrigatório')
});

export type CreateFuncaoData = z.infer<typeof CreateFuncaoSchema>;
export type CreateSetorData = z.infer<typeof CreateSetorSchema>;

export class RHService {
  // === FUNÇÕES ===

  // Buscar todas as funções
  static async findAllFuncoes(): Promise<Funcao[]> {
    try {
      return await prisma.funcao.findMany({
        orderBy: {
          name: 'asc'
        }
      });
    } catch (error) {
      logError(error as Error, 'RHService.findAllFuncoes');
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  // Criar função
  static async createFuncao(funcaoData: CreateFuncaoData): Promise<Funcao> {
    try {
      const validatedData = CreateFuncaoSchema.parse(funcaoData);
      
      const existingFuncao = await prisma.funcao.findUnique({
        where: { name: validatedData.name }
      });
      
      if (existingFuncao) {
        throw new Error('Nome da função já está em uso');
      }

      return await prisma.funcao.create({
        data: validatedData
      });
    } catch (error) {
      console.error('Erro ao criar função:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // === SETORES ===

  // Buscar todos os setores
  static async findAllSetores(): Promise<Setor[]> {
    try {
      return await prisma.setor.findMany({
        orderBy: {
          name: 'asc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      throw new Error('Falha ao buscar setores');
    }
  }

  // Criar setor
  static async createSetor(setorData: CreateSetorData): Promise<Setor> {
    try {
      const validatedData = CreateSetorSchema.parse(setorData);
      
      const existingSetor = await prisma.setor.findUnique({
        where: { name: validatedData.name }
      });
      
      if (existingSetor) {
        throw new Error('Nome do setor já está em uso');
      }

      return await prisma.setor.create({
        data: validatedData
      });
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
}