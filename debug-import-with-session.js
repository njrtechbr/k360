const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugImportWithSession() {
  try {
    console.log('🔍 Debugging import with session simulation...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log('👥 Available users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found!');
      return;
    }

    // Test with each user ID to see if any fail
    for (const user of users) {
      console.log(`\n🧪 Testing import creation with user: ${user.name} (ID: ${user.id})`);
      
      try {
        // Simulate the exact same operation as in the import route
        const attendantImport = await prisma.attendantImport.create({
          data: {
            fileName: `test-import-${user.name.replace(/\s+/g, '-').toLowerCase()}.csv`,
            importedById: user.id,
            importedAt: new Date(),
          },
        });
        
        console.log(`✅ Success! Import ID: ${attendantImport.id}`);
        
        // Clean up
        await prisma.attendantImport.delete({
          where: { id: attendantImport.id }
        });
        console.log('🧹 Cleaned up test import');
        
      } catch (error) {
        console.log(`❌ Failed with user ${user.name}:`, error.message);
        console.log('   Error code:', error.code);
        console.log('   Error meta:', error.meta);
      }
    }

    // Test with a non-existent user ID to simulate the actual error
    console.log('\n🧪 Testing with non-existent user ID...');
    try {
      const fakeUserId = 'fake-user-id-123';
      const attendantImport = await prisma.attendantImport.create({
        data: {
          fileName: 'test-fake-user.csv',
          importedById: fakeUserId,
          importedAt: new Date(),
        },
      });
      console.log('❓ Unexpected success with fake user ID');
    } catch (error) {
      console.log('✅ Expected error with fake user ID:', error.message);
      console.log('   This matches the error pattern we\'re seeing');
    }

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugImportWithSession();