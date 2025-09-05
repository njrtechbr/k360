import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateBackupForm } from '../CreateBackupForm';
import type { BackupOptions } from '@/hooks/useBackupManager';

// Mock do hook useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('CreateBackupForm', () => {
  const mockOnBackupCreated = jest.fn();
  const mockOnCreateBackup = jest.fn();

  const defaultProps = {
    onBackupCreated: mockOnBackupCreated,
    isCreating: false,
    onCreateBackup: mockOnCreateBackup,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o formulário corretamente', () => {
    render(<CreateBackupForm {...defaultProps} />);
    
    expect(screen.getByText('Criar Novo Backup')).toBeInTheDocument();
    expect(screen.getByText('Configure as opções do backup do banco de dados')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do Arquivo (Opcional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Incluir Estrutura (Schema)')).toBeInTheDocument();
    expect(screen.getByLabelText('Incluir Dados')).toBeInTheDocument();
    expect(screen.getByLabelText('Comprimir Arquivo')).toBeInTheDocument();
  });

  it('deve ter valores padrão corretos', () => {
    render(<CreateBackupForm {...defaultProps} />);
    
    const schemaCheckbox = screen.getByLabelText('Incluir Estrutura (Schema)') as HTMLInputElement;
    const dataCheckbox = screen.getByLabelText('Incluir Dados') as HTMLInputElement;
    const compressCheckbox = screen.getByLabelText('Comprimir Arquivo') as HTMLInputElement;
    
    expect(schemaCheckbox.checked).toBe(true);
    expect(dataCheckbox.checked).toBe(true);
    expect(compressCheckbox.checked).toBe(true);
  });

  it('deve desabilitar o botão quando isCreating é true', () => {
    render(<CreateBackupForm {...defaultProps} isCreating={true} />);
    
    const createButton = screen.getByRole('button', { name: /criando backup/i });
    expect(createButton).toBeDisabled();
  });

  it('deve mostrar aviso quando nem dados nem schema estão selecionados', () => {
    render(<CreateBackupForm {...defaultProps} />);
    
    const schemaCheckbox = screen.getByLabelText('Incluir Estrutura (Schema)');
    const dataCheckbox = screen.getByLabelText('Incluir Dados');
    
    fireEvent.click(schemaCheckbox);
    fireEvent.click(dataCheckbox);
    
    expect(screen.getByText('Atenção: Você deve incluir pelo menos a estrutura ou os dados no backup.')).toBeInTheDocument();
  });

  it('deve chamar onCreateBackup com opções corretas ao submeter', async () => {
    mockOnCreateBackup.mockResolvedValue({ success: true });
    
    render(<CreateBackupForm {...defaultProps} />);
    
    const filenameInput = screen.getByLabelText('Nome do Arquivo (Opcional)');
    fireEvent.change(filenameInput, { target: { value: 'meu_backup' } });
    
    const createButton = screen.getByRole('button', { name: /criar backup/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockOnCreateBackup).toHaveBeenCalledWith({
        filename: 'meu_backup',
        includeData: true,
        includeSchema: true,
        compress: true,
      });
    });
  });

  it('deve chamar onBackupCreated após sucesso', async () => {
    mockOnCreateBackup.mockResolvedValue({ success: true });
    
    render(<CreateBackupForm {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: /criar backup/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockOnBackupCreated).toHaveBeenCalled();
    });
  });

  it('deve mostrar configurações avançadas quando clicado', () => {
    render(<CreateBackupForm {...defaultProps} />);
    
    const advancedButton = screen.getByText('Mostrar Configurações Avançadas');
    fireEvent.click(advancedButton);
    
    expect(screen.getByText('Configurações Avançadas:')).toBeInTheDocument();
    expect(screen.getByText('• Diretório de destino: /app/backups')).toBeInTheDocument();
  });

  it('deve calcular tamanho estimado corretamente', () => {
    render(<CreateBackupForm {...defaultProps} />);
    
    // Com dados e schema comprimido
    expect(screen.getByText('16 MB')).toBeInTheDocument(); // (2+50) * 0.3 = 15.6 ≈ 16
    
    // Desabilitar compressão
    const compressCheckbox = screen.getByLabelText('Comprimir Arquivo');
    fireEvent.click(compressCheckbox);
    
    expect(screen.getByText('52 MB')).toBeInTheDocument(); // 2+50 = 52
  });

  it('deve limpar o formulário quando clicado em Limpar', () => {
    render(<CreateBackupForm {...defaultProps} />);
    
    const filenameInput = screen.getByLabelText('Nome do Arquivo (Opcional)') as HTMLInputElement;
    fireEvent.change(filenameInput, { target: { value: 'teste' } });
    
    const clearButton = screen.getByRole('button', { name: /limpar/i });
    fireEvent.click(clearButton);
    
    expect(filenameInput.value).toBe('');
  });
});