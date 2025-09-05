// Script para debugar dados do frontend
// Execute este script no console do navegador na página de histórico de temporadas

console.log('🔍 Debugando dados do frontend...\n');

// Verificar se os dados estão disponíveis no contexto
if (typeof window !== 'undefined') {
  console.log('📊 Dados disponíveis no contexto:');
  
  // Tentar acessar dados do localStorage ou sessionStorage
  const keys = Object.keys(localStorage);
  console.log('🗄️ LocalStorage keys:', keys);
  
  // Verificar se há dados de XP events
  keys.forEach(key => {
    if (key.includes('xp') || key.includes('season') || key.includes('gamification')) {
      console.log(`   ${key}:`, localStorage.getItem(key));
    }
  });
  
  console.log('\n💡 Para verificar os dados em tempo real:');
  console.log('1. Abra as DevTools (F12)');
  console.log('2. Vá para a aba Network');
  console.log('3. Recarregue a página');
  console.log('4. Procure pela chamada para /api/gamification/xp-events');
  console.log('5. Verifique se o parâmetro limit=10000 está sendo usado');
  
} else {
  console.log('❌ Este script deve ser executado no navegador');
}

// Instruções para verificar no React DevTools
console.log('\n🔧 Para verificar no React DevTools:');
console.log('1. Instale a extensão React Developer Tools');
console.log('2. Abra a aba Components');
console.log('3. Procure pelo PrismaProvider');
console.log('4. Verifique o estado xpEvents');
console.log('5. Confirme se há 3000+ eventos carregados');