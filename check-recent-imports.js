const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentImports() {
  try {
    const imports = await prisma.attendantImport.findMany({
      include: {
        importedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        importedAt: 'desc'
      }
    });

    console.log(`Found ${imports.length} recent imports:`);
    imports.forEach(imp => {
      console.log(`- ${imp.fileName} at ${imp.importedAt}`);
      console.log(`  Imported by: ${imp.importedBy.name} (${imp.importedBy.email})`);
      console.log(`  Import ID: ${imp.id}`);
      console.log(`  User ID: ${imp.importedById}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentImports();