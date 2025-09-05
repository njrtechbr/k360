const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const remainingEvaluations = [
  {
    id: '45bcdf77-6a53-43c4-a856-77a07cc81b04',
    attendantId: '1bd0b98f-f552-48f2-a10c-6ca9943a6785',
    rating: 5,
    comment: '',
    date: '2025-09-04 13:09:59.679885+00'
  },
  {
    id: 'c6793135-18ef-457d-ad10-b6c9953166a5',
    attendantId: '8773973a-9a4e-436e-bd93-37150645852b',
    rating: 3,
    comment: '',
    date: '2025-09-02 12:20:07.645319+00'
  },
  {
    id: 'df196e29-3198-4061-bbad-d81653bd81c7',
    attendantId: '8773973a-9a4e-436e-bd93-37150645852b',
    rating: 5,
    comment: '',
    date: '2025-09-01 18:30:52.850396+00'
  }
];

async function importRemainingEvaluations() {
  try {
    console.log('🚀 Importando 3 avaliações restantes de setembro...\n');
    
    for (const evalData of remainingEvaluations) {
      try {
        // Buscar nome do atendente
        const attendant = await prisma.attendant.findUnique({
          where: { id: evalData.attendantId },
          select: { name: true }
        });
        
        if (!attendant) {
          console.log(`❌ Atendente não encontrado: ${evalData.attendantId}`);
          continue;
        }
        
        await prisma.evaluation.create({
          data: {
            id: evalData.id,
            attendantId: evalData.attendantId,
            nota: evalData.rating,
            comentario: evalData.comment,
            data: new Date(evalData.date),
            xpGained: evalData.rating * 10,
            createdAt: new Date(evalData.date)
          }
        });
        
        console.log(`✅ ${attendant.name}: ${evalData.rating} estrelas (${evalData.date.split(' ')[0]})`);
      } catch (error) {
        console.log(`❌ Erro ao importar ${evalData.id}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Importação das avaliações restantes concluída!');
    
    // Verificar total final
    const septemberCount = await prisma.evaluation.count({
      where: {
        data: {
          gte: new Date('2025-09-01'),
          lt: new Date('2025-10-01')
        }
      }
    });
    
    console.log(`📊 Total de avaliações de setembro no banco: ${septemberCount}`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

importRemainingEvaluations();