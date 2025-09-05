import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/lib/database';
import { UserService } from '../src/services/userService';

const prisma = new PrismaClient();

async function migrationHelper() {
  console.log('🔄 Executando helper de migração...\n');

  try {
    // 1. Usar Prisma para operações padrão
    console.log('1️⃣ Verificando usuários com Prisma...');
    const users = await UserService.findAll();
    console.log(`   Encontrados ${users.length} usuários`);

    // 2. Usar pg para análise complexa
    console.log('\n2️⃣ Gerando relatório com pg...');
    const stats = await DatabaseService.getUserStatsReport();
    console.log('   Estatísticas por usuário:');
    stats.forEach(stat => {
      console.log(`   - ${stat.name}: ${stat.total_evaluations} avaliações, ${stat.total_xp} XP`);
    });

    // 3. Usar Prisma Studio para verificação manual
    console.log('\n3️⃣ Para verificação visual:');
    console.log('   Execute: npx prisma studio');
    console.log('   Acesse: http://localhost:5555');

    // 4. Limpeza de dados órfãos com pg
    console.log('\n4️⃣ Limpando dados órfãos...');
    await DatabaseService.cleanOrphanedData();
    console.log('   ✅ Limpeza concluída');

    // 5. Verificação final com Prisma
    console.log('\n5️⃣ Verificação final...');
    const finalCount = await prisma.user.count();
    const evaluationCount = await prisma.evaluation.count();
    const xpEventCount = await prisma.xpEvent.count();
    
    console.log(`   Usuários: ${finalCount}`);
    console.log(`   Avaliações: ${evaluationCount}`);
    console.log(`   Eventos XP: ${xpEventCount}`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await prisma.$disconnect();
    await DatabaseService.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrationHelper().catch(console.error);
}

export { migrationHelper };