const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestAttendants() {
  try {
    // Criar atendentes de teste
    const attendants = [
      {
        id: 'att-001',
        name: 'João Silva',
        email: 'joao.silva@test.com',
        funcao: 'Atendente',
        setor: 'Vendas',
        status: 'ativo',
        telefone: '(11) 99999-0001',
        dataAdmissao: new Date('2023-01-15'),
        dataNascimento: new Date('1990-05-15'),
        rg: '12.345.678-9',
        cpf: '123.456.789-01',
      },
      {
        id: 'att-002',
        name: 'Maria Santos',
        email: 'maria.santos@test.com',
        funcao: 'Atendente',
        setor: 'Suporte',
        status: 'ativo',
        telefone: '(11) 99999-0002',
        dataAdmissao: new Date('2023-02-20'),
        dataNascimento: new Date('1985-08-22'),
        rg: '23.456.789-0',
        cpf: '234.567.890-12',
      },
      {
        id: 'att-003',
        name: 'Pedro Costa',
        email: 'pedro.costa@test.com',
        funcao: 'Supervisor',
        setor: 'Vendas',
        status: 'ativo',
        telefone: '(11) 99999-0003',
        dataAdmissao: new Date('2022-12-10'),
        dataNascimento: new Date('1988-12-03'),
        rg: '34.567.890-1',
        cpf: '345.678.901-23',
      },
    ];

    for (const attendant of attendants) {
      await prisma.attendant.upsert({
        where: { id: attendant.id },
        update: attendant,
        create: attendant,
      });
      console.log(`Atendente ${attendant.name} criado/atualizado com sucesso`);
    }

    console.log('Todos os atendentes de teste foram criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar atendentes de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAttendants();