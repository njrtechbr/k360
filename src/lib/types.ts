
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
  path: string;
  active: boolean;
}

export const INITIAL_MODULES: Module[] = [
    { id: 'financeiro', name: 'Financeiro', description: 'Acesso a faturas e pagamentos.', path: '/dashboard/financeiro', active: true },
    { id: 'rh', name: 'Recursos Humanos', description: 'Gerenciamento de funcionários e folha de pagamento.', path: '/dashboard/rh', active: true },
    { id: 'estoque', name: 'Estoque', description: 'Controle de entrada e saída de produtos.', path: '/dashboard/estoque', active: true },
    { id: 'vendas', name: 'Vendas', description: 'Acesso a relatórios e dashboards de vendas.', path: '/dashboard/vendas', active: true },
    { id: 'pesquisa-satisfacao', name: 'Pesquisa de Satisfação', description: 'Gerenciamento de pesquisas de satisfação e avaliações.', path: '/dashboard/pesquisa-satisfacao', active: true },
];


export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real app
  role: Role;
  modules: string[]; // Will store module ids
}

export interface Attendant {
  id: string;
  name: string;
  email: string;
  active: boolean;
}
