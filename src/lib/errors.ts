import { Prisma } from '@prisma/client';

// Classe personalizada para erros de banco de dados
export class DatabaseError extends Error {
  public code: string;
  public field?: string;

  constructor(message: string, code: string, field?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.field = field;
  }
}

// Função para converter erros Prisma em mensagens amigáveis
export function handlePrismaError(error: any): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Violação de constraint única
        const field = error.meta?.target as string[] | undefined;
        const fieldName = field?.[0] || 'campo';
        return new DatabaseError(
          `Este ${fieldName} já está em uso`,
          'UNIQUE_CONSTRAINT',
          fieldName
        );

      case 'P2003':
        // Violação de chave estrangeira
        return new DatabaseError(
          'Operação não permitida devido a relacionamentos existentes',
          'FOREIGN_KEY_CONSTRAINT'
        );

      case 'P2025':
        // Registro não encontrado
        return new DatabaseError(
          'Registro não encontrado',
          'NOT_FOUND'
        );

      case 'P2014':
        // Violação de relacionamento obrigatório
        return new DatabaseError(
          'Relacionamento obrigatório não foi fornecido',
          'REQUIRED_RELATION'
        );

      case 'P2000':
        // Valor muito longo para o campo
        return new DatabaseError(
          'Valor fornecido é muito longo para o campo',
          'VALUE_TOO_LONG'
        );

      case 'P2001':
        // Registro não existe no relacionamento
        return new DatabaseError(
          'Registro relacionado não existe',
          'RELATED_RECORD_NOT_FOUND'
        );

      default:
        return new DatabaseError(
          'Erro de banco de dados desconhecido',
          'UNKNOWN_DATABASE_ERROR'
        );
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new DatabaseError(
      'Erro desconhecido no banco de dados',
      'UNKNOWN_REQUEST_ERROR'
    );
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new DatabaseError(
      'Erro interno do banco de dados',
      'INTERNAL_ERROR'
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError(
      'Erro de conexão com o banco de dados',
      'CONNECTION_ERROR'
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError(
      'Dados fornecidos são inválidos',
      'VALIDATION_ERROR'
    );
  }

  // Se não for um erro Prisma conhecido, retornar erro genérico
  return new DatabaseError(
    error.message || 'Erro desconhecido',
    'UNKNOWN_ERROR'
  );
}

// Função para logging de erros
export function logError(error: Error, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';
  
  console.error(`${timestamp}${contextStr} ${error.name}: ${error.message}`);
  
  if (error.stack) {
    console.error(error.stack);
  }
}

// Função para criar mensagens de erro amigáveis para usuários
export function getUserFriendlyMessage(error: DatabaseError): string {
  switch (error.code) {
    case 'UNIQUE_CONSTRAINT':
      return error.message;
    
    case 'FOREIGN_KEY_CONSTRAINT':
      return 'Não é possível realizar esta operação pois existem dados relacionados';
    
    case 'NOT_FOUND':
      return 'O item solicitado não foi encontrado';
    
    case 'REQUIRED_RELATION':
      return 'Todos os campos obrigatórios devem ser preenchidos';
    
    case 'VALUE_TOO_LONG':
      return 'Um ou mais valores fornecidos são muito longos';
    
    case 'CONNECTION_ERROR':
      return 'Erro de conexão com o banco de dados. Tente novamente em alguns instantes';
    
    case 'VALIDATION_ERROR':
      return 'Os dados fornecidos são inválidos. Verifique e tente novamente';
    
    default:
      return 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte';
  }
}