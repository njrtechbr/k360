/**
 * @jest-environment jsdom
 */

// Mock de todos os ícones do lucide-react
jest.mock('lucide-react', () => ({
  Star: () => <div data-testid="star-icon">Star</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Power: () => <div data-testid="power-icon">Power</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
}));

// Mock do @tanstack/react-table
jest.mock('@tanstack/react-table', () => ({
  useReactTable: () => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: [] }),
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getColumn: () => ({ getFilterValue: () => '', setFilterValue: jest.fn() }),
    getAllColumns: () => [],
    getCanPreviousPage: () => false,
    getCanNextPage: () => false,
    previousPage: jest.fn(),
    nextPage: jest.fn(),
  }),
  getCoreRowModel: () => ({}),
  getPaginationRowModel: () => ({}),
  getSortedRowModel: () => ({}),
  getFilteredRowModel: () => ({}),
  flexRender: (content: any) => content,
}));

// Mock do react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => fn,
    reset: jest.fn(),
  }),
}));

// Mock do @hookform/resolvers/zod
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => ({}),
}));

// Mock do zod
jest.mock('zod', () => {
  const createChainableMock = (): any => ({
    min: () => createChainableMock(),
    max: () => createChainableMock(),
    default: () => createChainableMock(),
  });

  return {
    z: {
      object: () => ({}),
      string: () => createChainableMock(),
      number: () => createChainableMock(),
    },
  };
});

// Mock do date-fns
jest.mock('date-fns', () => ({
  format: () => '01/01/2024',
}));

// Mock do date-fns/locale
jest.mock('date-fns/locale', () => ({
  ptBR: {},
}));

// Mock do toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock de todos os componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <form data-testid="form">{children}</form>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormField: ({ render }: any) => render({ field: {} }),
  FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: any) => <label data-testid="form-label">{children}</label>,
  FormMessage: () => <div data-testid="form-message"></div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-testid="textarea" {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children }: any) => <div data-testid="select-item">{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <div data-testid="select-value"></div>,
}));

jest.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data, isLoading }: any) => (
    <div data-testid="data-table">
      {isLoading ? 'Carregando...' : `${data.length} items`}
    </div>
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { XpTypeManager } from '../XpTypeManager';

// Mock do fetch
global.fetch = jest.fn();

describe('XpTypeManager', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('deve renderizar o componente corretamente', async () => {
    // Mock da resposta da API com dados
    const mockXpTypes = [
      {
        id: '1',
        name: 'Excelência',
        description: 'Excelência no atendimento',
        points: 50,
        active: true,
        category: 'performance',
        icon: 'star',
        color: '#3B82F6',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user1',
        _count: { xpGrants: 5 }
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockXpTypes,
    });

    render(<XpTypeManager userId="test-user-id" />);

    // Verificar se o título está presente
    expect(screen.getByText('Tipos de XP Configurados')).toBeInTheDocument();
    
    // Verificar se o botão de criar está presente
    expect(screen.getByText('Novo Tipo')).toBeInTheDocument();

    // Aguardar o carregamento dos dados
    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });

  it('deve fazer chamada para API ao carregar', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<XpTypeManager userId="test-user-id" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/gamification/xp-types');
    });
  });

  it('deve exibir mensagem quando não há tipos configurados', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<XpTypeManager userId="test-user-id" />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum tipo de XP configurado')).toBeInTheDocument();
      expect(screen.getByText('Criar Primeiro Tipo')).toBeInTheDocument();
    });
  });
});