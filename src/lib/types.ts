
import { z } from "zod";

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
    { id: 'rh', name: 'Recursos Humanos', description: 'Gerenciamento de atendentes e funcionários.', path: '/dashboard/rh', active: true },
    { id: 'pesquisa-satisfacao', name: 'Pesquisa de Satisfação', description: 'Gerenciamento de pesquisas de satisfação e avaliações.', path: '/dashboard/pesquisa-satisfacao', active: true },
    { id: 'gamificacao', name: 'Gamificação', description: 'Acompanhe o ranking, o progresso e as recompensas da equipe.', path: '/dashboard/gamificacao', active: true },
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

export const INITIAL_FUNCOES: string[] = [
  'Escrevente II',
  'Auxiliar de cartório',
  'Escrevente',
  'Admin',
  'Escrevente I',
  'Tabelião Substituto',
  'Escrevente Agile',
  'Atendente',
  'Assistente administrativo',
];

export const INITIAL_SETORES: string[] = [
    'escritura',
    'protesto',
    'procuração',
    'balcão',
    'agile',
    'administrativo',
];


export type AttendantStatus = (typeof ATTENDANT_STATUS)[keyof typeof ATTENDANT_STATUS];
export type Funcao = string;
export type Setor = string;

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
  xpGained: number; // XP calculated at the time of evaluation
  importId?: string; // Optional ID to link to an import batch
}

export const AnalyzeEvaluationInputSchema = z.object({
  rating: z.number().min(1).max(5).describe('A nota em estrelas, de 1 a 5.'),
  comment: z.string().describe('O comentário deixado pelo cliente.'),
});
export type AnalyzeEvaluationInput = z.infer<typeof AnalyzeEvaluationInputSchema>;

export const AnalyzeEvaluationOutputSchema = z.object({
  sentiment: z.enum(['Positivo', 'Negativo', 'Neutro']).describe('A classificação do sentimento do comentário.'),
  summary: z.string().describe('Um resumo conciso de uma frase do comentário.'),
});
export type AnalyzeEvaluationOutput = z.infer<typeof AnalyzeEvaluationOutputSchema>;


export type EvaluationAnalysis = {
  evaluationId: string;
  sentiment: 'Positivo' | 'Negativo' | 'Neutro';
  summary: string;
  analyzedAt: string; // ISO string
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  xp: number; // XP concedido ao desbloquear
  active: boolean; // Controla se a conquista está ativa no sistema
  isUnlocked: (
    attendant: Attendant, 
    attendantEvaluations: Evaluation[], 
    allEvaluations?: Evaluation[], 
    allAttendants?: Attendant[],
    aiAnalysisResults?: EvaluationAnalysis[]
  ) => boolean;
};

export interface UnlockedAchievement {
    id: string; // a unique id for this unlock event
    attendantId: string;
    achievementId: string;
    unlockedAt: string; // ISO string date
    xpGained: number;
}


export type LevelReward = {
    level: number;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    active: boolean;
};

export interface GamificationSeason {
    id: string;
    name: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    active: boolean;
    xpMultiplier: number;
}

export interface GamificationConfig {
  ratingScores: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  achievements: Achievement[];
  levelRewards: LevelReward[];
  seasons: GamificationSeason[];
  globalXpMultiplier: number;
}

export interface EvaluationImport {
  id: string;
  importedBy: string; // User ID
  importedAt: string; // ISO String
  fileName: string;
  evaluationIds: string[];
  attendantMap: Record<string, string>; // Maps CSV agent name to system attendant ID
}
