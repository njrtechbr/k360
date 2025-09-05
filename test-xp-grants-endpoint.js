/**
 * Script para testar o endpoint de concessão de XP avulso
 */

const { XpAvulsoService } = require('./src/services/xpAvulsoService');

async function testXpAvulsoService() {
  try {
    console.log('🧪 Testando XpAvulsoService...');
    
    // Testar busca de tipos de XP
    console.log('\n📋 Testando busca de tipos de XP...');
    const xpTypes = await XpAvulsoService.findAllXpTypes(true);
    console.log(`✅ Encontrados ${xpTypes.length} tipos de XP ativos`);
    
    if (xpTypes.length > 0) {
      console.log('📝 Primeiro tipo:', {
        id: xpTypes[0].id,
        name: xpTypes[0].name,
        points: xpTypes[0].points
      });
    }
    
    // Testar busca de histórico (sem filtros)
    console.log('\n📊 Testando busca de histórico...');
    const history = await XpAvulsoService.findGrantHistory({ page: 1, limit: 5 });
    console.log(`✅ Encontradas ${history.total} concessões no histórico`);
    
    // Testar estatísticas
    console.log('\n📈 Testando estatísticas...');
    const stats = await XpAvulsoService.getGrantStatistics('30d');
    console.log('✅ Estatísticas:', {
      totalGrants: stats.totalGrants,
      totalPoints: stats.totalPoints,
      averagePoints: stats.averagePoints.toFixed(2)
    });
    
    console.log('\n✅ Todos os testes do XpAvulsoService passaram!');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testEndpointStructure() {
  try {
    console.log('\n🔍 Verificando estrutura do endpoint...');
    
    // Verificar se o arquivo do endpoint existe
    const fs = require('fs');
    const path = require('path');
    
    const endpointPath = path.join(__dirname, 'src/app/api/gamification/xp-grants/route.ts');
    
    if (fs.existsSync(endpointPath)) {
      console.log('✅ Arquivo do endpoint existe');
      
      const content = fs.readFileSync(endpointPath, 'utf8');
      
      // Verificar se tem as funções POST e GET
      if (content.includes('export async function POST')) {
        console.log('✅ Função POST implementada');
      } else {
        console.log('❌ Função POST não encontrada');
      }
      
      if (content.includes('export async function GET')) {
        console.log('✅ Função GET implementada');
      } else {
        console.log('❌ Função GET não encontrada');
      }
      
      // Verificar imports importantes
      if (content.includes('XpAvulsoService')) {
        console.log('✅ XpAvulsoService importado');
      } else {
        console.log('❌ XpAvulsoService não importado');
      }
      
      if (content.includes('AuthMiddleware')) {
        console.log('✅ AuthMiddleware importado');
      } else {
        console.log('❌ AuthMiddleware não importado');
      }
      
      if (content.includes('AuditLogger')) {
        console.log('✅ AuditLogger importado');
      } else {
        console.log('❌ AuditLogger não importado');
      }
      
    } else {
      console.log('❌ Arquivo do endpoint não existe');
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando testes do endpoint de XP avulso...\n');
  
  await testEndpointStructure();
  await testXpAvulsoService();
  
  console.log('\n🏁 Testes concluídos!');
  process.exit(0);
}

main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});