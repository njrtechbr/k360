const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSessionIssue() {
  try {
    console.log('🔍 Debugging session issue...\n');

    // Get all users to see their ID format
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log('👥 All users and their ID formats:');
    users.forEach(user => {
      console.log(`  - ${user.name}: ${user.id} (length: ${user.id.length})`);
    });

    // Check if there are any sessions in the database
    const sessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\n🔐 Found ${sessions.length} active sessions:`);
    sessions.forEach(session => {
      console.log(`  - User: ${session.user.name} (${session.user.email})`);
      console.log(`    Session ID: ${session.id}`);
      console.log(`    User ID: ${session.userId}`);
      console.log(`    Expires: ${session.expires}`);
      console.log('');
    });

    // Check accounts table
    const accounts = await prisma.account.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\n🔗 Found ${accounts.length} accounts:`);
    accounts.forEach(account => {
      console.log(`  - User: ${account.user.name} (${account.user.email})`);
      console.log(`    Provider: ${account.provider}`);
      console.log(`    User ID: ${account.userId}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSessionIssue();