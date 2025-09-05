// Teste simples para verificar se o modelo XpAvulsoConfig existe
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConfig() {
  try {
    console.log('Testando conexão com XpAvulsoConfig...');
    
    // Tentar buscar configuração
    const config = await prisma.xpAvulsoConfig.findUnique({
      where: { id: 'main' }
    });
    
    console.log('Configuração encontrada:', config);
    
    if (!config) {
      console.log('Criando configuração padrão...');
      const newConfig = await prisma.xpAvulsoConfig.create({
        data: { id: 'main' }
      });
      console.log('Configuração criada:', newConfig);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConfig();