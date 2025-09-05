#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Executando Testes de Integração da API de Backup\n');

// Verificar se o ambiente está configurado
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Variáveis de ambiente ausentes:', missingEnvVars.join(', '));
  console.warn('   Alguns testes podem falhar ou ser pulados.\n');
}

// Configurar ambiente de teste
process.env.NODE_ENV = 'test';
process.env.BACKUP_DIRECTORY = path.join(process.cwd(), 'test-backups-integration');

// Criar diretório de teste
if (!fs.existsSync(process.env.BACKUP_DIRECTORY)) {
  fs.mkdirSync(process.env.BACKUP_DIRECTORY, { recursive: true });
}

const testSuites = [
  {
    name: 'Testes E2E de Endpoints',
    pattern: 'backup-api.integration.test.ts',
    description: 'Testa todos os endpoints de backup de ponta a ponta'
  },
  {
    name: 'Testes de Autenticação e Autorização',
    pattern: 'backup-auth.integration.test.ts',
    description: 'Verifica controle de acesso e segurança'
  },
  {
    name: 'Testes de Operações de Arquivo',
    pattern: 'backup-file-operations.integration.test.ts',
    description: 'Testa upload, download e validação de arquivos'
  },
  {
    name: 'Testes de Performance',
    pattern: 'backup-performance.integration.test.ts',
    description: 'Avalia performance com diferentes tamanhos de arquivo'
  }
];

let totalPassed = 0;
let totalFailed = 0;
let results = [];

for (const suite of testSuites) {
  console.log(`\n📋 ${suite.name}`);
  console.log(`   ${suite.description}`);
  console.log('   ' + '─'.repeat(50));
  
  try {
    const command = `npx jest --config=src/app/api/backup/__tests__/jest.integration.config.js --testNamePattern="${suite.pattern}" --verbose`;
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ PASSOU');
    totalPassed++;
    results.push({ suite: suite.name, status: 'PASSOU', output });
    
  } catch (error) {
    console.log('❌ FALHOU');
    console.log('   Erro:', error.message.split('\n')[0]);
    totalFailed++;
    results.push({ suite: suite.name, status: 'FALHOU', error: error.message });
  }
}

// Executar todos os testes juntos para relatório de cobertura
console.log('\n📊 Gerando Relatório de Cobertura...');
try {
  execSync(
    'npx jest --config=src/app/api/backup/__tests__/jest.integration.config.js --coverage --coverageReporters=text-summary',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.log('⚠️  Erro ao gerar relatório de cobertura');
}

// Resumo final
console.log('\n' + '='.repeat(60));
console.log('📈 RESUMO DOS TESTES DE INTEGRAÇÃO');
console.log('='.repeat(60));
console.log(`✅ Suites que passaram: ${totalPassed}`);
console.log(`❌ Suites que falharam: ${totalFailed}`);
console.log(`📊 Total de suites: ${testSuites.length}`);

if (totalFailed > 0) {
  console.log('\n❌ FALHAS DETECTADAS:');
  results.filter(r => r.status === 'FALHOU').forEach(result => {
    console.log(`   • ${result.suite}`);
  });
}

// Recomendações
console.log('\n💡 PRÓXIMOS PASSOS:');
if (totalFailed === 0) {
  console.log('   • Todos os testes passaram! ✨');
  console.log('   • Considere executar testes de carga adicionais');
  console.log('   • Verifique métricas de performance em produção');
} else {
  console.log('   • Corrija os testes que falharam');
  console.log('   • Verifique configuração do ambiente de teste');
  console.log('   • Execute testes individuais para debug detalhado');
}

console.log('\n🔧 COMANDOS ÚTEIS:');
console.log('   • Executar teste específico:');
console.log('     npx jest backup-api.integration.test.ts');
console.log('   • Debug com logs detalhados:');
console.log('     npx jest --verbose --no-cache');
console.log('   • Executar apenas testes rápidos:');
console.log('     npx jest --testNamePattern="pequeno|rápido"');

// Limpar diretório de teste
try {
  fs.rmSync(process.env.BACKUP_DIRECTORY, { recursive: true, force: true });
  console.log('\n🧹 Diretório de teste limpo');
} catch (error) {
  console.log('\n⚠️  Erro ao limpar diretório de teste:', error.message);
}

// Código de saída
process.exit(totalFailed > 0 ? 1 : 0);