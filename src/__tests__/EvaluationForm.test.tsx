import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EvaluationForm } from '@/components/survey/EvaluationForm';
import type { Attendant } from '@/lib/types';

// Mock do useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

const mockAttendants: Attendant[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@test.com',
    funcao: 'Atendente',
    setor: 'Vendas',
    status: 'Ativo',
    telefone: '11999999999',
    dataAdmissao: new Date('2023-01-01'),
    dataNascimento: new Date('1990-01-01'),
    rg: '123456789',
    cpf: '12345678901',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@test.com',
    funcao: 'Supervisora',
    setor: 'Atendimento',
    status: 'Ativo',
    telefone: '11888888888',
    dataAdmissao: new Date('2022-06-01'),
    dataNascimento: new Date('1985-05-15'),
    rg: '987654321',
    cpf: '10987654321',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('EvaluationForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o formulário corretamente', () => {
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Atendente')).toBeInTheDocument();
    expect(screen.getByText('Avaliação')).toBeInTheDocument();
    expect(screen.getByText('Comentário')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar avaliação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('deve mostrar lista de atendentes no select', async () => {
    const user = userEvent.setup();
    
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('deve permitir selecionar avaliação por estrelas', async () => {
    const user = userEvent.setup();
    
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const stars = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('lucide-star')
    );

    // Clicar na terceira estrela (nota 3)
    await user.click(stars[2]);

    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('deve validar campos obrigatórios', async () => {
    const user = userEvent.setup();
    
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /salvar avaliação/i });
    await user.click(submitButton);

    expect(screen.getByText('Selecione um atendente')).toBeInTheDocument();
    expect(screen.getByText('A nota deve ser entre 1 e 5 estrelas')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('deve submeter formulário com dados válidos', async () => {
    const user = userEvent.setup();
    
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Selecionar atendente
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    await user.click(screen.getByText('João Silva'));

    // Selecionar nota (5 estrelas)
    const stars = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('lucide-star')
    );
    await user.click(stars[4]);

    // Preencher comentário
    const comentarioInput = screen.getByPlaceholderText(/descreva sua experiência/i);
    await user.type(comentarioInput, 'Excelente atendimento!');

    // Submeter formulário
    const submitButton = screen.getByRole('button', { name: /salvar avaliação/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        attendantId: '1',
        nota: 5,
        comentario: 'Excelente atendimento!'
      });
    });
  });

  it('deve chamar onCancel quando cancelar', async () => {
    const user = userEvent.setup();
    
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('deve mostrar estado de loading durante submissão', () => {
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    expect(screen.getByText('Salvando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
  });

  it('deve preencher dados iniciais quando fornecidos', () => {
    const initialData = {
      attendantId: '1',
      nota: 4,
      comentario: 'Bom atendimento'
    };

    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bom atendimento')).toBeInTheDocument();
  });

  it('deve lidar com lista vazia de atendentes', () => {
    render(
      <EvaluationForm
        attendants={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
  });

  it('deve mostrar preview do atendente selecionado', async () => {
    const user = userEvent.setup();
    
    render(
      <EvaluationForm
        attendants={mockAttendants}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Selecionar atendente
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    await user.click(screen.getByText('João Silva'));

    // Verificar se o preview aparece
    expect(screen.getByText('joao@test.com')).toBeInTheDocument();
    expect(screen.getByText('Atendente - Vendas')).toBeInTheDocument();
  });
});