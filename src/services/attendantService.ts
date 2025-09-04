import { PrismaClient, Attendant } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateAttendantSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  funcao: z.string().min(1, 'Função é obrigatória'),
  setor: z.string().min(1, 'Setor é obrigatório'),
  status: z.string().min(1, 'Status é obrigatório'),
  avatarUrl: z.string().optional(),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  portaria: z.string().optional(),
  situacao: z.string().optional(),
  dataAdmissao: z.date(),
  dataNascimento: z.date(),
  rg: z.string().min(1, 'RG é obrigatório'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos'),
  importId: z.string().optional()
});

export const UpdateAttendantSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
  funcao: z.string().min(1, 'Função é obrigatória').optional(),
  setor: z.string().min(1, 'Setor é obrigatório').optional(),
  status: z.string().min(1, 'Status é obrigatório').optional(),
  avatarUrl: z.string().optional(),
  telefone: z.string().min(1, 'Telefone é obrigatório').optional(),
  portaria: z.string().optional(),
  situacao: z.string().optional(),
  dataAdmissao: z.date().optional(),
  dataNascimento: z.date().optional(),
  rg: z.string().min(1, 'RG é obrigatório').optional(),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').optional()
});

export type CreateAttendantData = z.infer<typeof CreateAttendantSchema>;
export type UpdateAttendantData = z.infer<typeof UpdateAttendantSchema>;

export class AttendantService {
  // Buscar todos os atendentes
  static async findAll(): Promise<Attendant[]> {
    try {
      return await prisma.attendant.findMany({
        include: {
          evaluations: true,
          unlockedAchievements: true,
          import: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar atendentes:', error);
      throw new Error('Falha ao buscar atendentes');
    }
  }

  // Buscar atendente por ID
  static async findById(id: string): Promise<Attendant | null> {
    try {
      return await prisma.attendant.findUnique({
        where: { id },
        include: {
          evaluations: {
            orderBy: { data: 'desc' }
          },
          unlockedAchievements: true,
          import: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar atendente:', error);
      throw new Error('Falha ao buscar atendente');
    }
  }

  // Buscar atendente por email
  static async findByEmail(email: string): Promise<Attendant | null> {
    try {
      return await prisma.attendant.findUnique({
        where: { email },
        include: {
          evaluations: true,
          unlockedAchievements: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar atendente por email:', error);
      throw new Error('Falha ao buscar atendente');
    }
  }

  // Buscar atendente por CPF
  static async findByCpf(cpf: string): Promise<Attendant | null> {
    try {
      return await prisma.attendant.findUnique({
        where: { cpf },
        include: {
          evaluations: true,
          unlockedAchievements: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar atendente por CPF:', error);
      throw new Error('Falha ao buscar atendente');
    }
  }  // Criar 
atendente
  static async create(attendantData: CreateAttendantData): Promise<Attendant> {
    try {
      // Validar dados
      const validatedData = CreateAttendantSchema.parse(attendantData);
      
      // Verificar se email já existe
      const existingEmail = await prisma.attendant.findUnique({
        where: { email: validatedData.email }
      });
      
      if (existingEmail) {
        throw new Error('Email já está em uso');
      }

      // Verificar se CPF já existe
      const existingCpf = await prisma.attendant.findUnique({
        where: { cpf: validatedData.cpf }
      });
      
      if (existingCpf) {
        throw new Error('CPF já está em uso');
      }

      const attendant = await prisma.attendant.create({
        data: validatedData,
        include: {
          evaluations: true,
          unlockedAchievements: true,
          import: true
        }
      });

      return attendant;
    } catch (error) {
      console.error('Erro ao criar atendente:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Atualizar atendente
  static async update(id: string, attendantData: UpdateAttendantData): Promise<Attendant> {
    try {
      // Validar dados
      const validatedData = UpdateAttendantSchema.parse(attendantData);
      
      // Verificar se atendente existe
      const existingAttendant = await prisma.attendant.findUnique({
        where: { id }
      });
      
      if (!existingAttendant) {
        throw new Error('Atendente não encontrado');
      }

      // Verificar email único se estiver sendo atualizado
      if (validatedData.email && validatedData.email !== existingAttendant.email) {
        const emailExists = await prisma.attendant.findUnique({
          where: { email: validatedData.email }
        });
        
        if (emailExists) {
          throw new Error('Email já está em uso');
        }
      }

      // Verificar CPF único se estiver sendo atualizado
      if (validatedData.cpf && validatedData.cpf !== existingAttendant.cpf) {
        const cpfExists = await prisma.attendant.findUnique({
          where: { cpf: validatedData.cpf }
        });
        
        if (cpfExists) {
          throw new Error('CPF já está em uso');
        }
      }

      const attendant = await prisma.attendant.update({
        where: { id },
        data: validatedData,
        include: {
          evaluations: true,
          unlockedAchievements: true,
          import: true
        }
      });

      return attendant;
    } catch (error) {
      console.error('Erro ao atualizar atendente:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Deletar atendente
  static async delete(id: string): Promise<void> {
    try {
      // Verificar se atendente existe
      const existingAttendant = await prisma.attendant.findUnique({
        where: { id }
      });
      
      if (!existingAttendant) {
        throw new Error('Atendente não encontrado');
      }

      // Deletar em transação para manter integridade
      await prisma.$transaction(async (tx) => {
        // Deletar avaliações relacionadas (cascade automático)
        // Deletar conquistas desbloqueadas (cascade automático)
        // Deletar atendente
        await tx.attendant.delete({
          where: { id }
        });
      });
    } catch (error) {
      console.error('Erro ao deletar atendente:', error);
      throw error;
    }
  }

  // Importação em lote
  static async createBatch(attendantsData: CreateAttendantData[], importId?: string): Promise<Attendant[]> {
    try {
      const results: Attendant[] = [];
      
      // Processar em transação
      await prisma.$transaction(async (tx) => {
        for (const attendantData of attendantsData) {
          // Validar dados
          const validatedData = CreateAttendantSchema.parse({
            ...attendantData,
            importId
          });
          
          // Verificar duplicatas
          const existingEmail = await tx.attendant.findUnique({
            where: { email: validatedData.email }
          });
          
          if (existingEmail) {
            throw new Error(`Email ${validatedData.email} já está em uso`);
          }

          const existingCpf = await tx.attendant.findUnique({
            where: { cpf: validatedData.cpf }
          });
          
          if (existingCpf) {
            throw new Error(`CPF ${validatedData.cpf} já está em uso`);
          }

          const attendant = await tx.attendant.create({
            data: validatedData,
            include: {
              evaluations: true,
              unlockedAchievements: true,
              import: true
            }
          });

          results.push(attendant);
        }
      });

      return results;
    } catch (error) {
      console.error('Erro na importação em lote:', error);
      throw error;
    }
  }

  // Deletar por importação
  static async deleteByImportId(importId: string): Promise<number> {
    try {
      const result = await prisma.attendant.deleteMany({
        where: { importId }
      });

      return result.count;
    } catch (error) {
      console.error('Erro ao deletar atendentes por importação:', error);
      throw error;
    }
  }

  // Buscar por setor
  static async findBySetor(setor: string): Promise<Attendant[]> {
    try {
      return await prisma.attendant.findMany({
        where: { setor },
        include: {
          evaluations: true,
          unlockedAchievements: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar atendentes por setor:', error);
      throw new Error('Falha ao buscar atendentes por setor');
    }
  }

  // Buscar por função
  static async findByFuncao(funcao: string): Promise<Attendant[]> {
    try {
      return await prisma.attendant.findMany({
        where: { funcao },
        include: {
          evaluations: true,
          unlockedAchievements: true
        },
        orderBy: {
          name: 'asc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar atendentes por função:', error);
      throw new Error('Falha ao buscar atendentes por função');
    }
  }
}