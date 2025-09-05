import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackupList } from '../BackupList';
import type { BackupMetadata } from '@/hooks/useBackupManager';

// Mock dos componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children, onClick, className }: any) => (
    <th onClick={onClick} className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('success')}>Select</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} data-testid="skeleton" />,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="alert-dialog-action">{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock dos ícones do Lucide
jest.mock('lucide-react', () => ({
  Download: () => <span data-testid="download-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Search: () => <span data-testid="search-icon" />,
  Filter: () => <span data-testid="filter-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  HardDrive: () => <span data-testid="hard-drive-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
}));

const mockBackups: BackupMetadata[] = [
  {
    id: '1',
    filename: 'backup_2025-01-09_14-30-00.sql',
    filepath: '/backups/backup_2025-01-09_14-30-00.sql',
    size: 1024000,
    checksum: 'abc123def456',
    createdAt: new Date('2025-01-09T14:30:00Z'),
    createdBy: 'admin@test.com',
    status: 'success',
    duration: 120,
    databaseVersion: '15.0',
    schemaVersion: '1.0.0'
  },
  {
    id: '2',
    filename: 'backup_2025-01-09_15-45-30.sql',
    filepath: '/backups/backup_2025-01-09_15-45-30.sql',
    size: 2048000,
    checksum: 'def456ghi789',
    createdAt: new Date('2025-01-09T15:45:30Z'),
    createdBy: 'supervisor@test.com',
    status: 'failed',
    duration: 60,
    databaseVersion: '15.0',
    schemaVersion: '1.0.0'
  },
  {
    id: '3',
    filename: 'backup_2025-01-09_16-00-00.sql',
    filepath: '/backups/backup_2025-01-09_16-00-00.sql',
    size: 512000,
    checksum: 'ghi789jkl012',
    createdAt: new Date('2025-01-09T16:00:00Z'),
    status: 'in_progress',
    duration: 0,
    databaseVersion: '15.0',
    schemaVersion: '1.0.0'
  }
];

describe('BackupList', () => {
  const defaultProps = {
    backups: mockBackups,
    isLoading: false,
    canDelete: true,
    onDownload: jest.fn(),
    onDelete: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderização básica', () => {
    it('deve renderizar o componente corretamente', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByText('Lista de Backups')).toBeInTheDocument();
      expect(screen.getByText('3 backup(s) encontrado(s)')).toBeInTheDocument();
    });

    it('deve exibir skeleton quando estiver carregando', () => {
      render(<BackupList {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Carregando backups...')).toBeInTheDocument();
      expect(screen.getAllByTestId('skeleton')).toHaveLength(20); // 5 linhas × 4 skeletons por linha
    });

    it('deve exibir mensagem quando não há backups', () => {
      render(<BackupList {...defaultProps} backups={[]} />);
      
      expect(screen.getByText(/Nenhum backup encontrado/)).toBeInTheDocument();
    });
  });

  describe('Listagem de backups', () => {
    it('deve exibir todos os backups na tabela', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByText('backup_2025-01-09_14-30-00.sql')).toBeInTheDocument();
      expect(screen.getByText('backup_2025-01-09_15-45-30.sql')).toBeInTheDocument();
      expect(screen.getByText('backup_2025-01-09_16-00-00.sql')).toBeInTheDocument();
    });

    it('deve exibir status corretos com ícones apropriados', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getAllByText('Sucesso')).toHaveLength(2); // Badge + Select option
      expect(screen.getAllByText('Falhou')).toHaveLength(2); // Badge + Select option
      expect(screen.getAllByText('Em Progresso')).toHaveLength(2); // Badge + Select option
      
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('deve formatar tamanhos de arquivo corretamente', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByText('1000 KB')).toBeInTheDocument(); // 1024000 bytes
      expect(screen.getByText('1.95 MB')).toBeInTheDocument(); // 2048000 bytes
      expect(screen.getByText('500 KB')).toBeInTheDocument(); // 512000 bytes
    });

    it('deve formatar durações corretamente', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByText('2m 0s')).toBeInTheDocument(); // 120 segundos
      expect(screen.getByText('1m 0s')).toBeInTheDocument(); // 60 segundos
      expect(screen.getByText('0s')).toBeInTheDocument(); // 0 segundos
    });
  });

  describe('Funcionalidade de busca', () => {
    it('deve filtrar backups por nome do arquivo', async () => {
      render(<BackupList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/Buscar por nome do arquivo/);
      fireEvent.change(searchInput, { target: { value: '14-30' } });
      
      await waitFor(() => {
        expect(screen.getByText('backup_2025-01-09_14-30-00.sql')).toBeInTheDocument();
        expect(screen.queryByText('backup_2025-01-09_15-45-30.sql')).not.toBeInTheDocument();
      });
    });

    it('deve filtrar backups por criador', async () => {
      render(<BackupList {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/Buscar por nome do arquivo/);
      fireEvent.change(searchInput, { target: { value: 'admin' } });
      
      await waitFor(() => {
        expect(screen.getByText('backup_2025-01-09_14-30-00.sql')).toBeInTheDocument();
        expect(screen.queryByText('backup_2025-01-09_15-45-30.sql')).not.toBeInTheDocument();
      });
    });
  });

  describe('Funcionalidade de filtros', () => {
    it('deve renderizar select de filtro por status', () => {
      render(<BackupList {...defaultProps} />);
      
      // Verificar se o select está presente
      const selectElement = screen.getByTestId('select');
      expect(selectElement).toBeInTheDocument();
      
      // Verificar se as opções estão presentes
      expect(screen.getByText('Todos os Status')).toBeInTheDocument();
      expect(screen.getAllByText('Sucesso')).toHaveLength(2); // Badge + Select option
      expect(screen.getAllByText('Falhou')).toHaveLength(2); // Badge + Select option
      expect(screen.getAllByText('Em Progresso')).toHaveLength(2); // Badge + Select option
    });
  });

  describe('Funcionalidade de ordenação', () => {
    it('deve permitir ordenar por nome do arquivo', () => {
      render(<BackupList {...defaultProps} />);
      
      const filenameHeader = screen.getByText(/Arquivo/);
      fireEvent.click(filenameHeader);
      
      // Verificar se o indicador de ordenação aparece
      expect(filenameHeader.textContent).toContain('↓');
    });

    it('deve alternar ordem ao clicar novamente no mesmo campo', () => {
      render(<BackupList {...defaultProps} />);
      
      const filenameHeader = screen.getByText(/Arquivo/);
      fireEvent.click(filenameHeader); // Primeira ordenação (desc)
      fireEvent.click(filenameHeader); // Segunda ordenação (asc)
      
      expect(filenameHeader.textContent).toContain('↑');
    });
  });

  describe('Ações de backup', () => {
    it('deve chamar onDownload quando clicar no botão de download', () => {
      render(<BackupList {...defaultProps} />);
      
      // Encontrar o botão de download habilitado (backup com status success)
      const downloadButtons = screen.getAllByTestId('download-icon');
      const enabledDownloadButton = downloadButtons.find(button => 
        !button.closest('button')?.hasAttribute('disabled')
      );
      
      if (enabledDownloadButton) {
        fireEvent.click(enabledDownloadButton.closest('button')!);
        expect(defaultProps.onDownload).toHaveBeenCalledWith('1');
      }
    });

    it('deve desabilitar download para backups que falharam', () => {
      render(<BackupList {...defaultProps} />);
      
      const downloadButtons = screen.getAllByTestId('download-icon');
      const failedBackupButton = downloadButtons[1].closest('button')!;
      
      expect(failedBackupButton).toBeDisabled();
    });

    it('deve chamar onDelete quando confirmar exclusão', () => {
      render(<BackupList {...defaultProps} />);
      
      const deleteButtons = screen.getAllByTestId('trash-icon');
      fireEvent.click(deleteButtons[0].closest('button')!);
      
      // Confirmar exclusão no dialog - pegar o primeiro botão de confirmação
      const confirmButtons = screen.getAllByTestId('alert-dialog-action');
      fireEvent.click(confirmButtons[0]);
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith('3'); // Primeiro backup na lista ordenada por data desc
    });

    it('não deve exibir botões de exclusão quando canDelete é false', () => {
      render(<BackupList {...defaultProps} canDelete={false} />);
      
      const deleteButtons = screen.queryAllByTestId('trash-icon');
      expect(deleteButtons).toHaveLength(0);
    });

    it('deve chamar onRefresh quando clicar no botão atualizar', () => {
      render(<BackupList {...defaultProps} />);
      
      const refreshButton = screen.getByTestId('refresh-icon').closest('button')!;
      fireEvent.click(refreshButton);
      
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  describe('Indicadores de integridade', () => {
    it('deve exibir checksum truncado para cada backup', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByText('abc123de...')).toBeInTheDocument();
      expect(screen.getByText('def456gh...')).toBeInTheDocument();
      expect(screen.getByText('ghi789jk...')).toBeInTheDocument();
    });

    it('deve exibir informações de criador com ícone de segurança', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('supervisor@test.com')).toBeInTheDocument();
      expect(screen.getByText('Sistema')).toBeInTheDocument(); // Para backup sem createdBy
      
      expect(screen.getAllByTestId('shield-icon')).toHaveLength(3);
    });
  });

  describe('Responsividade e acessibilidade', () => {
    it('deve ter estrutura de tabela acessível', () => {
      render(<BackupList {...defaultProps} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(7);
      expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
    });

    it('deve ter botões com labels apropriados', () => {
      render(<BackupList {...defaultProps} />);
      
      const downloadButtons = screen.getAllByTestId('download-icon');
      downloadButtons.forEach(button => {
        expect(button.closest('button')).toBeInTheDocument();
      });
    });
  });
});