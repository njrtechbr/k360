const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const csvSeptemberIds = [
  '33d14f4b-5bdc-4537-b596-5880a67dc8f8',
  '45bcdf77-6a53-43c4-a856-77a07cc81b04',
  '54795a4b-f57b-483b-851a-86a4f5eeb2ae',
  'aa43944d-5e56-406a-8dce-6aff5a992173',
  'c6793135-18ef-457d-ad10-b6c9953166a5',
  'd536faff-07ff-4e42-a973-1a442858e500',
  'df196e29-3198-4061-bbad-d81653bd81c7'
];

async function checkCsvEvaluations() {
  try {
    console.log('🔍 Verificando se as avaliações do CSV já estão no banco...\n');

    for (const id of csvSeptemberIds) {
      const evaluation = await prisma.evaluation.findUnique({
        where: { id },
        select: {
          id: true,
          nota: true,
          data: true,
          attendant: {
            select: { name: true }
          }
        }
      });

      if (evaluation) {
        console.log(`✅ ${id} - JÁ EXISTE: ${evaluation.attendant.name} (${evaluation.nota} estrelas)`);
      } else {
        console.log(`❌ ${id} - NÃO ENCONTRADA`);
      }
    }

    console.log('\n📊 Resumo:');
    const existingCount = await prisma.evaluation.count({
      where: {
        id: { in: csvSeptemberIds }
      }
    });

    console.log(`- Avaliações do CSV já no banco: ${existingCount}/${csvSeptemberIds.length}`);
    console.log(`- Avaliações novas para importar: ${csvSeptemberIds.length - existingCount}`);

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCsvEvaluations();