import { PrismaClient, Module } from '@prisma/client';
import { z } from 'zod';
import { handlePrismaError, logError } from '@/lib/errors';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateModuleSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  path: z.string().min(1, 'Caminho é obrigatório'),
  active: z.boolean().default(true)
});

export const UpdateModuleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().min(1, 'Descrição é obrigatória').optional(),
  path: z.string().min(1, 'Caminho é obrigatório').optional(),
  active: z.boolean().optional()
});

export type CreateModuleData = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleData = z.infer<typeof UpdateModuleSchema>;

export class ModuleService {
  // Buscar todos os módulos
  static async findAll(): Promise<Module[]> {
    try {
      return await prisma.module.findMany({
        include: {
          users: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    } catch (error) {
      logError(error as Error, 'ModuleService.findAll');
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  // Buscar módulos ativos
  static async findActive(): Promise<Module[]> {
    try {
      return await prisma.module.findMany({
        where: { active: true },
        include: {
          users: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar módulos ativos:', error);
      throw new Error('Falha ao buscar módulos ativos');
    }
  }

  // Buscar módulo por ID
  static async findById(id: string): Promise<Module | null> {
    try {
      return await prisma.module.findUnique({
        where: { id },
        include: {
          users: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      throw new Error('Falha ao buscar módulo');
    }
  }

  // Criar módulo
  static async create(moduleData: CreateModuleData): Promise<Module> {
    try {
      // Validar dados
      const validatedData = CreateModuleSchema.parse(moduleData);
      
      // Verificar se ID já existe
      const existingModule = await prisma.module.findUnique({
        where: { id: validatedData.id }
      });
      
      if (existingModule) {
        throw new Error('ID do módulo já está em uso');
      }

      const module = await prisma.module.create({
        data: validatedData,
        include: {
          users: true
        }
      });

      return module;
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Atualizar módulo
  static async update(id: string, moduleData: UpdateModuleData): Promise<Module> {
    try {
      // Validar dados
      const validatedData = UpdateModuleSchema.parse(moduleData);
      
      // Verificar se módulo existe
      const existingModule = await prisma.module.findUnique({
        where: { id }
      });
      
      if (!existingModule) {
        throw new Error('Módulo não encontrado');
      }

      const module = await prisma.module.update({
        where: { id },
        data: validatedData,
        include: {
          users: true
        }
      });

      return module;
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Deletar módulo
  static async delete(id: string): Promise<void> {
    try {
      // Verificar se módulo existe
      const existingModule = await prisma.module.findUnique({
        where: { id }
      });
      
      if (!existingModule) {
        throw new Error('Módulo não encontrado');
      }

      await prisma.module.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Erro ao deletar módulo:', error);
      throw error;
    }
  }

  // Ativar/Desativar módulo
  static async toggleActive(id: string): Promise<Module> {
    try {
      const existingModule = await prisma.module.findUnique({
        where: { id }
      });
      
      if (!existingModule) {
        throw new Error('Módulo não encontrado');
      }

      const module = await prisma.module.update({
        where: { id },
        data: { active: !existingModule.active },
        include: {
          users: true
        }
      });

      return module;
    } catch (error) {
      console.error('Erro ao alterar status do módulo:', error);
      throw error;
    }
  }

  // Associar usuário ao módulo
  static async addUserToModule(moduleId: string, userId: string): Promise<Module> {
    try {
      const module = await prisma.module.update({
        where: { id: moduleId },
        data: {
          users: {
            connect: { id: userId }
          }
        },
        include: {
          users: true
        }
      });

      return module;
    } catch (error) {
      console.error('Erro ao associar usuário ao módulo:', error);
      throw error;
    }
  }

  // Remover usuário do módulo
  static async removeUserFromModule(moduleId: string, userId: string): Promise<Module> {
    try {
      const module = await prisma.module.update({
        where: { id: moduleId },
        data: {
          users: {
            disconnect: { id: userId }
          }
        },
        include: {
          users: true
        }
      });

      return module;
    } catch (error) {
      console.error('Erro ao remover usuário do módulo:', error);
      throw error;
    }
  }
}