const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDuplicateAchievements() {
    try {
        console.log('🔧 Corrigindo conquistas duplicadas...\n');

        // Buscar todos os atendentes
        const attendants = await prisma.attendant.findMany({
            select: { id: true, name: true }
        });

        let totalFixed = 0;

        for (const attendant of attendants) {
            console.log(`🔍 Verificando: ${attendant.name}`);
            
            const unlockedAchievements = await prisma.unlockedAchievement.findMany({
                where: { attendantId: attendant.id },
                orderBy: { unlockedAt: 'asc' } // Manter a mais antiga
            });

            if (unlockedAchievements.length === 0) {
                console.log(`  ✅ Nenhuma conquista encontrada`);
                continue;
            }

            // Agrupar por achievementId
            const grouped = {};
            unlockedAchievements.forEach(achievement => {
                if (!grouped[achievement.achievementId]) {
                    grouped[achievement.achievementId] = [];
                }
                grouped[achievement.achievementId].push(achievement);
            });

            // Encontrar duplicatas
            const duplicates = [];
            Object.keys(grouped).forEach(achievementId => {
                if (grouped[achievementId].length > 1) {
                    // Manter apenas a primeira (mais antiga), remover as outras
                    const toRemove = grouped[achievementId].slice(1);
                    duplicates.push(...toRemove);
                }
            });

            if (duplicates.length > 0) {
                console.log(`  ⚠️  Encontradas ${duplicates.length} duplicatas`);
                
                // Remover duplicatas
                for (const duplicate of duplicates) {
                    await prisma.unlockedAchievement.delete({
                        where: { id: duplicate.id }
                    });
                    console.log(`    🗑️  Removida duplicata: ${duplicate.achievementId}`);
                }
                
                totalFixed += duplicates.length;
            } else {
                console.log(`  ✅ Nenhuma duplicata encontrada`);
            }
        }

        console.log(`\n🎉 Correção concluída!`);
        console.log(`📊 Total de duplicatas removidas: ${totalFixed}`);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicateAchievements();