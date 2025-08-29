
"use client";

import type { ReactNode } from "react";
import React, { useCallback, useState } from "react";
import type { User, Module, Role, Attendant, Evaluation } from "@/lib/types";
import { INITIAL_MODULES, ROLES, ATTENDANT_STATUS, FUNCOES, SETORES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";
const MODULES_STORAGE_KEY = "controle_acesso_modules";
const ATTENDANTS_STORAGE_KEY = "controle_acesso_attendants";
const EVALUATIONS_STORAGE_KEY = "controle_acesso_evaluations";


// Dummy users for initial seeding
const INITIAL_USERS: User[] = [];

const parseDate = (dateString: string | null) => {
    if (!dateString || dateString.toLowerCase() === 'não informado' || dateString.split('/').length !== 3) {
      return new Date(0).toISOString();
    }
    const parts = dateString.split('/');
    // new Date(year, monthIndex, day)
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).toISOString();
};

const parseEvaluationDate = (dateString: string) => {
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds)).toISOString();
}


const INITIAL_ATTENDANTS: Attendant[] = [
  {
    id: "65a585d7-adce-4da7-837e-74c25516c7ad",
    name: "Ana Flávia de Souza",
    email: "anaflaviadesouza@outlook.com",
    funcao: "Escrevente II",
    setor: "escritura",
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
    setor: "protesto",
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
    setor: "procuração",
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
    setor: "balcão",
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
    setor: "administrativo",
    status: ATTENDANT_STATUS.ACTIVE,
    avatarUrl: "",
    telefone: "",
    portaria: "",
    situacao: "",
    dataAdmissao: parseDate("05/08/2025"),
    dataNascimento: parseDate(null),
    rg: "",
    cpf: "00000000001",
  },
  {
    id: "4c16287b-8e11-4646-8e9a-bb3ea41c608f",
    name: "Anderson Lisboa Silveira",
    email: "andersonlisboako@gmail.com",
    funcao: "Escrevente I",
    setor: "agile",
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
    name: "Nereu Jr (Tabelião Substituto)",
    email: "contato@nereujr.com.br",
    funcao: "Tabelião Substituto",
    setor: "administrativo",
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
    setor: "administrativo",
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
    setor: "escritura",
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
    setor: "agile",
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
    setor: "protesto",
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
    setor: "procuração",
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
    setor: "balcão",
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
    setor: "escritura",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "protesto",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "balcão",
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
    setor: "protesto",
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
    setor: "administrativo",
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
    setor: "administrativo",
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
    setor: "escritura",
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
    setor: "administrativo",
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
    setor: "protesto",
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
    setor: "procuração",
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
    setor: "escritura",
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

const INITIAL_EVALUATIONS: Evaluation[] = [
  { "id": "6002ff6d-ac09-4c64-95b3-e5987cc0b841", "attendantId": "58cd3a1d-9214-4535-b8d8-6f9d9957a570", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("05/08/2025 11:13:58") },
  { "id": "18944d44-1d1d-4d96-9411-93285fffde2d", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("06/08/2025 20:09:07") },
  { "id": "94cad7d2-6d5b-45c6-9f1d-cdfcdeb179a5", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("06/08/2025 20:09:34") },
  { "id": "5aae7ce4-502c-4df8-a8dc-567e11b0b1ff", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 17:58:05") },
  { "id": "59a8effa-51ff-46d6-b243-ca79413b7d0a", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Ótimo atendimento.", "data": parseEvaluationDate("07/08/2025 18:21:28") },
  { "id": "1835bf47-1879-4353-8a11-9c78095d870c", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 1, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 18:26:46") },
  { "id": "89dcc97b-50ea-4333-aa10-7250549ab839", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 18:27:38") },
  { "id": "7bf765c6-6d9d-4631-bb96-f85a7401919c", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 18:28:03") },
  { "id": "79b04737-80ac-4d0a-b70c-2f2906b0ad3b", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 18:28:06") },
  { "id": "ba1bf906-4760-459b-9ee5-30a2880f85cc", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 18:28:10") },
  { "id": "d6857824-507d-40b1-a33f-7bb26d9e8185", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 18:34:09") },
  { "id": "a78614e3-e4bb-4659-b94e-c8f725b3adf0", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Muito bom Atendimento", "data": parseEvaluationDate("07/08/2025 19:00:00") },
  { "id": "4b470592-5f8b-4eb3-917b-85d19a5cd378", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("07/08/2025 19:17:46") },
  { "id": "2658e835-56e8-4b23-a704-d67231c64327", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("08/08/2025 12:26:02") },
  { "id": "414bce17-55c4-4da7-8052-562593e9b72a", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Ótimo atendimento!", "data": parseEvaluationDate("08/08/2025 12:29:56") },
  { "id": "e69d02a3-4c79-4a85-8525-fd1212248ac7", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 5, "comentario": "Moça muito atenciosa.", "data": parseEvaluationDate("08/08/2025 16:25:49") },
  { "id": "8ca9d8de-d1f4-40ff-9555-c77eb4cf81c0", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("08/08/2025 18:42:48") },
  { "id": "572fc557-750d-4c90-9aa0-b4fc1bfeb998", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "Lucas é um profissão exemplar. Dedicado ao serviço e muito focado no atendimento do cliente. Tivemos uma demanda onde necessitamos o apoio dele e o resulto foi além do esperado. Sempre muito paciente e disponível para atender ao cliente. Parabéns.", "data": parseEvaluationDate("08/08/2025 19:15:11") },
  { "id": "e8142186-bb2f-4348-b328-235ba7ea7e22", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("08/08/2025 21:25:11") },
  { "id": "1b1db94c-d748-4d3c-a0f6-d92689451131", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("08/08/2025 21:36:17") },
  { "id": "0b960024-e62e-48bc-815b-9090a29b8afc", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "Atenciosa e sábia", "data": parseEvaluationDate("12/08/2025 13:08:53") },
  { "id": "dd7a6e0c-0dfc-4715-a993-a626089bdfe0", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 13:15:57") },
  { "id": "07ea945c-8144-44b3-8ed5-f26ec87b5379", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 14:33:56") },
  { "id": "d261dcd9-5cd4-4757-ac50-eb78f50e609d", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 14:37:03") },
  { "id": "4c3d80f7-cd7a-45b2-92ad-a99ce3970c5f", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 14:56:24") },
  { "id": "f7b6b288-b9ea-4235-b5c3-240021f7e48c", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Muito bom", "data": parseEvaluationDate("12/08/2025 15:05:43") },
  { "id": "4a908ffa-152f-4e22-872c-f25c837fab0c", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 15:06:31") },
  { "id": "cf0a435b-44a8-4fb5-bcee-827e0f9c5204", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 17:08:42") },
  { "id": "c0dfb0df-18fa-4bed-89d0-aea7697eaa79", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 18:56:10") },
  { "id": "1ab88c17-1c0f-4665-ae1a-b45235662bc7", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Pratica e rápida!", "data": parseEvaluationDate("12/08/2025 19:06:57") },
  { "id": "5b8b6b8b-8b8b-4b8b-8b8b-8b8b8b8b8b8b", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 19:07:15") },
  { "id": "6c9c7c9c-9c9c-5c9c-9c9c-9c9c9c9c9c9c", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Excelente!", "data": parseEvaluationDate("12/08/2025 19:15:32") },
  { "id": "7d0d8d0d-0d0d-6d0d-0d0d-0d0d0d0d0d0d", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 4, "comentario": "Bom atendimento", "data": parseEvaluationDate("12/08/2025 19:22:45") },
  { "id": "8e1e9e1e-1e1e-7e1e-1e1e-1e1e1e1e1e1e", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 19:30:12") },
  { "id": "9f2f0f2f-2f2f-8f2f-2f2f-2f2f2f2f2f2f", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "Muito atencioso", "data": parseEvaluationDate("12/08/2025 19:45:28") },
  { "id": "0g3g1g3g-3g3g-9g3g-3g3g-3g3g3g3g3g3g", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 20:00:15") },
  { "id": "1h4h2h4h-4h4h-0h4h-4h4h-4h4h4h4h4h4h", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 3, "comentario": "Razoável", "data": parseEvaluationDate("12/08/2025 20:15:42") },
  { "id": "2i5i3i5i-5i5i-1i5i-5i5i-5i5i5i5i5i5i", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Perfeito!", "data": parseEvaluationDate("12/08/2025 20:30:58") },
  { "id": "3j6j4j6j-6j6j-2j6j-6j6j-6j6j6j6j6j6j", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 20:45:33") },
  { "id": "4k7k5k7k-7k7k-3k7k-7k7k-7k7k7k7k7k7k", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 5, "comentario": "Muito educada", "data": parseEvaluationDate("12/08/2025 21:00:19") },
  { "id": "5l8l6l8l-8l8l-4l8l-8l8l-8l8l8l8l8l8l", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 21:15:47") },
  { "id": "6m9m7m9m-9m9m-5m9m-9m9m-9m9m9m9m9m9m", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 4, "comentario": "Bom serviço", "data": parseEvaluationDate("12/08/2025 21:30:24") },
  { "id": "7n0n8n0n-0n0n-6n0n-0n0n-0n0n0n0n0n0n", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "Excelente profissional", "data": parseEvaluationDate("12/08/2025 21:45:51") },
  { "id": "8o1o9o1o-1o1o-7o1o-1o1o-1o1o1o1o1o1o", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 22:00:36") },
  { "id": "9p2p0p2p-2p2p-8p2p-2p2p-2p2p2p2p2p2p", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Muito prestativa", "data": parseEvaluationDate("12/08/2025 22:15:13") },
  { "id": "0q3q1q3q-3q3q-9q3q-3q3q-3q3q3q3q3q3q", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 22:30:48") },
  { "id": "1r4r2r4r-4r4r-0r4r-4r4r-4r4r4r4r4r4r", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 2, "comentario": "Poderia ser melhor", "data": parseEvaluationDate("12/08/2025 22:45:25") },
  { "id": "2s5s3s5s-5s5s-1s5s-5s5s-5s5s5s5s5s5s", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "Ótima!", "data": parseEvaluationDate("12/08/2025 23:00:02") },
  { "id": "3t6t4t6t-6t6t-2t6t-6t6t-6t6t6t6t6t6t", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 23:15:39") },
  { "id": "4u7u5u7u-7u7u-3u7u-7u7u-7u7u7u7u7u7u", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Sempre muito atenciosa", "data": parseEvaluationDate("12/08/2025 23:30:16") },
  { "id": "5v8v6v8v-8v8v-4v8v-8v8v-8v8v8v8v8v8v", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("12/08/2025 23:45:53") },
  { "id": "6w9w7w9w-9w9w-5w9w-9w9w-9w9w9w9w9w9w", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 4, "comentario": "Bom atendimento", "data": parseEvaluationDate("13/08/2025 00:00:30") },
  { "id": "7x0x8x0x-0x0x-6x0x-0x0x-0x0x0x0x0x0x", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "Profissional exemplar", "data": parseEvaluationDate("13/08/2025 00:15:07") },
  { "id": "8y1y9y1y-1y1y-7y1y-1y1y-1y1y1y1y1y1y", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("13/08/2025 00:30:44") },
  { "id": "9z2z0z2z-2z2z-8z2z-2z2z-2z2z2z2z2z2z", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "Muito competente", "data": parseEvaluationDate("13/08/2025 00:45:21") },
  { "id": "0a3a1a3a-3a3a-9a3a-3a3a-3a3a3a3a3a3a", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("13/08/2025 01:00:58") },
  { "id": "1b4b2b4b-4b4b-0b4b-4b4b-4b4b4b4b4b4b", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 3, "comentario": "Regular", "data": parseEvaluationDate("13/08/2025 01:15:35") },
  { "id": "2c5c3c5c-5c5c-1c5c-5c5c-5c5c5c5c5c5c", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 5, "comentario": "Muito simpática", "data": parseEvaluationDate("13/08/2025 01:30:12") },
  { "id": "3d6d4d6d-6d6d-2d6d-6d6d-6d6d6d6d6d6d", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("13/08/2025 01:45:49") },
  { "id": "4e7e5e7e-7e7e-3e7e-7e7e-7e7e7e7e7e7e", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "Excelente atendimento!", "data": parseEvaluationDate("13/08/2025 02:00:26") },
  { "id": "fe57ddde-9cb6-4d6f-b231-cf625a0eac27", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("18/08/2025 16:02:13") },
  { "id": "90a2db0e-4bcb-49aa-a672-496e9fe2ddd7", "attendantId": "9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f", "nota": 5, "comentario": "Muito simpatico e educado", "data": parseEvaluationDate("18/08/2025 16:18:56") },
  { "id": "911233e7-e0d9-44fa-bd74-a04a0458ef76", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("18/08/2025 18:23:42") },
  { "id": "3b63e049-9e5a-47e4-b1bc-20fcd4279b44", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Excelente atendimento, educada e muito simpática.", "data": parseEvaluationDate("19/08/2025 13:01:29") },
  { "id": "ca29244f-e57b-418b-93c2-3c1e8a03f4cd", "attendantId": "9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f", "nota": 5, "comentario": "Ótimo funcionário bom atendimento", "data": parseEvaluationDate("20/08/2025 11:45:31") },
  { "id": "da1c97af-4ec7-4cf4-bb80-d174e9f777c5", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "Atendimento muito bom", "data": parseEvaluationDate("20/08/2025 12:45:45") },
  { "id": "9e40f6d4-c9db-4264-a1c3-a61cf1eff555", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 13:41:12") },
  { "id": "851af847-c838-44cd-9ace-c0855ea85317", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 13:41:46") },
  { "id": "d88a8527-f17b-4acd-a9fe-ef782c5965a9", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 13:42:03") },
  { "id": "52a5e6eb-3934-41da-8df9-e1219f9c3a00", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Maravilhosa! Muito atenciosa e paciente", "data": parseEvaluationDate("20/08/2025 16:30:52") },
  { "id": "415f9b74-4ba8-4032-8b8b-424f93250947", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 16:41:49") },
  { "id": "4d41adf7-f472-49b4-bc2a-bb68e7ac134e", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Muito sastifatorio adorei o atendimento", "data": parseEvaluationDate("20/08/2025 19:04:54") },
  { "id": "1fc432ba-c850-4df3-a426-99d4f68dd409", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 19:05:02") },
  { "id": "fb4a3973-edef-408a-be3b-d003ce7a36b1", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 20:49:15") },
  { "id": "8bfcf928-d449-4cac-8fad-8a4be5cb4ccf", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("20/08/2025 21:37:52") },
  { "id": "c6360d6a-cefb-4bb4-9841-799549bb6dfe", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("21/08/2025 12:36:38") },
  { "id": "79801391-605d-4162-b4dc-fd860415cc92", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("21/08/2025 12:54:43") },
  { "id": "2f683e55-5b9c-42e2-a86a-316ba4449969", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("21/08/2025 17:41:42") },
  { "id": "aa2fc01d-2c26-444c-bb08-eb8d651cbe4f", "attendantId": "f751e538-de54-4af3-8e3c-2903d550a9d5", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("22/08/2025 12:58:15") },
  { "id": "1dd9073e-f102-46cf-81cd-bf7685642db1", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("22/08/2025 13:55:00") },
  { "id": "fb6c5751-bb56-4a4e-9954-6b8dfbb69b4f", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("22/08/2025 16:24:02") },
  { "id": "a0c49c68-0192-4ac4-99b9-48a5976e5cdb", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("22/08/2025 17:03:15") },
  { "id": "985f8264-7c88-476d-9adc-f831033fe755", "attendantId": "65a585d7-adce-4da7-837e-74c25516c7ad", "nota": 5, "comentario": "Muito empenhada e foçada em resolver toda dúvida, muito educada", "data": parseEvaluationDate("25/08/2025 21:53:15") },
  { "id": "6db76276-c58e-43fc-9c34-e2c89195a7f2", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "Fui muito bem atendido !!", "data": parseEvaluationDate("26/08/2025 11:34:37") },
  { "id": "34657fb9-ec6c-477c-b410-090c1371c02b", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "Fui muito bem atendido !! Obrigado", "data": parseEvaluationDate("26/08/2025 11:35:18") },
  { "id": "950553c4-732e-4fe6-954c-eb1341ed8d86", "attendantId": "10d6a02b-d440-463c-9738-210e5fff1429", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("26/08/2025 11:45:01") },
  { "id": "b40772f7-ad7b-49de-acea-467e96b6dd4e", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Muito atenciosa", "data": parseEvaluationDate("26/08/2025 12:25:56") },
  { "id": "24b7a5bc-4bcd-45ff-9894-eaa38b7707d5", "attendantId": "4c16287b-8e11-4646-8e9a-bb3ea41c608f", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("26/08/2025 13:51:22") },
  { "id": "78e9a361-735a-459e-ac79-762ea249e2dc", "attendantId": "9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f", "nota": 5, "comentario": "Excelente atendimento, atencioso, um cara visivelmente dedicado, eficiente e comprometido", "data": parseEvaluationDate("26/08/2025 17:46:55") },
  { "id": "91c5a4ee-d9a1-405d-9563-97ccef1548dc", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("26/08/2025 18:08:07") },
  { "id": "8c98fee2-dc2e-428c-8840-dd6ab877d290", "attendantId": "9f4782fa-8eec-4c10-b5df-f3e923b5a61d", "nota": 5, "comentario": "Muito competente e atenciosa!", "data": parseEvaluationDate("27/08/2025 15:16:09") },
  { "id": "2800686a-21e1-48c0-8884-e0a88b6015ae", "attendantId": "56104014-5b03-494e-bab1-919da1dd9f02", "nota": 5, "comentario": "Atendente super atenciosa.", "data": parseEvaluationDate("28/08/2025 15:20:36") },
  { "id": "b9675585-b756-4a65-8667-c26e3aaa9594", "attendantId": "4c16287b-8e11-4646-8e9a-bb3ea41c608f", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("28/08/2025 19:48:42") },
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
  evaluations: Evaluation[];
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'data'>) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
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
        const parsed = JSON.parse(attendantsJson);
        if(parsed && parsed.length > 0) return parsed;
      }
      localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANTS));
      return INITIAL_ATTENDANTS;
    } catch (error) {
      console.error("Failed to parse attendants from localStorage", error);
      localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANTS));
      return INITIAL_ATTENDANTS;
    }
  }, []);

  const getEvaluationsFromStorage = useCallback((): Evaluation[] => {
    if (typeof window === "undefined") return [];
    try {
      const evaluationsJson = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
       if (evaluationsJson) {
        const parsed = JSON.parse(evaluationsJson);
        if(parsed && parsed.length > 0) return parsed;
      }
      localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
      return INITIAL_EVALUATIONS;
    } catch (error) {
      console.error("Failed to parse evaluations from localStorage", error);
      localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
      return INITIAL_EVALUATIONS;
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

  const saveEvaluationsToStorage = (evaluations: Evaluation[]) => {
    localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(evaluations));
    setEvaluations(evaluations);
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
      setEvaluations(getEvaluationsFromStorage());

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
  }, [getUsersFromStorage, getModulesFromStorage, getAttendantsFromStorage, getEvaluationsFromStorage]);

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
    
    // For superadmin creation, ensure all modules are assigned.
    const modulesToAssign = userData.role === ROLES.SUPERADMIN
      ? getModulesFromStorage().map(m => m.id)
      : userData.modules;


    const newUser: User = {
      ...userData,
      id: new Date().toISOString(),
      modules: modulesToAssign,
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
     if (currentAttendants.some(a => a.cpf === attendantData.cpf && a.cpf !== '')) {
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
      if (attendantData.cpf && attendantData.cpf !== '' && currentAttendants.some(a => a.id !== attendantId && a.cpf === attendantData.cpf)) {
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
      
      const currentEvaluations = getEvaluationsFromStorage();
      const newEvaluations = currentEvaluations.filter(e => e.attendantId !== attendantId);
      saveEvaluationsToStorage(newEvaluations);

      toast({
          title: "Atendente Removido!",
          description: "O atendente e todas as suas avaliações foram removidos do sistema."
      });
  };

  const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'data'>) => {
      const currentEvaluations = getEvaluationsFromStorage();
      const newEvaluation: Evaluation = {
          ...evaluationData,
          id: crypto.randomUUID(),
          data: new Date().toISOString(),
      };

      const newEvaluations = [...currentEvaluations, newEvaluation];
      saveEvaluationsToStorage(newEvaluations);
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
    evaluations,
    addEvaluation,
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

