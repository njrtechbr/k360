const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const csvSeptemberData = [
  {
    id: '33d14f4b-5bdc-4537-b596-5880a67dc8f8',
    attendantId: '9f4782fa-8eec-4c10-b5df-f3e923b5a61d',
    rating: 5,
    comment: 'Ótima atendente',
    date: '2025-09-02 17:21:48.901926+00'
  },
  {
    id: '45bcdf77-6a53-43c4-a856-77a07cc81b04',
    attendantId: '1bd0b98f-f552-48f2-a10c-6ca9943a6785',
    rating: 5,
    comment: '',
    date: '2025-09-04 13:09:59.679885+00'
  },
  {
    id: '54795a4b-f57b-483b-851a-86a4f5eeb2ae',
    attendantId: '10d6a02b-d440-463c-9738-210e5fff1429',
    rating: 5,
    comment: 'Atendimento nota dez ! Por excelência.',
    date: '2025-09-02 14:41:33.849828+00'
  },
  {
    id: 'aa43944d-5e56-406a-8dce-6aff5a992173',
    attendantId: '9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f',
    rating: 5,
    comment: 'Ótimo atendimento',
    date: '2025-09-03 19:21:11.015919+00'
  },
  {
    id: 'c6793135-18ef-457d-ad10-b6c9953166a5',
    attendantId: '8773973a-9a4e-436e-bd93-37150645852b',
    rating: 3,
    comment: '',
    date: '2025-09-02 12:20:07.645319+00'
  },
  {
    id: 'd536faff-07ff-4e42-a973-1a442858e500',
    attendantId: '9908ac4e-7d23-4dc4-a4c2-5a9fb4f2956f',
    rating: 5,
    comment: 'Educado, Atencioso e gentil.',
    date: '2025-09-04 12:19:55.451781+00'
  },
  {
    id: 'df196e29-3198-4061-bbad-d81653bd81c7',
    attendantId: '8773973a-9a4e-436e-bd93-37150645852b',
    rating: 5,
    comment: '',
    date: '2025-09-01 18:30:52.850396+00'
  }
];

async function importSeptemberEvaluations() {
  try {
    console.log('🚀 Importando 7 novas avaliações de setembro...\n');
    
    // Verificar se os atendentes existem
    const attendantIds = [...new Set(csvSeptemberData.map(e => e.attendantId))];
    const existingAttendants = await prisma.attendant.findMany({
      where: { id: { in: attendantIds } },
      select: { id: true, name: true }
    });
    
    console.log('👥 Atendentes encontrados:');
    existingAttendants.forEach(att => {
      console.log(`- ${att.name} (${att.id})`);
    });
    
    if (existingAttendants.length !== attendantIds.length) {
      console.log('❌ Alguns atendentes não foram encontrados!');
      return;
    }
    
    console.log('\n📝 Importando avaliações...');
    
    for (const evalData of csvSeptemberData) {
      const attendant = existingAttendants.find(a => a.id === evalData.attendantId);
      
      try {
        await prisma.evaluation.create({
          data: {
            id: evalData.id,
            attendantId: evalData.attendantId,
            nota: evalData.rating,
            comentario: evalData.comment || '',
            data: new Date(evalData.date),
            xpGained: evalData.rating * 10, // XP padrão
            createdAt: new Date(evalData.date)
          }
        });
        
        console.log(`✅ ${attendant.name}: ${evalData.rating} estrelas (${evalData.date.split(' ')[0]})`);
      } catch (error) {
        console.log(`❌ Erro ao importar ${evalData.id}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Importação concluída!');
    
    // Verificar total de avaliações de setembro após importação
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

importSeptemberEvaluations();