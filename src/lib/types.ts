

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

export const ATTENDANT_STATUS = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ON_VACATION: 'Férias',
  AWAY: 'Afastado',
} as const;

export const FUNCOES = [
  'Escrevente II',
  'Auxiliar de cartório',
  'Escrevente',
  'Admin',
  'Escrevente I',
  'Tabelião Substituto',
  'Escrevente Agile',
  'Atendente',
  'Assistente administrativo',
] as const;

export const SETORES = [
    'escritura',
    'protesto',
    'procuração',
    'balcão',
    'agile',
    'administrativo',
] as const;


export type AttendantStatus = (typeof ATTENDANT_STATUS)[keyof typeof ATTENDANT_STATUS];
export type Funcao = (typeof FUNCOES)[number];
export type Setor = (typeof SETORES)[number];

export interface Attendant {
  id: string;
  name: string;
  email: string;
  funcao: Funcao;
  setor: Setor;
  status: AttendantStatus;
  avatarUrl: string;
  telefone: string;
  portaria: string;
  situacao: string;
  dataAdmissao: string; // Storing as ISO string
  dataNascimento: string; // Storing as ISO string
  rg: string;
  cpf: string;
}

export interface Evaluation {
  id: string;
  attendantId: string;
  nota: number;
  comentario: string;
  data: string; // Storing as ISO string for simplicity
}

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  isUnlocked: (attendant: Attendant, evaluations: Evaluation[], allEvaluations?: Evaluation[], allAttendants?: Attendant[]) => boolean;
  getProgress?: (attendant: Attendant, evaluations: Evaluation[], allEvaluations?: Evaluation[], allAttendants?: Attendant[]) => { current: number, target: number, text: string };
};
