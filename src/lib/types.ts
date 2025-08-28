
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  USER: 'usuario',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface Module {
  id: string;
  name: string;
  description: string;
}

// The static MODULES object is no longer needed as it will be dynamic.
export const INITIAL_MODULES: Module[] = [
    { id: 'financeiro', name: 'Financeiro', description: 'Acesso a faturas e pagamentos.' },
    { id: 'rh', name: 'Recursos Humanos', description: 'Gerenciamento de funcionários e folha de pagamento.' },
    { id: 'estoque', name: 'Estoque', description: 'Controle de entrada e saída de produtos.' },
    { id: 'vendas', name: 'Vendas', description: 'Acesso a relatórios e dashboards de vendas.' },
];


export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real app
  role: Role;
  modules: string[]; // Will store module ids
}
