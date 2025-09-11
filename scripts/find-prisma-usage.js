#!/usr/bin/env node

/**
 * Script para identificar uso direto do Prisma no frontend
 * Exclui APIs (src/app/api) pois essas devem usar Prisma
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const results = {
  prismaImports: [],
  prismaServices: [],
  prismaClients: [],
  prismaTypes: [],
  dashboardServices: [],
  achievementServices: []
};

function scanDirectory(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const itemRelativePath = path.join(relativePath, item);
    
    // Pular APIs, node_modules, .next, etc
    if ((item === 'api' && relativePath === 'app') || 
        item === 'node_modules' || 
        item.startsWith('.')) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, itemRelativePath);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      scanFile(fullPath, itemRelativePath);
    }
  }
}

function scanFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Imports diretos do Prisma
      if (line.match(/import.*@\/lib\/prisma|from.*@\/lib\/prisma/)) {
        results.prismaImports.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
      
      // Uso de PrismaClient
      if (line.match(/new PrismaClient|PrismaClient\(\)/)) {
        results.prismaClients.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
      
      // Imports de tipos do Prisma
      if (line.match(/import.*@prisma\/client|from.*@prisma\/client/)) {
        results.prismaTypes.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
      
      // Serviços Prisma legados
      if (line.match(/UserPrismaService|AttendantPrismaService|EvaluationPrismaService/)) {
        results.prismaServices.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
      
      // Serviços de Dashboard que usam Prisma
      if (line.match(/RealtimeDashboardService|DashboardService/) && !relativePath.includes('test')) {
        results.dashboardServices.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
      
      // Serviços de Achievement que usam Prisma
      if (line.match(/AchievementProcessor|achievement-checker\.service/) && !relativePath.includes('test')) {
        results.achievementServices.push({
          file: relativePath,
          line: lineNum,
          content: line.trim()
        });
      }
    });
  } catch (error) {
    console.error(`Erro ao ler arquivo ${relativePath}:`, error.message);
  }
}

function printResults() {
  console.log('🔍 ANÁLISE DE USO DO PRISMA NO FRONTEND\n');
  
  console.log('❌ IMPORTS DIRETOS DO PRISMA (CRÍTICO):');
  if (results.prismaImports.length === 0) {
    console.log('   ✅ Nenhum encontrado');
  } else {
    results.prismaImports.forEach(item => {
      console.log(`   📄 ${item.file}:${item.line} - ${item.content}`);
    });
  }
  
  console.log('\n❌ INSTÂNCIAS DE PRISMACLIENT (CRÍTICO):');
  if (results.prismaClients.length === 0) {
    console.log('   ✅ Nenhuma encontrada');
  } else {
    results.prismaClients.forEach(item => {
      console.log(`   📄 ${item.file}:${item.line} - ${item.content}`);
    });
  }
  
  console.log('\n⚠️  SERVIÇOS PRISMA LEGADOS (PARA REMOÇÃO):');
  if (results.prismaServices.length === 0) {
    console.log('   ✅ Nenhum encontrado');
  } else {
    results.prismaServices.forEach(item => {
      console.log(`   📄 ${item.file}:${item.line} - ${item.content}`);
    });
  }
  
  console.log('\n⚠️  SERVIÇOS DE DASHBOARD (MIGRAR PARA API):');
  if (results.dashboardServices.length === 0) {
    console.log('   ✅ Nenhum encontrado');
  } else {
    results.dashboardServices.forEach(item => {
      console.log(`   📄 ${item.file}:${item.line} - ${item.content}`);
    });
  }
  
  console.log('\n⚠️  SERVIÇOS DE ACHIEVEMENT (MIGRAR PARA API):');
  if (results.achievementServices.length === 0) {
    console.log('   ✅ Nenhum encontrado');
  } else {
    results.achievementServices.forEach(item => {
      console.log(`   📄 ${item.file}:${item.line} - ${item.content}`);
    });
  }
  
  console.log('\n📝 TIPOS DO PRISMA (MIGRAR PARA TIPOS LOCAIS):');
  if (results.prismaTypes.length === 0) {
    console.log('   ✅ Nenhum encontrado');
  } else {
    // Agrupar por arquivo para evitar spam
    const typesByFile = {};
    results.prismaTypes.forEach(item => {
      if (!typesByFile[item.file]) {
        typesByFile[item.file] = [];
      }
      typesByFile[item.file].push(item);
    });
    
    Object.keys(typesByFile).forEach(file => {
      console.log(`   📄 ${file} (${typesByFile[file].length} imports)`);
    });
  }
  
  // Resumo
  const totalIssues = results.prismaImports.length + 
                     results.prismaClients.length + 
                     results.prismaServices.length + 
                     results.dashboardServices.length + 
                     results.achievementServices.length;
  
  console.log('\n📊 RESUMO:');
  console.log(`   🔴 Problemas críticos: ${results.prismaImports.length + results.prismaClients.length}`);
  console.log(`   🟡 Serviços para migrar: ${results.dashboardServices.length + results.achievementServices.length}`);
  console.log(`   🟠 Serviços para remover: ${results.prismaServices.length}`);
  console.log(`   📝 Arquivos com tipos Prisma: ${Object.keys(results.prismaTypes.reduce((acc, item) => { acc[item.file] = true; return acc; }, {})).length}`);
  
  if (totalIssues === 0) {
    console.log('\n🎉 PARABÉNS! Nenhum uso direto do Prisma encontrado no frontend!');
  } else {
    console.log(`\n⚠️  Total de itens para migração: ${totalIssues}`);
  }
}

// Executar análise
scanDirectory(srcDir);
printResults();