const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAchievementsPercentage() {
    try {
        console.log('🔍 Debugando cálculo de porcentagem das conquistas...\n');

        // Buscar todas as conquistas
        const achievements = await prisma.achievementConfig.findMany({
            orderBy: { title: 'asc' }
        });

        console.log(`📊 Total de conquistas configuradas: ${achievements.length}`);
        
        // Buscar todos os atendentes
        const attendants = await prisma.attendant.findMany({
            select: { id: true, name: true }
        });

        console.log(`👥 Total de atendentes: ${attendants.length}\n`);

        // Verificar cada atendente
        for (const attendant of attendants.slice(0, 5)) { // Apenas os primeiros 5 para teste
            console.log(`\n🔍 Analisando: ${attendant.name}`);
            
            const unlockedAchievements = await prisma.unlockedAchievement.findMany({
                where: { attendantId: attendant.id }
            });

            console.log(`  Conquistas desbloqueadas: ${unlockedAchievements.length}`);
            
            // Verificar duplicatas
            const achievementIds = unlockedAchievements.map(u => u.achievementId);
            const uniqueIds = [...new Set(achievementIds)];
            
            if (achievementIds.length !== uniqueIds.length) {
                console.log(`  ⚠️  DUPLICATAS ENCONTRADAS!`);
                console.log(`  Total: ${achievementIds.length}, Únicos: ${uniqueIds.length}`);
                
                // Mostrar duplicatas
                const duplicates = achievementIds.filter((id, index) => achievementIds.indexOf(id) !== index);
                console.log(`  IDs duplicados: ${[...new Set(duplicates)]}`);
            }

            const percentage = achievements.length > 0 ? (uniqueIds.length / achievements.length) * 100 : 0;
            console.log(`  Porcentagem: ${Math.round(percentage)}%`);
            
            if (percentage > 100) {
                console.log(`  🚨 ERRO: Porcentagem acima de 100%!`);
                console.log(`  Únicos: ${uniqueIds.length} / Total: ${achievements.length}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugAchievementsPercentage();