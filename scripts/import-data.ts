import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface ReviewRow {
  id: string;
  attendantId: string;
  rating: string;
  comment: string;
  date: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  funcao: string;
  setor: string;
  status: string;
  telefone?: string;
  portaria?: string;
  situacao?: string;
  dataAdmissao: string;
  dataNascimento: string;
  rg?: string;
  cpf?: string;
}

const prisma = new PrismaClient();

async function importUsers() {
  console.log('📥 Importando usuários...');
  
  const usersPath = path.join(process.cwd(), 'dados', 'users_rows.csv');
  const usersData = fs.readFileSync(usersPath, 'utf-8');
  
  const users: UserRow[] = parse(usersData, {
    columns: true,
    skip_empty_lines: true
  });

  for (const user of users) {
    try {
      await prisma.attendant.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          funcao: 'Atendente',
          setor: 'Geral',
          status: 'Ativo',
          telefone: user.telefone || '',
          portaria: user.portaria || '',
          situacao: user.situacao || '',
          dataAdmissao: new Date(user.dataAdmissao),
          dataNascimento: new Date(user.dataNascimento),
          rg: user.rg || '',
          cpf: user.cpf || ''
        }
      });
      console.log(`✅ Usuário importado: ${user.name}`);
    } catch (error) {
      console.error(`❌ Erro ao importar usuário ${user.name}:`, error);
    }
  }
}

async function importEvaluations() {
  console.log('📥 Importando avaliações...');
  
  const reviewsPath = path.join(process.cwd(), 'dados', 'reviews_rows.csv');
  const reviewsData = fs.readFileSync(reviewsPath, 'utf-8');
  
  const reviews: ReviewRow[] = parse(reviewsData, {
    columns: true,
    skip_empty_lines: true
  });

  for (const review of reviews) {
    try {
      // Verificar se o attendant existe
      const attendant = await prisma.attendant.findUnique({
        where: { id: review.attendantId }
      });
      
      if (!attendant) {
        console.log(`⚠️ Atendente não encontrado: ${review.attendantId}`);
        continue;
      }

      const xpGained = calculateXP(parseInt(review.rating));
      
      // Criar avaliação
      await prisma.evaluation.upsert({
        where: { id: review.id },
        update: {},
        create: {
          id: review.id,
          attendantId: review.attendantId,
          nota: parseInt(review.rating),
          comentario: review.comment || '',
          data: new Date(review.date),
          xpGained: xpGained
        }
      });
      
      // Criar evento XP correspondente
      await prisma.xpEvent.create({
        data: {
          attendantId: review.attendantId,
          points: xpGained,
          basePoints: xpGained,
          multiplier: 1,
          reason: `Avaliação ${parseInt(review.rating)} estrelas`,
          date: new Date(review.date),
          type: 'EVALUATION',
          relatedId: review.id
        }
      });
      
      console.log(`✅ Avaliação e XP importados: ${review.id} (${xpGained} XP)`);
    } catch (error) {
      console.error(`❌ Erro ao importar avaliação ${review.id}:`, error);
    }
  }
}

function calculateXP(rating: number): number {
  const xpMap: { [key: number]: number } = {
    1: -5,
    2: -2,
    3: 1,
    4: 3,
    5: 5
  };
  return xpMap[rating] || 0;
}

async function main() {
  try {
    console.log('🚀 Iniciando importação de dados...');
    
    await importUsers();
    await importEvaluations();
    
    console.log('🎉 Importação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();