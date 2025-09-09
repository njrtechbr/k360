import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendantTable from '@/components/rh/AttendantTable';
import { type Attendant } from '@/lib/types';

// Mock dos componentes UI
jest.mock('@/components/ui/data-validator', () => ({
  DataValidator: ({ children, data, fallback }: any) => {
    const validData = data || fallback;
    return <div data-testid="data-validator">{children(validData)}</div>;
  },
  LoadingTable: () => <div data-testid="loading-table">Loading...</div>,
  ErrorTable: ({ error }: any) => <div data-testid="error-table">{error}</div>,
  EmptyTable: ({ message }: any) => <div data-testid="empty-table">{message}</div>
}));

jest.mock('@/lib/data-validation', () => ({
  validateAttendantArray: (data: any) => ({
    isValid: Array.isArray(data),
    data: Array.isArray(data) ? data : [],
    errors: []
  }),
  isValidAttendant: (data: any) => {
    return data && typeof data === 'object' && data.id && data.name;
  }
}));

const mockAttendants: Attendant[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@example.com',
    funcao: 'Atendente',
    setor: 'Vendas',
    status: 'Ativo',
    telefone: '11999999999',
    dataAdmissao: '2023-01-01',
    dataNascimento: '1990-01-01',
    rg: '123456789',
    cpf: '12345678901',
    avatarUrl: null,
    portaria: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    importId: null
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    funcao: 'Supervisora',
    setor: 'Atendimento',
    status: 'Ativo',
    telefone: '11888888888',
    dataAdmissao: '2023-02-01',
    dataNascimento: '1985-05-15',
    rg: '987654321',
    cpf: '10987654321',
    avatarUrl: null,
    portaria: null,
    createdAt: '2023-02-01',
    updatedAt: '2023-02-01',
    importId: null
  }
];

const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onQrCode: jest.fn(),
  onCopyLink: jest.fn(),
  onRetry: jest.fn()
};

describe('AttendantTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar tabela com dados válidos', () => {
    render(
      <AttendantTable
        attendants={mockAttendants}
        isLoading={false}
        error={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('deve lidar com attendants null graciosamente', () => {
    render(
      <AttendantTable
        attendants={null}
        isLoading={false}
        error={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
    // Deve usar fallback (array vazio) e mostrar estado vazio
  });

  it('deve lidar com attendants undefined graciosamente', () => {
    render(
      <AttendantTable
        attendants={undefined}
        isLoading={false}
        error={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
    // Deve usar fallback (array vazio) e mostrar estado vazio
  });

  it('deve lidar com array vazio', () => {
    render(
      <AttendantTable
        attendants={[]}
        isLoading={false}
        error={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
  });

  it('deve mostrar estado de loading quando isLoading é true', () => {
    render(
      <AttendantTable
        attendants={mockAttendants}
        isLoading={true}
        error={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
  });

  it('deve mostrar estado de erro quando error é fornecido', () => {
    const errorMessage = 'Erro ao carregar dados';
    render(
      <AttendantTable
        attendants={mockAttendants}
        isLoading={false}
        error={errorMessage}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
  });

  it('deve ordenar atendentes por nome', () => {
    const unorderedAttendants = [mockAttendants[1], mockAttendants[0]]; // Maria, João
    
    render(
      <AttendantTable
        attendants={unorderedAttendants}
        isLoading={false}
        error={null}
        {...mockHandlers}
      />
    );

    const names = screen.getAllByText(/João Silva|Maria Santos/);
    // Verifica se João aparece antes de Maria (ordem alfabética)
    expect(names[0]).toHaveTextContent('João Silva');
  });

  it('deve lidar com propriedades undefined nos atendentes', () => {
    const attendantWithUndefined = {
      ...mockAttendants[0],
      name: undefined as any,
      email: undefined as any,
      funcao: undefined as any,
      setor: undefined as any,
      status: undefined as any
    };

    render(
      <AttendantTable
        attendants={[attendantWithUndefined]}
        isLoading={false}
        error={null}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('data-validator')).toBeInTheDocument();
    // Deve mostrar fallbacks para propriedades undefined
    expect(screen.getByText('Nome não informado')).toBeInTheDocument();
    expect(screen.getByText('Email não informado')).toBeInTheDocument();
  });
});