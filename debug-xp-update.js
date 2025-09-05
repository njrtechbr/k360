const { PrismaClient } = require('@prisma/client');

async function debugXpUpdate() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugando atualização de XP...\n');
    
    // 1. Verificar estado atual do sistema
    console.log('📊 ESTADO ATUAL DO SISTEMA:\n');
    
    // Verificar temporadas
    const seasons = await prisma.gamificationSeason.findMany({
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`🗓️  T