import { PrismaClient } from '@prisma/client';
import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from '../src/lib/achievements';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const INITIAL_MODULES = [
  {
    id: 'rh',
    name: 'Recursos Humanos',
    description: 'Gerenciamento de atendentes e funcionários.',
    path: '/dashboard/rh',
    active: true
  },
  {
    id: 'pesquisa-satisfacao',
    name: 'Pesquisa de Satisfação',
    description: 'Gerenciamento de pesquisas de satisfação e avaliações.',
    path: '/dashboard/pesquisa-satisfacao',
    active: true
  },
  {
    id: 'gamificacao',
    name: 'Gamificação',
    description: 'Acompanhe o ranking, o progresso e as recompensas da equipe.',
    path: '/dashboard/gamificacao',
    active: true
  }
];

const INITIAL_FUNCOES = [
  'Escrevente II',
  'Auxiliar de cartório',
  'Escrevente',
  'Admin',
  'Escrevente I',
  'Tabelião Substituto',
  'Escrevente Agile',
  'Atendente',
  'Assistente administrativo'
];

const INITIAL_SETORES = [
  'escritura',
  'protesto',
  'procuração',
  'balcão',
  'agile',
  'administrativo'
];

const INITIAL_XP_TYPES = [
  {
    name: 'Excelência no Atendimento',
    description: 'Reconhecimento por atendimento excepcional ao cliente',
    points: 10,
    category: 'atendimento',
    icon: 'star',
    color: '#FFD700'
  },
  {
    name: 'Iniciativa',
    description: 'Reconhecimento por tomar iniciativa em situações importantes',
    points: 8,
    category: 'lideranca',
    icon: 'lightbulb',
    color: '#FF6B35'
  },
  {
    name: 'Trabalho em Equipe',
    description: 'Reconhecimento por colaboração excepcional com colegas',
    points: 6,
    category: 'colaboracao',
    icon: 'users',
    color: '#4ECDC4'
  },
  {
    name: 'Melhoria de Processo',
    description: 'Reconhecimento por sugerir ou implementar melhorias',
    points: 12,
    category: 'inovacao',
    icon: 'settings',
    color: '#45B7D1'
  },
  {
    name: 'Pontualidade Exemplar',
    description: 'Reconhecimento por pontualidade consistente',
    points: 5,
    category: 'disciplina',
    icon: 'clock',
    color: '#96CEB4'
  },
  {
    name: 'Resolução de Problemas',
    description: 'Reconhecimento por resolver problemas complexos',
    points: 15,
    category: 'competencia',
    icon: 'puzzle',
    color: '#FFEAA7'
  }
];

const INITIAL_SEASONS = [
  {
    name: 'Temporada Agosto 2025',
    startDate: new Date('2025-08-01T00:00:00.000Z'),
    endDate: new Date('2025-08-31T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Setembro 2025',
    startDate: new Date('2025-09-01T00:00:00.000Z'),
    endDate: new Date('2025-09-30T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Outubro 2025',
    startDate: new Date('2025-10-01T00:00:00.000Z'),
    endDate: new Date('2025-10-31T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Novembro 2025',
    startDate: new Date('2025-11-01T00:00:00.000Z'),
    endDate: new Date('2025-11-30T23:59:59.999Z'),
    active: false,
    xpMultiplier: 1.2
  },
  {
    name: 'Temporada Dezembro 2025',
    startDate: new Date('2025-12-01T00:00:00.000Z'),
    endDate: new Date('2025-12-31T23:59:59.999Z'),
    active: true,
    xpMultiplier: 1.5
  }
];

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Seed dos módulos
  console.log('📦 Criando módulos iniciais...');
  for (const module of INITIAL_MODULES) {
    await prisma.module.upsert({
      where: { id: module.id },
      update: {},
      create: module
    });
    console.log(`✅ Módulo criado: ${module.name}`);
  }

  // Seed dos usuários
  console.log('👤 Criando usuários iniciais...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Criar SUPERADMIN
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@sistema.com' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'superadmin@sistema.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
      modules: {
        connect: INITIAL_MODULES.map(m => ({ id: m.id }))
      }
    }
  });
  console.log(`✅ SUPERADMIN criado: ${superAdmin.email}`);

  // Criar ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@sistema.com',
      password: hashedPassword,
      role: 'ADMIN',
      modules: {
        connect: INITIAL_MODULES.map(m => ({ id: m.id }))
      }
    }
  });
  console.log(`✅ ADMIN criado: ${admin.email}`);
  console.log(`🔑 Senha padrão para ambos: admin123`);

  // Seed das funções
  console.log('👥 Criando funções iniciais...');
  for (const funcao of INITIAL_FUNCOES) {
    await prisma.funcao.upsert({
      where: { name: funcao },
      update: {},
      create: { name: funcao }
    });
    console.log(`✅ Função criada: ${funcao}`);
  }

  // Seed dos setores
  console.log('🏢 Criando setores iniciais...');
  for (const setor of INITIAL_SETORES) {
    await prisma.setor.upsert({
      where: { name: setor },
      update: {},
      create: { name: setor }
    });
    console.log(`✅ Setor criado: ${setor}`);
  }

  // Seed da configuração de gamificação
  console.log('🎮 Criando configuração de gamificação...');
  
  await prisma.gamificationConfig.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      ratingScore1: -5,
      ratingScore2: -2,
      ratingScore3: 1,
      ratingScore4: 3,
      ratingScore5: 5,
      globalXpMultiplier: 1.0
    }
  });
  console.log('✅ Configuração de gamificação criada');
  console.log(`   ⚙️ Configurações de pontuação: 1★(-5), 2★(-2), 3★(+1), 4★(+3), 5★(+5)`);
  console.log(`   🔢 Multiplicador global de XP: 1.0`);

  // Seed dos achievements
  console.log('🏆 Criando conquistas (achievements)...');
  for (const achievement of INITIAL_ACHIEVEMENTS) {
    // Converter componente React para nome de string
    const iconName = achievement.icon.displayName || achievement.icon.name || 'star';
    
    await prisma.achievementConfig.upsert({
      where: { id: achievement.id },
      update: {},
      create: {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        xp: achievement.xp,
        active: achievement.active,
        color: achievement.color,
        icon: iconName
      }
    });
    console.log(`✅ Achievement criado: ${achievement.title}`);
  }

  // Seed dos level rewards
  console.log('🎖️ Criando recompensas de nível...');
  for (const reward of INITIAL_LEVEL_REWARDS) {
    // Converter componente React para nome de string
    const iconName = reward.icon.displayName || reward.icon.name || 'medal';
    
    await prisma.levelTrackConfig.upsert({
      where: { level: reward.level },
      update: {},
      create: {
        level: reward.level,
        title: reward.title,
        description: reward.description,
        active: reward.active,
        color: reward.color,
        icon: iconName
      }
    });
    console.log(`✅ Level reward criado: Nível ${reward.level} - ${reward.title}`);
  }

  // Seed dos tipos de XP avulso
  console.log('⚡ Criando tipos de XP avulso...');
  for (const xpType of INITIAL_XP_TYPES) {
    await prisma.xpTypeConfig.upsert({
      where: { name: xpType.name },
      update: {},
      create: {
        name: xpType.name,
        description: xpType.description,
        points: xpType.points,
        category: xpType.category,
        icon: xpType.icon,
        color: xpType.color,
        createdBy: superAdmin.id
      }
    });
    console.log(`✅ Tipo de XP criado: ${xpType.name} (${xpType.points} pontos)`);
  }

  // Seed das temporadas de gamificação
  console.log('📅 Criando temporadas de gamificação...');
  for (const season of INITIAL_SEASONS) {
    const createdSeason = await prisma.gamificationSeason.upsert({
      where: { name: season.name },
      update: {},
      create: {
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        active: season.active,
        xpMultiplier: season.xpMultiplier
      }
    });
    console.log(`✅ Temporada criada: ${season.name}`);
    console.log(`   📆 Período: ${season.startDate.toLocaleDateString('pt-BR')} - ${season.endDate.toLocaleDateString('pt-BR')}`);
    console.log(`   🔢 Multiplicador XP: ${season.xpMultiplier}x`);
    console.log(`   ${season.active ? '🟢 Ativa' : '🔴 Inativa'}`);
  }

  console.log('🎉 Seed concluído com sucesso!');
  console.log('');
  console.log('📊 Resumo do que foi criado:');
  console.log(`   👤 2 usuários (SUPERADMIN e ADMIN)`);
  console.log(`   📦 ${INITIAL_MODULES.length} módulos`);
  console.log(`   👥 ${INITIAL_FUNCOES.length} funções`);
  console.log(`   🏢 ${INITIAL_SETORES.length} setores`);
  console.log(`   🏆 ${INITIAL_ACHIEVEMENTS.length} conquistas`);
  console.log(`   🎖️ ${INITIAL_LEVEL_REWARDS.length} recompensas de nível`);
  console.log(`   ⚡ ${INITIAL_XP_TYPES.length} tipos de XP avulso`);
  console.log(`   📅 ${INITIAL_SEASONS.length} temporadas de gamificação`);
  console.log(`   🎮 1 configuração de gamificação`);
  console.log('');
  console.log('🔐 Credenciais de acesso:');
  console.log('   SUPERADMIN: superadmin@sistema.com / admin123');
  console.log('   ADMIN: admin@sistema.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });