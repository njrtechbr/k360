import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackupProgress } from '../BackupProgress';
import { useToast } from '@/hooks/use-toast';

// Mock do hook useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}));

// Mock dos ícones do lucide-react
jest.mock('lucide-react', () => ({
  Database: () => <div data-testid="database-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  X: () => <div data-testid="x-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Play: () => <div data-testid="play-icon" />
}));

// Mock do fetch global
global.fetch = jest.fn();

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe('BackupProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('deve renderizar corretamente quando inativo', () => {
    render(
      <BackupProgress
        isActive={false}
        progress={0}
        message=""
      />
    );

    // Componente não deve ser renderizado quando inativo e progresso é 0
    expect(screen.queryByText('Criando Backup')).not.toBeInTheDocument();
  });

  it('deve renderizar corretamente quando ativo', () => {
    render(
      <BackupProgress
        isActive={true}
        progress={50}
        message="Processando dados..."
      />
    );

    expect(screen.getByText('Criando Backup')).toBeInTheDocument();
    expect(screen.getByText('Processando dados...')).toBeInTheDocument();
    // Verificar se o progresso está sendo exibido (pode aparecer em múltiplos lugares)
    expect(screen.getAllByText('50%')).toHaveLength(2); // Na barra e nas estatísticas
  });

  it('deve mostrar status concluído quando progresso é 100%', () => {
    render(
      <BackupProgress
        isActive={false}
        progress={100}
        message="Backup concluído!"
      />
    );

    expect(screen.getByText('Backup Concluído')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('deve mostrar botão de cancelar quando ativo e callback fornecido', () => {
    const mockCancel = jest.fn();
    
    render(
      <BackupProgress
        isActive={true}
        progress={30}
        message="Processando..."
        onCancel={mockCancel}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalled();
  });

  it('deve iniciar polling quando backupId é fornecido', () => {
    const mockProgressUpdate = jest.fn();

    render(
      <BackupProgress
        isActive={true}
        progress={50}
        message="Iniciando..."
        backupId="test-backup-123"
        onProgressUpdate={mockProgressUpdate}
      />
    );

    // Verificar se o componente renderiza com backupId
    expect(screen.getByText('Criando Backup')).toBeInTheDocument();
    expect(screen.getByText('Iniciando...')).toBeInTheDocument();
    
    // Verificar se os logs de monitoramento foram adicionados
    expect(screen.getByText('Sistema de monitoramento ativado')).toBeInTheDocument();
    expect(screen.getByText('Monitoramento de progresso iniciado')).toBeInTheDocument();
  });

  it('deve pausar e retomar polling', async () => {
    render(
      <BackupProgress
        isActive={true}
        progress={50}
        message="Processando..."
        backupId="test-backup-123"
      />
    );

    // Encontrar e clicar no botão de pausar
    const pauseButton = screen.getByText('Pausar');
    fireEvent.click(pauseButton);

    // Verificar se mudou para "Retomar"
    expect(screen.getByText('Retomar')).toBeInTheDocument();
    
    // Verificar se há múltiplas instâncias de "Pausado" (esperado)
    expect(screen.getAllByText('Pausado').length).toBeGreaterThan(0);

    // Clicar em retomar
    const resumeButton = screen.getByText('Retomar');
    fireEvent.click(resumeButton);

    // Verificar se voltou para "Pausar"
    expect(screen.getByText('Pausar')).toBeInTheDocument();
  });

  it('deve adicionar logs detalhados', () => {
    render(
      <BackupProgress
        isActive={true}
        progress={25}
        message="Conectando ao banco..."
      />
    );

    // Verificar se o log inicial foi adicionado
    expect(screen.getByText('Log de Operações (1)')).toBeInTheDocument();
    expect(screen.getByText('Iniciando processo de backup...')).toBeInTheDocument();
  });

  it('deve limpar logs quando solicitado', () => {
    render(
      <BackupProgress
        isActive={true}
        progress={25}
        message="Processando..."
      />
    );

    // Verificar se há logs iniciais
    expect(screen.getByText(/Log de Operações \(\d+\)/)).toBeInTheDocument();

    // Clicar no botão limpar
    const clearButton = screen.getByText('Limpar');
    fireEvent.click(clearButton);

    // Verificar se os logs foram limpos (sem backupId, não mostra logs)
    expect(screen.queryByText(/Log de Operações/)).not.toBeInTheDocument();
  });

  it('deve tratar erros de polling graciosamente', () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);

    render(
      <BackupProgress
        isActive={true}
        progress={50}
        message="Processando..."
        backupId="test-backup-123"
      />
    );

    // Verificar se o componente renderiza mesmo com erro potencial
    expect(screen.getByText('Criando Backup')).toBeInTheDocument();
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('deve mostrar indicador de conexão correto', () => {
    render(
      <BackupProgress
        isActive={true}
        progress={50}
        message="Processando..."
        backupId="test-backup-123"
      />
    );

    // Verificar se há múltiplas instâncias de "Offline" (esperado)
    expect(screen.getAllByText('Offline').length).toBeGreaterThan(0);
    
    // Verificar se há controles de monitoramento
    expect(screen.getByText('Pausar')).toBeInTheDocument();
  });

  it('deve cancelar backup via API quando backupId é fornecido', async () => {
    const mockCancelResponse = { ok: true };
    (global.fetch as jest.Mock).mockResolvedValue(mockCancelResponse);

    const mockCancel = jest.fn();

    render(
      <BackupProgress
        isActive={true}
        progress={30}
        message="Processando..."
        backupId="test-backup-123"
        onCancel={mockCancel}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/backup/cancel/test-backup-123',
        { method: 'POST' }
      );
    });

    expect(mockCancel).toHaveBeenCalled();
  });
});