
"use client";

import type { ReactNode } from "react";
import React, { useCallback, useState } from "react";
import type { User, Module, Role, Attendant } from "@/lib/types";
import { INITIAL_MODULES, ROLES, ATTENDANT_STATUS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";
const MODULES_STORAGE_KEY = "controle_acesso_modules";
const ATTENDANTS_STORAGE_KEY = "controle_acesso_attendants";

// Dummy users for initial seeding
const INITIAL_USERS: User[] = [
    {
      id: 'superadmin-01',
      name: 'Nereu Super Admin',
      email: 'super@email.com',
      password: 'password',
      role: ROLES.SUPERADMIN,
      modules: ['financeiro', 'rh', 'estoque', 'vendas', 'pesquisa-satisfacao'],
    },
    {
      id: 'admin-01',
      name: 'Ana Admin',
      email: 'admin@email.com',
      password: 'password',
      role: ROLES.ADMIN,
      modules: ['financeiro', 'rh', 'estoque', 'vendas', 'pesquisa-satisfacao'],
    },
    {
      id: 'supervisor-01',
      name: 'Carlos Supervisor',
      email: 'supervisor@email.com',
      password: 'password',
      role: ROLES.SUPERVISOR,
      modules: ['vendas', 'estoque'],
    },
    {
      id: 'user-01',
      name: 'Beatriz Usuário',
      email: 'usuario@email.com',
      password: 'password',
      role: ROLES.USER,
      modules: ['vendas'],
    },
     {
      id: 'user-02',
      name: 'Daniel Usuário',
      email: 'daniel@email.com',
      password: 'password',
      role: ROLES.USER,
      modules: ['financeiro'],
    }
];

const parseDate = (dateString: string | null) => {
    if (!dateString || dateString.toLowerCase() === 'não informado' || dateString.split('/').length !== 3) {
      return new Date(0).toISOString();
    }
    const parts = dateString.split('/');
    // new Date(year, monthIndex, day)
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).toISOString();
};


const INITIAL_ATTENDANTS: Attendant[] = [
  {
    id: "65a585d7-adce-4da7-837e-74c25516c7ad",
    name: "Ana Flávia de Souza",
    email: "anaflaviadesouza@outlook.com",
    funcao: "Escrevente II",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998050854",
    portaria: "116º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("23/02/2023"),
    dataNascimento: parseDate("12/10/2002"),
    rg: "2235185304 SSP/BA",
    cpf: "08727591565",
  },
  {
    id: "c1a09a74-7662-4fc5-be5f-c0c7288ad03b",
    name: "Ana Nery Conceição dos Santos",
    email: "ananeryconceicao030@gmail.com",
    funcao: "Auxiliar de cartório",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999795192",
    portaria: "160º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("14/05/2024"),
    dataNascimento: parseDate("14/10/1983"),
    rg: "1164544900 SSP/BA",
    cpf: "02356995510",
  },
  {
    id: "9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f",
    name: "Bruno Jhoel de Alencar Silva",
    email: "brunojhoel33@gmail.com",
    funcao: "Escrevente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999859270",
    portaria: "189º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("30/04/2025"),
    dataNascimento: parseDate("03/01/2007"),
    rg: "2249398909 SSP/BA",
    cpf: "11182108598",
  },
  {
    id: "8e8341e5-cec2-4e5e-ae1f-34b9f258b156",
    name: "Gabriele Batista de Sousa",
    email: "gabrielebatista2020@gmail.com",
    funcao: "Auxiliar de cartório",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "7799295003",
    portaria: "191º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("26/06/2025"),
    dataNascimento: parseDate("31/05/2004"),
    rg: "2306033358 SSP/AM",
    cpf: "08649008569",
  },
  {
    id: "858b83bb-cc07-4bfe-8a4e-f43cb4785087",
    name: "Nereu Jr (Admin)",
    email: "nnvljr86@gmail.com",
    funcao: "Admin",
    setor: "Administrativo",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "",
    portaria: "",
    situacao: "",
    dataAdmissao: parseDate(null),
    dataNascimento: parseDate(null),
    rg: "",
    cpf: "00000000001",
  },
  {
    id: "4c16287b-8e11-4646-8e9a-bb3ea41c608f",
    name: "Anderson Lisboa Silveira",
    email: "andersonlisboako@gmail.com",
    funcao: "Escrevente I",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999586915",
    portaria: "169º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("14/05/2024"),
    dataNascimento: parseDate("25/09/2000"),
    rg: "2226209786 SSP/BA",
    cpf: "08223279533",
  },
  {
    id: "0c767da5-69ae-43f0-bd8b-435b125c49aa",
    name: "Nereu Jr (Tabelião)",
    email: "contato@nereujr.com.br",
    funcao: "Tabelião Substituto",
    setor: "Administrativo",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "Não informado",
    portaria: "Não informado",
    situacao: "Não informado",
    dataAdmissao: parseDate(null),
    dataNascimento: parseDate(null),
    rg: "Não informado",
    cpf: "00000000002",
  },
  {
    id: "58cd3a1d-9214-4535-b8d8-6f9d9957a570",
    name: "Abrante Silva Miranda Marques",
    email: "abrantemarques22@gmail.com",
    funcao: "Tabelião Substituto",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "00000000000",
    portaria: "60º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("02/02/2021"),
    dataNascimento: parseDate("22/04/1993"),
    rg: "1507703830 SSP/BA",
    cpf: "04271161551",
  },
  {
    id: "56104014-5b03-494e-bab1-919da1dd9f02",
    name: "Alex Sandra Soares da Costa Silva",
    email: "leq_33@hotmail.com",
    funcao: "Escrevente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998654398",
    portaria: "173º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("03/02/2025"),
    dataNascimento: parseDate("17/09/1974"),
    rg: "08852219 SSP/MT",
    cpf: "86128230130",
  },
  {
    id: "f751e538-de54-4af3-8e3c-2903d550a9d5",
    name: "Allana Virginia Torres de Almeida",
    email: "allanavirginiatorresalmeida@gmail.com",
    funcao: "Escrevente Agile",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999172109",
    portaria: "59º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("02/02/2021"),
    dataNascimento: parseDate("05/10/1999"),
    rg: "1466480726 SSP/BA",
    cpf: "07887260566",
  },
  {
    id: "e9173dd2-59b1-43d8-bed6-931b03db0705",
    name: "Amanda Rosa de Miranda Rodrigues",
    email: "amandarosa122@gmail.com",
    funcao: "Escrevente I",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999442671",
    portaria: "175º",
    situacao: "asdad",
    dataAdmissao: parseDate("14/05/2024"),
    dataNascimento: parseDate("23/04/2001"),
    rg: "2170993274 SSP/BA",
    cpf: "08569644532",
  },
  {
    id: "10d6a02b-d440-463c-9738-210e5fff1429",
    name: "Bruna Mendes da Silva",
    email: "brunam471@gmail.com",
    funcao: "Escrevente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77988174965",
    portaria: "178º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("12/08/2024"),
    dataNascimento: parseDate("11/05/1984"),
    rg: "1263859984 SSP/BA",
    cpf: "01627994548",
  },
  {
    id: "70b5223e-7fb4-43c6-ac88-3513482a9139",
    name: "Deyse Karine de Souza Mota Silva",
    email: "deysekmota98@gmail.com",
    funcao: "Auxiliar de cartório",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999321437",
    portaria: "187º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("14/04/2025"),
    dataNascimento: parseDate("04/08/1997"),
    rg: "04211751506 SSP/BA",
    cpf: "04211751506",
  },
  {
    id: "00c33394-ced5-4786-a785-e6509b2fa631",
    name: "Larissa Gabrielly Romeiro Rocha",
    email: "lgabriellyromeiro@gmail.com",
    funcao: "Escrevente II",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77988546464",
    portaria: "180º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/02/2024"),
    dataNascimento: parseDate("26/03/1994"),
    rg: "2079227300 SSP/BA",
    cpf: "07064153530",
  },
  {
    id: "b3b0f332-322b-433f-b858-25f497d373bd",
    name: "Luana Bastos Tanan",
    email: "luanabastostanan@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998676333",
    portaria: "54º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/03/2020"),
    dataNascimento: parseDate("31/01/1985"),
    rg: "1293884162 SSP/BA",
    cpf: "04630741577",
  },
  {
    id: "6588666a-920b-4fd1-b2b5-024e894d2c20",
    name: "Luana Ferreira da Silva",
    email: "luafsilva2014@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77991718636",
    portaria: "104º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("19/09/2022"),
    dataNascimento: parseDate("25/05/1996"),
    rg: "1508453675 SSP/BA",
    cpf: "06807759517",
  },
  {
    id: "f78dade2-8aea-45b0-bd64-307f7024697c",
    name: "Lucas Carneiro da Silva",
    email: "lucastecseguro@outlook.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999545534",
    portaria: "151º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/02/2024"),
    dataNascimento: parseDate("05/04/1995"),
    rg: "4137124 SSP/BA",
    cpf: "11809811627",
  },
  {
    id: "64a10ce1-5d8b-4675-94f7-965e7ed14afa",
    name: "Lucas Lima Santos",
    email: "lucaslimalsantos@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "61991766252",
    portaria: "181º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("14/05/2024"),
    dataNascimento: parseDate("05/02/2001"),
    rg: "3769405 SSP/DF",
    cpf: "07320380145",
  },
  {
    id: "dc1a56bb-64f6-4b79-9b2f-87c0bd571bec",
    name: "Lucas de Oliveira Silva",
    email: "lucas.musiclem@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998358433",
    portaria: "113º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("23/02/2023"),
    dataNascimento: parseDate("11/08/1998"),
    rg: "163754809 SSP/BA",
    cpf: "07908731503",
  },
  {
    id: "37724988-65b4-4d24-9df6-d67915e52184",
    name: "Lucas Vinícius Muller Petrolli",
    email: "lucasviniciusmuller@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999793020",
    portaria: "131º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/11/2023"),
    dataNascimento: parseDate("09/04/1998"),
    rg: "2363404416 SSP/BA",
    cpf: "06138168119",
  },
  {
    id: "8773973a-9a4e-436e-bd93-37150645852b",
    name: "Rita de Kassia de Sousa",
    email: "kassiasousa133@gmail.com",
    funcao: "Escrevente I",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "(99) 98803-4682",
    portaria: "136º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("08/01/2024"),
    dataNascimento: parseDate("13/11/2001"),
    rg: "0608651920163 SSP/MA",
    cpf: "62575251362",
  },
  {
    id: "a2d64a83-4efd-47ea-a6f7-ba9f0c20fbc1",
    name: "Marielly Vitória Freire de Souza",
    email: "mariellyvitoria439@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999542543",
    portaria: "162º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("15/05/2024"),
    dataNascimento: parseDate("03/04/2008"),
    rg: "2314760433 SSP/BA",
    cpf: "09972926524",
  },
  {
    id: "9f4782fa-8eec-4c10-b5df-f3e923b5a61d",
    name: "Nayla da Cruz Oliveira",
    email: "nyla.cruz@hotmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998401521",
    portaria: "179º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("02/09/2024"),
    dataNascimento: parseDate("14/01/1996"),
    rg: "1467033324 SSP/BA",
    cpf: "06038711511",
  },
  {
    id: "45206560-803e-42ea-9c53-32b39881983f",
    name: "Pedro Henrique Orrios Chaves",
    email: "pc875177@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "12991068804",
    portaria: "163º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("09/07/2024"),
    dataNascimento: parseDate("24/08/2006"),
    rg: "596343279 SSP/SP",
    cpf: "54325396837",
  },
  {
    id: "1bd0b98f-f552-48f2-a10c-6ca9943a6785",
    name: "Rangell Nunes de Miranda",
    email: "rangellnunes1997@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998592843",
    portaria: "177º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("03/02/2025"),
    dataNascimento: parseDate("24/05/1997"),
    rg: "2129946119 SSP/BA",
    cpf: "41460213831",
  },
  {
    id: "39c0596d-7b90-4e17-b14c-a7b78bba260c",
    name: "Rodrigo Santos de Barros",
    email: "rsbarros93@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998182951",
    portaria: "13º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/08/2017"),
    dataNascimento: parseDate("01/09/1993"),
    rg: "3673166 SSP/BA",
    cpf: "06030794582",
  },
  {
    id: "462ebd6e-1807-4e4a-8de5-6046c5cfa6bf",
    name: "Vitória Alda de Arruda Bertoldo",
    email: "vitoriaarruda473@gmail.com",
    funcao: "Atendente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "6782236860",
    portaria: "188º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("24/04/2025"),
    dataNascimento: parseDate("23/02/1982"),
    rg: "1574153 SSP/MS",
    cpf: "92631371100",
  },
  {
    id: "1b401bde-7a25-41c7-8683-6ec1c4275c04",
    name: "Claudiana da Silva Pereira",
    email: "klaudiana17silva@outlook.com",
    funcao: "Escrevente I",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999121632",
    portaria: "135º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("08/01/2024"),
    dataNascimento: parseDate("31/05/1990"),
    rg: "1620432870 SSP/BA",
    cpf: "05801756507",
  },
  {
    id: "df74203e-e924-4dce-9fc7-38737b11e14d",
    name: "Paloma Vitoria Almeida Bech",
    email: "palomavitriaalmeida@gmail.com",
    funcao: "Assistente administrativo",
    setor: "",
    status: ATTENDANT_STATUS.INACTIVE,
    avatarUrl: "",
    telefone: "21965365167",
    portaria: "190º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("02/05/2025"),
    dataNascimento: parseDate("15/04/1999"),
    rg: "285871927 SSP/RJ",
    cpf: "15604190756",
  },
  {
    id: "a4da244f-1b6e-4a36-8a71-a81525302e45",
    name: "Pâmila Ferreira Nepomuceno",
    email: "pamilaferreiranepomuceno@gmail.com",
    funcao: "Assistente administrativo",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998733955",
    portaria: "140º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("02/05/2024"),
    dataNascimento: parseDate("05/06/1985"),
    rg: "1177217864 SSP/BA",
    cpf: "01662227558",
  },
  {
    id: "98b4d9d1-b586-4bd8-b028-e753313d2bff",
    name: "Davi Gomes Prado Peixoto",
    email: "davigomesprado2002@gmail.com",
    funcao: "Escrevente",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "61981189820",
    portaria: "158º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("14/05/2024"),
    dataNascimento: parseDate("03/04/1987"),
    rg: "11383228 SSP/BA",
    cpf: "03351227523",
  },
  {
    id: "94c3bea1-94dc-4ab4-b102-04a90da009b2",
    name: "Ary Koerner Nogueira de Oliveira Neto",
    email: "imoveis_arykoerner@yahoo.com.br",
    funcao: "Tabelião Substituto",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "00000000000",
    portaria: "01º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("10/03/2017"),
    dataNascimento: parseDate("11/10/1962"),
    rg: "765736 SSP/PB",
    cpf: "34293280472",
  },
  {
    id: "beb0a43f-8f30-48a8-aeda-ddc1f59a2635",
    name: "Evelyn Joanne Bezerra de Souza",
    email: "evelynsouzadireito03@gmail.com",
    funcao: "Escrevente II",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999177915",
    portaria: "102º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("31/08/2022"),
    dataNascimento: parseDate("20/03/1998"),
    rg: "14822364212 SSP/BA",
    cpf: "86112052512",
  },
  {
    id: "77e24992-7633-4853-b37e-b30c378f0f03",
    name: "Elen da Silva Nascimento",
    email: "elennilma619@gmail.com",
    funcao: "Escrevente I",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77999810797",
    portaria: "176º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/02/2024"),
    dataNascimento: parseDate("29/12/2003"),
    rg: "2299415599 SSP/BA",
    cpf: "10107781530",
  },
  {
    id: "7c10ab8b-61ae-4f9f-96e8-e0f772abbbb5",
    name: "Décio Deivis Coelho de Souza",
    email: "decio.deivis1996@gmail.com",
    funcao: "Escrevente I",
    setor: "",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "77998195875",
    portaria: "149º",
    situacao: "Nomeação",
    dataAdmissao: parseDate("01/02/2024"),
    dataNascimento: parseDate("29/04/1996"),
    rg: "1653309539 SSP/BA",
    cpf: "05765538592",
  },
];




interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  allUsers: User[];
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  hasSuperAdmin: () => boolean;
  modules: Module[];
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  attendants: Attendant[];
  addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<void>;
  updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
  deleteAttendant: (attendantId: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const getUsersFromStorage = useCallback((): User[] => {
    if (typeof window === "undefined") return [];
    try {
      const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
      if (usersJson) {
          return JSON.parse(usersJson);
      }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    } catch (error) {
      console.error("Failed to parse users from localStorage", error);
      return INITIAL_USERS;
    }
  }, []);

  const getModulesFromStorage = useCallback((): Module[] => {
    if (typeof window === "undefined") return [];
    try {
      const modulesJson = localStorage.getItem(MODULES_STORAGE_KEY);
      if (modulesJson) {
        return JSON.parse(modulesJson);
      }
      localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(INITIAL_MODULES));
      return INITIAL_MODULES;
    } catch (error) {
      console.error("Failed to parse modules from localStorage", error);
      return INITIAL_MODULES;
    }
  }, []);

  const getAttendantsFromStorage = useCallback((): Attendant[] => {
    if (typeof window === "undefined") return [];
    try {
      const attendantsJson = localStorage.getItem(ATTENDANTS_STORAGE_KEY);
      if (attendantsJson) {
        return JSON.parse(attendantsJson);
      }
      localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANTS));
      return INITIAL_ATTENDANTS;
    } catch (error) {
      console.error("Failed to parse attendants from localStorage", error);
      return INITIAL_ATTENDANTS;
    }
  }, []);

  const saveUsersToStorage = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    setAllUsers(users);
  };

  const saveModulesToStorage = (modules: Module[]) => {
    localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
    setModules(modules);
  };

  const saveAttendantsToStorage = (attendants: Attendant[]) => {
    localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(attendants));
    setAttendants(attendants);
  }
  
  const hasSuperAdmin = (): boolean => {
    const users = getUsersFromStorage();
    return users.some(u => u.role === 'superadmin');
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAllUsers(getUsersFromStorage());
      setModules(getModulesFromStorage());
      setAttendants(getAttendantsFromStorage());

      const sessionJson = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionJson) {
        try {
          setUser(JSON.parse(sessionJson));
        } catch (error) {
          console.error("Failed to parse session from localStorage", error);
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
      setLoading(false);
    }
  }, [getUsersFromStorage, getModulesFromStorage, getAttendantsFromStorage]);

  const login = async (email: string, password: string): Promise<void> => {
    const users = getUsersFromStorage();
    const foundUser = users.find((u) => u.email === email);

    if (foundUser && foundUser.password === password) {
      setUser(foundUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(foundUser));
      toast({
        title: "Login bem-sucedido!",
        description: `Bem-vindo de volta, ${foundUser.name}.`,
      });
      router.push("/dashboard");
    } else {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Email ou senha incorretos.",
      });
      throw new Error("Credenciais inválidas");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    router.push("/login");
    toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
    })
  };

  const register = async (userData: Omit<User, "id">): Promise<void> => {
    const currentUsers = getUsersFromStorage();
    if (currentUsers.find((u) => u.email === userData.email)) {
      toast({
        variant: "destructive",
        title: "Erro no registro",
        description: "Este email já está em uso.",
      });
      throw new Error("Email já cadastrado");
    }

    const newUser: User = {
      ...userData,
      id: new Date().toISOString(),
      modules: userData.role === 'superadmin' ? modules.map(m => m.id) : userData.modules,
    };

    const newUsers = [...currentUsers, newUser];
    saveUsersToStorage(newUsers);
    
    if (!user) { // This means a public registration
        setUser(newUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
        toast({
            title: "Registro bem-sucedido!",
            description: `Bem-vindo, ${newUser.name}.`,
        });
        router.push("/dashboard");
    } else { // This means an admin is creating a user
        toast({
            title: "Usuário Criado!",
            description: `O usuário ${newUser.name} foi criado com sucesso.`,
        });
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    if (!user) {
        throw new Error("Usuário não autenticado");
    }
    
    let updatedUsers = allUsers.map(u => {
        if(u.id === user.id) {
            return { ...u, ...userData };
        }
        return u;
    });

    saveUsersToStorage(updatedUsers);
    
    const updatedSessionUser = { ...user, ...userData };
    setUser(updatedSessionUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessionUser));

    toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
    });
  };

  const updateUser = async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
    let updatedUsers = allUsers.map(u => u.id === userId ? { ...u, ...userData } : u);
    saveUsersToStorage(updatedUsers);

    if (user && user.id === userId) {
      const updatedSessionUser = { ...user, ...userData };
      setUser(updatedSessionUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessionUser));
    }

    toast({
      title: "Usuário Atualizado!",
      description: "Os dados do usuário foram atualizados com sucesso.",
    });
  };

  const deleteUser = async (userId: string) => {
    if(user?.id === userId) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode excluir sua própria conta.",
      });
      throw new Error("Auto-exclusão não é permitida");
    }
    
    let updatedUsers = allUsers.filter(u => u.id !== userId);
    saveUsersToStorage(updatedUsers);

    toast({
      title: "Usuário Excluído!",
      description: "O usuário foi removido do sistema.",
    });
  };

  const addModule = async (moduleData: Omit<Module, 'id' | 'active'>) => {
    const currentModules = getModulesFromStorage();
    if (currentModules.find(m => m.name.toLowerCase() === moduleData.name.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Erro ao adicionar módulo",
            description: "Um módulo com este nome já existe.",
        });
        throw new Error("Módulo já existe");
    }

    const newModule: Module = {
        ...moduleData,
        id: moduleData.name.toLowerCase().replace(/\s+/g, '-'),
        active: true,
    }

    const newModules = [...currentModules, newModule];
    saveModulesToStorage(newModules);
    toast({
        title: "Módulo Adicionado!",
        description: `O módulo "${newModule.name}" foi criado com sucesso.`
    });
  }

  const updateModule = async (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => {
    const currentModules = getModulesFromStorage();
    
    if (moduleData.name && currentModules.some(m => m.id !== moduleId && m.name.toLowerCase() === moduleData.name?.toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar módulo",
        description: "Um módulo com este nome já existe.",
      });
      throw new Error("Nome do módulo já existe");
    }
    
    const newModules = currentModules.map(m => 
        m.id === moduleId ? { ...m, ...moduleData } : m
    );
    saveModulesToStorage(newModules);

    toast({
        title: "Módulo Atualizado!",
        description: `O módulo foi atualizado com sucesso.`
    });
  }

  const toggleModuleStatus = async (moduleId: string) => {
    const currentModules = getModulesFromStorage();
    const newModules = currentModules.map(m => 
        m.id === moduleId ? { ...m, active: !m.active } : m
    );
    saveModulesToStorage(newModules);
    toast({
        title: "Status do Módulo Alterado!",
        description: "O status do módulo foi atualizado."
    });
  };

  const deleteModule = async (moduleId: string) => {
    const currentModules = getModulesFromStorage();
    const newModules = currentModules.filter(m => m.id !== moduleId);
    saveModulesToStorage(newModules);

    const updatedUsers = allUsers.map(u => ({
        ...u,
        modules: u.modules.filter(mId => mId !== moduleId),
    }));
    saveUsersToStorage(updatedUsers);

    if (user && user.modules.includes(moduleId)) {
      const updatedUser = {
        ...user,
        modules: user.modules.filter(mId => mId !== moduleId),
      };
      setUser(updatedUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    toast({
        title: "Módulo Removido!",
        description: "O módulo foi removido do sistema e dos usuários."
    });
  }

  const addAttendant = async (attendantData: Omit<Attendant, 'id'>) => {
    const currentAttendants = getAttendantsFromStorage();
    if (currentAttendants.some(a => a.email.toLowerCase() === attendantData.email.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Erro ao adicionar atendente",
            description: "Um atendente com este email já existe.",
        });
        throw new Error("Atendente já existe");
    }
     if (currentAttendants.some(a => a.cpf === attendantData.cpf)) {
        toast({
            variant: "destructive",
            title: "Erro ao adicionar atendente",
            description: "Um atendente com este CPF já existe.",
        });
        throw new Error("CPF já existe");
    }

    const newAttendant: Attendant = {
        ...attendantData,
        id: new Date().toISOString(),
    }

    const newAttendants = [...currentAttendants, newAttendant];
    saveAttendantsToStorage(newAttendants);
    toast({
        title: "Atendente Adicionado!",
        description: `O atendente "${newAttendant.name}" foi adicionado com sucesso.`
    });
  };

  const updateAttendant = async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
      const currentAttendants = getAttendantsFromStorage();

      if (attendantData.email && currentAttendants.some(a => a.id !== attendantId && a.email.toLowerCase() === attendantData.email?.toLowerCase())) {
        toast({ variant: "destructive", title: "Erro", description: "Email já cadastrado." });
        throw new Error("Email já existe");
      }
      if (attendantData.cpf && currentAttendants.some(a => a.id !== attendantId && a.cpf === attendantData.cpf)) {
        toast({ variant: "destructive", title: "Erro", description: "CPF já cadastrado." });
        throw new Error("CPF já existe");
      }

      const newAttendants = currentAttendants.map(a =>
          a.id === attendantId ? { ...a, ...attendantData } : a
      );
      saveAttendantsToStorage(newAttendants);
      toast({
          title: "Atendente Atualizado!",
          description: "Os dados do atendente foram atualizados."
      });
  };

  const deleteAttendant = async (attendantId: string) => {
      const currentAttendants = getAttendantsFromStorage();
      const newAttendants = currentAttendants.filter(a => a.id !== attendantId);
      saveAttendantsToStorage(newAttendants);
      toast({
          title: "Atendente Removido!",
          description: "O atendente foi removido do sistema."
      });
  };

  const value = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    register,
    updateProfile,
    allUsers,
    updateUser,
    deleteUser,
    hasSuperAdmin,
    modules,
    addModule,
    updateModule,
    toggleModuleStatus,
    deleteModule,
    attendants,
    addAttendant,
    updateAttendant,
    deleteAttendant,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

    