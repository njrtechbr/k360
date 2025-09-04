const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyUserIntegrity() {
  console.log('🔍 Verificando integridade dos usuários...\n');
  
  try {
    // Verificar usuários na tabela User
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            attendantImports: true,
            evaluationImports: true,
            accounts: true,
            sessions: true
          }
        }
      }
    });

    console.log(`📊 Total de usuários no banco: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco de dados!');
      console.log('💡 Isso pode explicar o erro de sessão.');
      console.log('📝 Verifique se os usuários foram criados corretamente.\n');
      return;
    }

    // Mostrar detalhes dos usuários
    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Criado em: ${user.createdAt.toLocaleString('pt-BR')}`);
      console.log(`   Importações de Atendentes: ${user._count.attendantImports}`);
      console.log(`   Importações de Avaliações: ${user._count.evaluationImports}`);
      console.log(`   Contas: ${user._count.accounts}`);
      console.log(`   Sessões: ${user._count.sessions}`);
      console.log('');
    });

    // Verificar se há registros órfãos
    const orphanedAttendants = await prisma.attendant.findMany({
      where: {
        importId: {
          not: null
        },
        import: null
      },
      select: {
        id: true,
        name: true,
        importId: true
      }
    });

    if (orphanedAttendants.length > 0) {
      console.log(`⚠️  Encontrados ${orphanedAttendants.length} atendentes com importId órfão:`);
      orphanedAttendants.forEach(att => {
        console.log(`   - ${att.name} (ID: ${att.id}, ImportID: ${att.importId})`);
      });
      console.log('');
    }

    // Verificar importações órfãs (com importedById que não existe na tabela User)
    const allImports = await prisma.attendantImport.findMany({
      select: {
        id: true,
        fileName: true,
        importedById: true,
        importedAt: true,
        importedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const orphanedImports = allImports.filter(imp => !imp.importedBy);

    if (orphanedImports.length > 0) {
      console.log(`⚠️  Encontradas ${orphanedImports.length} importações órfãs:`);
      orphanedImports.forEach(imp => {
        console.log(`   - ${imp.fileName} (ID: ${imp.id}, UserID: ${imp.importedById})`);
        console.log(`     Data: ${imp.importedAt.toLocaleString('pt-BR')}`);
      });
      console.log('');
    }

    console.log('✅ Verificação de integridade concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar integridade:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para criar usuário de teste se necessário
async function createTestUser() {
  console.log('🔧 Criando usuário de teste...\n');
  
  try {
    const testUser = await prisma.user.create({
      data: {
        name: 'Usuário Teste',
        email: 'teste@exemplo.com',
        role: 'ADMIN',
        // Nota: Em produção, você precisaria de uma senha hasheada
        // Este é apenas para teste local
      }
    });

    console.log('✅ Usuário de teste criado:');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Nome: ${testUser.name}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Role: ${testUser.role}\n`);
    
    console.log('💡 Agora você pode tentar fazer login com este usuário.');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar verificação
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--create-test-user')) {
    await createTestUser();
  } else {
    await verifyUserIntegrity();
  }
}

main().catch(console.error);