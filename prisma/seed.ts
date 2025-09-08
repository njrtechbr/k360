import { PrismaClient } from '@prisma/client';
import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from '../src/lib/achievements';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

const INITIAL_MODULES = [
  {
    id: 'rh',
    name: 'Recursos Humanos',
    description: 'Gerenciamento de atendentes e funcionários.',
    path: '/dashboard/rh',
    active: true
  },
  {
    id: 'pesquisa-satisfacao',
    name: 'Pesquisa de Satisfação',
    description: 'Gerenciamento de pesquisas de satisfação e avaliações.',
    path: '/dashboard/pesquisa-satisfacao',
    active: true
  },
  {
    id: 'gamificacao',
    name: 'Gamificação',
    description: 'Acompanhe o ranking, o progresso e as recompensas da equipe.',
    path: '/dashboard/gamificacao',
    active: true
  }
];

const INITIAL_FUNCOES = [
  'Escrevente II',
  'Auxiliar de cartório',
  'Escrevente',
  'Admin',
  'Escrevente I',
  'Tabelião Substituto',
  'Escrevente Agile',
  'Atendente',
  'Assistente administrativo'
];

const INITIAL_SETORES = [
  'escritura',
  'protesto',
  'procuração',
  'balcão',
  'agile',
  'administrativo'
];

const INITIAL_XP_TYPES = [
  {
    name: 'Excelência no Atendimento',
    description: 'Reconhecimento por atendimento excepcional ao cliente',
    points: 10,
    category: 'atendimento',
    icon: 'star',
    color: '#FFD700'
  },
  {
    name: 'Iniciativa',
    description: 'Reconhecimento por tomar iniciativa em situações importantes',
    points: 8,
    category: 'lideranca',
    icon: 'lightbulb',
    color: '#FF6B35'
  },
  {
    name: 'Trabalho em Equipe',
    description: 'Reconhecimento por colaboração excepcional com colegas',
    points: 6,
    category: 'colaboracao',
    icon: 'users',
    color: '#4ECDC4'
  },
  {
    name: 'Melhoria de Processo',
    description: 'Reconhecimento por sugerir ou implementar melhorias',
    points: 12,
    category: 'inovacao',
    icon: 'settings',
    color: '#45B7D1'
  },
  {
    name: 'Pontualidade Exemplar',
    description: 'Reconhecimento por pontualidade consistente',
    points: 5,
    category: 'disciplina',
    icon: 'clock',
    color: '#96CEB4'
  },
  {
    name: 'Resolução de Problemas',
    description: 'Reconhecimento por resolver problemas complexos',
    points: 15,
    category: 'competencia',
    icon: 'puzzle',
    color: '#FFEAA7'
  }
];

const INITIAL_SEASONS = [
  {
    name: 'Temporada Agosto 2025',
    startDate: new Date('2025-08-01T00:00:00.000Z'),
    endDate: new Date('2025-08-31T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Setembro 2025',
    startDate: new Date('2025-09-01T00:00:00.000Z'),
    endDate: new Date('2025-09-30T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Outubro 2025',
    startDate: new Date('2025-10-01T00:00:00.000Z'),
    endDate: new Date('2025-10-31T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Novembro 2025',
    startDate: new Date('2025-11-01T00:00:00.000Z'),
    endDate: new Date('2025-11-30T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Dezembro 2025',
    startDate: new Date('2025-12-01T00:00:00.000Z'),
    endDate: new Date('2025-12-31T23:59:59.999Z'),
    active: true,
    xpMultiplier: 1.5
  }
];

const INITIAL_ATTENDANTS = [
  {
    id: '00c33394-ced5-4786-a785-e6509b2fa631',
    name: 'Larissa Gabrielly Romeiro Rocha',
    email: 'lgabriellyromeiro@gmail.com',
    funcao: 'Escrevente II',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755093509442_t7894obzryp.png',
    telefone: '77988546464',
    portaria: '180º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-02-01'),
    dataNascimento: new Date('1994-03-26'),
    rg: '2079227300 SSP/BA',
    cpf: '07064153530'
  },
  {
    id: '10d6a02b-d440-463c-9738-210e5fff1429',
    name: 'Bruna Mendes da Silva',
    email: 'brunam471@gmail.com',
    funcao: 'Escrevente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089655499_frkxb93j1cp.png',
    telefone: '77988174965',
    portaria: '178º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-08-12'),
    dataNascimento: new Date('1984-05-11'),
    rg: '1263859984 SSP/BA',
    cpf: '01627994548'
  },
  {
    id: '1b401bde-7a25-41c7-8683-6ec1c4275c04',
    name: 'Claudiana da Silva Pereira',
    email: 'klaudiana17silva@outlook.com',
    funcao: 'Escrevente I',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089710981_fdwpgdd83d4.png',
    telefone: '77999121632',
    portaria: '135º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-01-08'),
    dataNascimento: new Date('1990-05-31'),
    rg: '1620432870 SSP/BA',
    cpf: '05801756507'
  },
  {
    id: '1bd0b98f-f552-48f2-a10c-6ca9943a6785',
    name: 'Rangell Nunes de Miranda',
    email: 'rangellnunes1997@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77998592843',
    portaria: '177º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2025-02-03'),
    dataNascimento: new Date('1997-05-24'),
    rg: '2129946119 SSP/BA',
    cpf: '41460213831'
  },
  {
    id: '37724988-65b4-4d24-9df6-d67915e52184',
    name: 'Lucas Vinícius Muller Petrolli',
    email: 'lucasviniciusmuller@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77999793020',
    portaria: '131º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2023-11-01'),
    dataNascimento: new Date('1998-04-09'),
    rg: '2363404416 SSP/BA',
    cpf: '06138168119'
  },
  {
    id: '39c0596d-7b90-4e17-b14c-a7b78bba260c',
    name: 'Rodrigo Santos de Barros',
    email: 'rsbarros93@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77998182951',
    portaria: '13º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2017-08-01'),
    dataNascimento: new Date('1993-09-01'),
    rg: '3673166 SSP/BA',
    cpf: '06030794582'
  },
  {
    id: '45206560-803e-42ea-9c53-32b39881983f',
    name: 'Pedro Henrique Orrios Chaves',
    email: 'pc875177@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '12991068804',
    portaria: '163º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-07-09'),
    dataNascimento: new Date('2006-08-24'),
    rg: '596343279 SSP/SP',
    cpf: '54325396837'
  },
  {
    id: '462ebd6e-1807-4e4a-8de5-6046c5cfa6bf',
    name: 'Vitória Alda de Arruda Bertoldo',
    email: 'vitoriaarruda473@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '6782236860',
    portaria: '188º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2025-04-24'),
    dataNascimento: new Date('1982-02-23'),
    rg: '1574153 SSP/MS',
    cpf: '92631371100'
  },
  {
    id: '4c16287b-8e11-4646-8e9a-bb3ea41c608f',
    name: 'Anderson Lisboa Silveira',
    email: 'andersonlisboako@gmail.com',
    funcao: 'Escrevente I',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755010814998_aq103w2hwe7.png',
    telefone: '77999586915',
    portaria: '169º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-05-14'),
    dataNascimento: new Date('2000-09-25'),
    rg: '2226209786 SSP/BA',
    cpf: '08223279533'
  },
  {
    id: '56104014-5b03-494e-bab1-919da1dd9f02',
    name: 'Alex Sandra Soares da Costa Silva',
    email: 'leq_33@hotmail.com',
    funcao: 'Escrevente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089133805_yhisxs8eyeo.png',
    telefone: '77998654398',
    portaria: '173º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2025-02-03'),
    dataNascimento: new Date('1974-09-17'),
    rg: '08852219 SSP/MT',
    cpf: '86128230130'
  },
  {
    id: '64a10ce1-5d8b-4675-94f7-965e7ed14afa',
    name: 'Lucas Lima Santos',
    email: 'lucaslimalsantos@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '61991766252',
    portaria: '181º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-05-14'),
    dataNascimento: new Date('2001-02-05'),
    rg: '3769405 SSP/DF',
    cpf: '07320380145'
  },
  {
    id: '6588666a-920b-4fd1-b2b5-024e894d2c20',
    name: 'Luana Ferreira da Silva',
    email: 'luafsilva2014@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77991718636',
    portaria: '104º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2022-09-19'),
    dataNascimento: new Date('1996-05-25'),
    rg: '1508453675 SSP/BA',
    cpf: '06807759517'
  },
  {
    id: '65a585d7-adce-4da7-837e-74c25516c7ad',
    name: 'Ana Flávia de Souza',
    email: 'anaflaviadesouza@outlook.com',
    funcao: 'Escrevente II',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089556877_p2h5atf2nxj.PNG',
    telefone: '77998050854',
    portaria: '116º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2023-02-23'),
    dataNascimento: new Date('2002-10-12'),
    rg: '2235185304 SSP/BA',
    cpf: '08727591565'
  },
  {
    id: '70b5223e-7fb4-43c6-ac88-3513482a9139',
    name: 'Deyse Karine de Souza Mota Silva',
    email: 'deysekmota98@gmail.com',
    funcao: 'Auxiliar de cartório',
    setor: 'administrativo',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089810226_pllya2ai5l.jpg',
    telefone: '77999321437',
    portaria: '187º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2025-04-14'),
    dataNascimento: new Date('1997-08-04'),
    rg: '04211751506 SSP/BA',
    cpf: '04211751506'
  },
  {
    id: '77e24992-7633-4853-b37e-b30c378f0f03',
    name: 'Elen da Silva Nascimento',
    email: 'elennilma619@gmail.com',
    funcao: 'Escrevente I',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755011154510_shl55hncxok.png',
    telefone: '77999810797',
    portaria: '176º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-02-01'),
    dataNascimento: new Date('2003-12-29'),
    rg: '2299415599 SSP/BA',
    cpf: '10107781530'
  },
  {
    id: '7c10ab8b-61ae-4f9f-96e8-e0f772abbbb5',
    name: 'Décio Deivis Coelho de Souza',
    email: 'decio.deivis1996@gmail.com',
    funcao: 'Escrevente I',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089892321_6firenspecy.png',
    telefone: '77998195875',
    portaria: '149º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-02-01'),
    dataNascimento: new Date('1996-04-29'),
    rg: '1653309539 SSP/BA',
    cpf: '05765538592'
  },
  {
    id: '8773973a-9a4e-436e-bd93-37150645852b',
    name: 'Rita de Kassia de Sousa',
    email: 'kassiasousa133@gmail.com',
    funcao: 'Escrevente I',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1754993724956_4ua4os1uclr.png',
    telefone: '(99) 98803-4682',
    portaria: '136º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-01-08'),
    dataNascimento: new Date('2001-11-13'),
    rg: '0608651920163 SSP/MA',
    cpf: '62575251362'
  },
  {
    id: '8e8341e5-cec2-4e5e-ae1f-34b9f258b156',
    name: 'Gabriele Batista de Sousa',
    email: 'gabrielebatista2020@gmail.com',
    funcao: 'Auxiliar de cartório',
    setor: 'administrativo',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755091961523_uzow1lvi8ls.png',
    telefone: '7799295003',
    portaria: '191º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2025-06-26'),
    dataNascimento: new Date('2004-05-31'),
    rg: '2306033358 SSP/ AM',
    cpf: '08649008569'
  },
  {
    id: '8f33c31e-76ca-47fc-9ab7-16ff17003d70',
    name: 'Geiverson dos Santos Eufrásio',
    email: 'geiverson12@gmail.com',
    funcao: 'Escrevente Agile',
    setor: 'agile',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755092132354_tg82xbpcpko.png',
    telefone: '00000000000',
    portaria: '21º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2018-03-16'),
    dataNascimento: new Date('1987-12-15'),
    rg: '1324815531 SSP/BA',
    cpf: '02528763506'
  },
  {
    id: '98b4d9d1-b586-4bd8-b028-e753313d2bff',
    name: 'Davi Gomes Prado Peixoto',
    email: 'davigomesprado2002@gmail.com',
    funcao: 'Escrevente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089739680_gkym5herrff.png',
    telefone: '61981189820',
    portaria: '158º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-05-14'),
    dataNascimento: new Date('1987-04-03'),
    rg: '11383228 SSP/BA',
    cpf: '03351227523'
  },
  {
    id: '9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f',
    name: 'Bruno Jhoel de Alencar Silva',
    email: 'brunojhoel33@gmail.com',
    funcao: 'Escrevente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089681166_yfid6xdw67.jpg',
    telefone: '77999859270',
    portaria: '189º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2025-04-30'),
    dataNascimento: new Date('2007-01-03'),
    rg: '2249398909 SSP/BA',
    cpf: '11182108598'
  },
  {
    id: '9f4782fa-8eec-4c10-b5df-f3e923b5a61d',
    name: 'Nayla da Cruz Oliveira',
    email: 'nyla.cruz@hotmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77998401521',
    portaria: '179º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-09-02'),
    dataNascimento: new Date('1996-01-14'),
    rg: '1467033324 SSP/BA',
    cpf: '06038711511'
  },
  {
    id: 'a2d64a83-4efd-47ea-a6f7-ba9f0c20fbc1',
    name: 'Marielly Vitória Freire de Souza',
    email: 'mariellyvitoria439@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77999542543',
    portaria: '162º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-05-15'),
    dataNascimento: new Date('2008-04-03'),
    rg: '2314760433 SSP/BA',
    cpf: '09972926524'
  },
  {
    id: 'b3b0f332-322b-433f-b858-25f497d373bd',
    name: 'Luana Bastos Tanan',
    email: 'luanabastostanan@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77998676333',
    portaria: '54º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2020-03-01'),
    dataNascimento: new Date('1985-01-31'),
    rg: '1293884162 SSP/BA',
    cpf: '04630741577'
  },
  {
    id: 'beb0a43f-8f30-48a8-aeda-ddc1f59a2635',
    name: 'Evelyn Joanne Bezerra de Souza',
    email: 'evelynsouzadireito03@gmail.com',
    funcao: 'Escrevente II',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755090295748_j87p34evjx.png',
    telefone: '77999177915',
    portaria: '102º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2022-08-31'),
    dataNascimento: new Date('1998-03-20'),
    rg: '14822364212 SSP/BA',
    cpf: '86112052512'
  },
  {
    id: 'c1a09a74-7662-4fc5-be5f-c0c7288ad03b',
    name: 'Ana Nery Conceição dos Santos',
    email: 'ananeryconceicao030@gmail.com',
    funcao: 'Auxiliar de cartório',
    setor: 'administrativo',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089586378_grdidhlgmd.png',
    telefone: '77999795192',
    portaria: '160º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-05-14'),
    dataNascimento: new Date('1983-10-14'),
    rg: '1164544900 SSP/BA',
    cpf: '02356995510'
  },
  {
    id: 'dc1a56bb-64f6-4b79-9b2f-87c0bd571bec',
    name: 'Lucas de Oliveira Silva',
    email: 'lucas.musiclem@gmail.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77998358433',
    portaria: '113º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2023-02-23'),
    dataNascimento: new Date('1998-08-11'),
    rg: '163754809 SSP/BA',
    cpf: '07908731503'
  },
  {
    id: 'e9173dd2-59b1-43d8-bed6-931b03db0705',
    name: 'Amanda Rosa de Miranda Rodrigues',
    email: 'amandarosa122@gmail.com',
    funcao: 'Escrevente I',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089535988_r822hflnae.png',
    telefone: '77999442671',
    portaria: '175º',
    situacao: 'asdad',
    dataAdmissao: new Date('2024-05-14'),
    dataNascimento: new Date('2001-04-23'),
    rg: '2170993274 SSP/BA',
    cpf: '08569644532'
  },
  {
    id: 'f751e538-de54-4af3-8e3c-2903d550a9d5',
    name: 'Allana Virginia Torres de Almeida',
    email: 'allanavirginiatorresalmeida@gmail.com',
    funcao: 'Escrevente Agile',
    setor: 'agile',
    status: 'ativo',
    avatarUrl: 'https://ijlunxdyafteoacxikdg.supabase.co/storage/v1/object/public/upload/avatars/1755089494231_tr7tml3t3u.PNG',
    telefone: '77999172109',
    portaria: '59º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2021-02-02'),
    dataNascimento: new Date('1999-10-05'),
    rg: '1466480726 SSP/BA',
    cpf: '07887260566'
  },
  {
    id: 'f78dade2-8aea-45b0-bd64-307f7024697c',
    name: 'Lucas Carneiro da Silva',
    email: 'lucastecseguro@outlook.com',
    funcao: 'Atendente',
    setor: 'balcão',
    status: 'ativo',
    avatarUrl: null,
    telefone: '77999545534',
    portaria: '151º',
    situacao: 'Nomeação',
    dataAdmissao: new Date('2024-02-01'),
    dataNascimento: new Date('1995-04-05'),
    rg: '4137124 SSP/BA',
    cpf: '11809811627'
  }
];

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Seed dos módulos
  console.log('📦 Criando módulos iniciais...');
  for (const module of INITIAL_MODULES) {
    await prisma.module.upsert({
      where: { id: module.id },
      update: {},
      create: module
    });
    console.log(`✅ Módulo criado: ${module.name}`);
  }

  // Seed dos usuários
  console.log('👤 Criando usuários iniciais...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Criar SUPERADMIN
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@sistema.com' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'superadmin@sistema.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
      modules: {
        connect: INITIAL_MODULES.map(m => ({ id: m.id }))
      }
    }
  });
  console.log(`✅ SUPERADMIN criado: ${superAdmin.email}`);

  // Criar ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@sistema.com',
      password: hashedPassword,
      role: 'ADMIN',
      modules: {
        connect: INITIAL_MODULES.map(m => ({ id: m.id }))
      }
    }
  });
  console.log(`✅ ADMIN criado: ${admin.email}`);
  console.log(`🔑 Senha padrão para ambos: admin123`);

  // Seed das funções
  console.log('👥 Criando funções iniciais...');
  for (const funcao of INITIAL_FUNCOES) {
    await prisma.funcao.upsert({
      where: { name: funcao },
      update: {},
      create: { name: funcao }
    });
    console.log(`✅ Função criada: ${funcao}`);
  }

  // Seed dos setores
  console.log('🏢 Criando setores iniciais...');
  for (const setor of INITIAL_SETORES) {
    await prisma.setor.upsert({
      where: { name: setor },
      update: {},
      create: { name: setor }
    });
    console.log(`✅ Setor criado: ${setor}`);
  }

  // Seed da configuração de gamificação
  console.log('🎮 Criando configuração de gamificação...');
  
  await prisma.gamificationConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      ratingScore1: -5,
      ratingScore2: -2,
      ratingScore3: 1,
      ratingScore4: 3,
      ratingScore5: 5,
      globalXpMultiplier: 1.0
    }
  });
  console.log('✅ Configuração de gamificação criada');
  console.log(`   ⚙️ Configurações de pontuação: 1★(-5), 2★(-2), 3★(+1), 4★(+3), 5★(+5)`);
  console.log(`   🔢 Multiplicador global de XP: 1.0`);

  // Seed dos achievements
  console.log('🏆 Criando conquistas (achievements)...');
  for (const achievement of INITIAL_ACHIEVEMENTS) {
    // Converter componente React para nome de string
    const iconName = achievement.icon.displayName || achievement.icon.name || 'star';
    
    await prisma.achievementConfig.upsert({
      where: { id: achievement.id },
      update: {},
      create: {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        xp: achievement.xp,
        active: achievement.active,
        color: achievement.color,
        icon: iconName
      }
    });
    console.log(`✅ Achievement criado: ${achievement.title}`);
  }

  // Seed dos level rewards
  console.log('🎖️ Criando recompensas de nível...');
  for (const reward of INITIAL_LEVEL_REWARDS) {
    // Converter componente React para nome de string
    const iconName = reward.icon.displayName || reward.icon.name || 'medal';
    
    await prisma.levelTrackConfig.upsert({
      where: { level: reward.level },
      update: {},
      create: {
        level: reward.level,
        title: reward.title,
        description: reward.description,
        active: reward.active,
        color: reward.color,
        icon: iconName
      }
    });
    console.log(`✅ Level reward criado: Nível ${reward.level} - ${reward.title}`);
  }

  // Seed dos tipos de XP avulso
  console.log('⚡ Criando tipos de XP avulso...');
  for (const xpType of INITIAL_XP_TYPES) {
    await prisma.xpTypeConfig.upsert({
      where: { name: xpType.name },
      update: {},
      create: {
        name: xpType.name,
        description: xpType.description,
        points: xpType.points,
        category: xpType.category,
        icon: xpType.icon,
        color: xpType.color,
        createdBy: superAdmin.id
      }
    });
    console.log(`✅ Tipo de XP criado: ${xpType.name} (${xpType.points} pontos)`);
  }

  // Seed das temporadas de gamificação
  console.log('📅 Criando temporadas de gamificação...');
  
  // Verificar se já existem temporadas para evitar duplicatas
  const existingSeasons = await prisma.gamificationSeason.findMany({
    where: {
      name: {
        in: INITIAL_SEASONS.map(s => s.name)
      }
    }
  });
  
  for (const season of INITIAL_SEASONS) {
    const exists = existingSeasons.find(s => s.name === season.name);
    
    if (!exists) {
      const createdSeason = await prisma.gamificationSeason.create({
        data: {
          name: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          active: season.active,
          xpMultiplier: season.xpMultiplier
        }
      });
      console.log(`✅ Temporada criada: ${season.name}`);
      console.log(`   📆 Período: ${season.startDate.toLocaleDateString('pt-BR')} - ${season.endDate.toLocaleDateString('pt-BR')}`);
      console.log(`   🔢 Multiplicador XP: ${season.xpMultiplier}x`);
      console.log(`   ${season.active ? '🟢 Ativa' : '🔴 Inativa'}`);
    } else {
      console.log(`⚠️ Temporada já existe: ${season.name}`);
    }
  }

  // Seed dos atendentes
  console.log('👥 Criando atendentes...');
  
  // Verificar se já existem atendentes para evitar duplicatas
  const existingAttendants = await prisma.attendant.findMany({
    where: {
      id: {
        in: INITIAL_ATTENDANTS.map(a => a.id)
      }
    }
  });
  
  let attendantsCreated = 0;
  let attendantsSkipped = 0;
  
  for (const attendant of INITIAL_ATTENDANTS) {
    const exists = existingAttendants.find(a => a.id === attendant.id);
    
    if (!exists) {
      try {
        const createdAttendant = await prisma.attendant.create({
          data: {
            id: attendant.id,
            name: attendant.name,
            email: attendant.email,
            funcao: attendant.funcao,
            setor: attendant.setor,
            status: attendant.status,
            avatarUrl: attendant.avatarUrl,
            telefone: attendant.telefone,
            portaria: attendant.portaria,
            situacao: attendant.situacao,
            dataAdmissao: attendant.dataAdmissao,
            dataNascimento: attendant.dataNascimento,
            rg: attendant.rg,
            cpf: attendant.cpf
          }
        });
        console.log(`✅ Atendente criado: ${attendant.name}`);
        console.log(`   📧 Email: ${attendant.email}`);
        console.log(`   💼 Função: ${attendant.funcao}`);
        console.log(`   🏢 Setor: ${attendant.setor}`);
        attendantsCreated++;
      } catch (error) {
        console.log(`❌ Erro ao criar atendente ${attendant.name}: ${error}`);
      }
    } else {
      console.log(`⚠️ Atendente já existe: ${attendant.name}`);
      attendantsSkipped++;
    }
  }
  
  console.log(`📊 Resumo dos atendentes: ${attendantsCreated} criados, ${attendantsSkipped} já existiam`);

  console.log('🎉 Seed concluído com sucesso!');
  console.log('');
  console.log('📊 Resumo do que foi criado:');
  console.log(`   👤 2 usuários (SUPERADMIN e ADMIN)`);
  console.log(`   📦 ${INITIAL_MODULES.length} módulos`);
  console.log(`   👥 ${INITIAL_FUNCOES.length} funções`);
  console.log(`   🏢 ${INITIAL_SETORES.length} setores`);
  console.log(`   🏆 ${INITIAL_ACHIEVEMENTS.length} conquistas`);
  console.log(`   🎖️ ${INITIAL_LEVEL_REWARDS.length} recompensas de nível`);
  console.log(`   ⚡ ${INITIAL_XP_TYPES.length} tipos de XP avulso`);
  console.log(`   📅 ${INITIAL_SEASONS.length} temporadas de gamificação`);
  console.log(`   👨‍💼 ${INITIAL_ATTENDANTS.length} atendentes`);
  console.log(`   🎮 1 configuração de gamificação`);
  console.log('');
  console.log('🔐 Credenciais de acesso:');
  console.log('   SUPERADMIN: superadmin@sistema.com / admin123');
  console.log('   ADMIN: admin@sistema.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });