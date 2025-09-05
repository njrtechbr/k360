const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeptemberEvaluations() {
  try {
    const septemberEvals = await prisma.evaluation.findMany({
      where: {
        data: {
          gte: new Date('2025-09-01'),
          lt: new Date('2025-10-01')
        }
      },
      select: {
        id: true,
        nota: true,
        data: true,
        attendant: {
          select: { name: true }
        }
      }
    });
    
    console.log('📊 Avaliações de Setembro no Banco:');
    console.log('Total:', septemberEvals.length);
    
    if (septemberEvals.length > 0) {
      console.log('\nPrimeiras 5:');
      septemberEvals.slice(0, 5).forEach(eval => {
        console.log(`- ${eval.attendant.name}: ${eval.nota} estrelas (${eval.data.toISOString().split('T')[0]})`);
      });
    }
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeptemberEvaluations();