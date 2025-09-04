import { PrismaClient, User, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.nativeEnum(Role).default(Role.USUARIO),
  modules: z.array(z.string()).optional().default([])
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  role: z.nativeEnum(Role).optional(),
  modules: z.array(z.string()).optional()
});

export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;

export class UserService {
  // Buscar todos os usuários
  static async findAll(): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        include: {
          modules: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw new Error('Falha ao buscar usuários');
    }
  }

  // Buscar usuário por ID
  static async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          modules: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw new Error('Falha ao buscar usuário');
    }
  }

  // Buscar usuário por email
  static async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          modules: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw new Error('Falha ao buscar usuário');
    }
  }

  // Criar novo usuário
  static async create(data: CreateUserData): Promise<User> {
    try {
      // Validar dados
      const validatedData = CreateUserSchema.parse(data);
      
      // Verificar se email já existe
      const existingUser = await this.findByEmail(validatedData.email);
      if (existingUser) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // Criar usuário
      return await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: validatedData.role,
          modules: {
            connect: validatedData.modules.map(moduleId => ({ id: moduleId }))
          }
        },
        include: {
          modules: true
        }
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error instanceof Error ? error : new Error('Falha ao criar usuário');
    }
  }

  // Atualizar usuário
  static async update(id: string, data: UpdateUserData): Promise<User> {
    try {
      // Validar dados
      const validatedData = UpdateUserSchema.parse(data);
      
      // Verificar se usuário existe
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Se está atualizando email, verificar se não está em uso
      if (validatedData.email && validatedData.email !== existingUser.email) {
        const emailInUse = await this.findByEmail(validatedData.email);
        if (emailInUse) {
          throw new Error('Email já está em uso');
        }
      }

      // Preparar dados para atualização
      const updateData: any = {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.email && { email: validatedData.email }),
        ...(validatedData.role && { role: validatedData.role })
      };

      // Hash da nova senha se fornecida
      if (validatedData.password) {
        updateData.password = await bcrypt.hash(validatedData.password, 12);
      }

      // Atualizar módulos se fornecidos
      if (validatedData.modules) {
        updateData.modules = {
          set: validatedData.modules.map(moduleId => ({ id: moduleId }))
        };
      }

      return await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          modules: true
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error instanceof Error ? error : new Error('Falha ao atualizar usuário');
    }
  }

  // Deletar usuário
  static async delete(id: string): Promise<void> {
    try {
      // Verificar se usuário existe
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se não é o último SUPERADMIN
      if (existingUser.role === 'SUPERADMIN') {
        const superAdminCount = await prisma.user.count({
          where: { role: 'SUPERADMIN' }
        });

        if (superAdminCount <= 1) {
          throw new Error('Não é possível deletar o último SUPERADMIN do sistema');
        }
      }

      await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error instanceof Error ? error : new Error('Falha ao deletar usuário');
    }
  }

  // Verificar se existe super admin
  static async hasSuperAdmin(): Promise<boolean> {
    try {
      const count = await prisma.user.count({
        where: { role: 'SUPERADMIN' }
      });
      return count > 0;
    } catch (error) {
      console.error('Erro ao verificar super admin:', error);
      return false;
    }
  }

  // Verificar credenciais para login
  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user || !user.password) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Erro ao verificar credenciais:', error);
      return null;
    }
  }
}  // 
Criar usuário
  static async create(userData: CreateUserData): Promise<User> {
    try {
      // Validar dados
      const validatedData = CreateUserSchema.parse(userData);
      
      // Verificar se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });
      
      if (existingUser) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // Criar usuário com módulos
      const user = await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: validatedData.role,
          modules: {
            connect: validatedData.modules.map(moduleId => ({ id: moduleId }))
          }
        },
        include: {
          modules: true
        }
      });

      return user;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Atualizar usuário
  static async update(id: string, userData: UpdateUserData): Promise<User> {
    try {
      // Validar dados
      const validatedData = UpdateUserSchema.parse(userData);
      
      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar email único se estiver sendo atualizado
      if (validatedData.email && validatedData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: validatedData.email }
        });
        
        if (emailExists) {
          throw new Error('Email já está em uso');
        }
      }

      // Preparar dados para atualização
      const updateData: any = {
        ...validatedData
      };

      // Hash da senha se fornecida
      if (validatedData.password) {
        updateData.password = await bcrypt.hash(validatedData.password, 12);
      }

      // Atualizar módulos se fornecidos
      if (validatedData.modules) {
        updateData.modules = {
          set: validatedData.modules.map(moduleId => ({ id: moduleId }))
        };
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          modules: true
        }
      });

      return user;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Deletar usuário
  static async delete(id: string): Promise<void> {
    try {
      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  // Verificar senha
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          modules: true
        }
      });

      if (!user || !user.password) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      return isValid ? user : null;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return null;
    }
  }

  // Verificar se é super admin
  static async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      return user?.role === Role.SUPERADMIN;
    } catch (error) {
      console.error('Erro ao verificar super admin:', error);
      return false;
    }
  }
}