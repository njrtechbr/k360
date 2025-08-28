
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  USER: 'usuario',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const MODULES = {
  FINANCEIRO: 'financeiro',
  RH: 'rh',
  ESTOQUE: 'estoque',
  VENDAS: 'vendas',
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real app
  role: Role;
  modules: Module[];
}
