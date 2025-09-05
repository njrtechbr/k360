/**
 * @jest-environment jsdom
 */

// Mock das dependências antes dos imports
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr.includes('dd/MM/yyyy')) return '01/01/2024';
    if (formatStr.includes('HH:mm')) return '10:30';
    return '01/01/2024 10:30';
  }),
  ptBR: {}
}));

// Mock completo dos componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select">
      <select onChange={(e) => onValueChange?.(e.target.value)} value={value}>
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

jest.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data, isLoading }: any) => (
    <div data-testid="data-table">
      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div>
          {data.map((item: any, index: number) => (
            <div key={index} data-testid="table-row">
              {item.attendant?.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>
}));

// Mock dos ícones do Lucide React
jest.mock('lucide-react', () => ({
  History: () => <div data-testid="history-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Award: () => <div data-testid="award-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Search: () => <div data-testid="search-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { XpGrantHistory } from '../XpGrantHistory';
import { toast } from '@/hooks/use-toast';

// Mock do fetch global
global.fetch = jest.fn();

const mockGrants = [
  {
    id: '1',
    attendantId: 'att1',
    typeId: 'type1',
    points: 50,
    justification: 'Excelente atendimento',
    grantedBy: 'admin1',
    grantedAt: '2024-01-01T10:30:00Z',
    xpEventId: 'event1',
    attendant: {
      id: 'att1',
      name: 'João Silva',
      email: 'joao@example.com'
    },
    type: {
      id: 'type1',
      name: 'Excelência no Atendimento',
      description: 'Reconhecimento por atendimento excepcional',
      points: 50,
      category: 'performance',
      icon: 'star',
      color: '#3B82F6'
    },
    granter: {
      id: 'admin1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    }
  }
];

const mockStatistics = {
  period: {
    value: '30d',
    days: 30,
    label: 'Últimos 30 dias'
  },
  overview: {
    totalGrants: 10,
    totalPoints: 500,
    averagePoints: 50,
    dailyAverageGrants: 0.33,
    dailyAveragePoints: 17
  },
  grantsByType: [
    {
      typeId: 'type1',
      typeName: 'Excelência no Atendimento',
      count: 5,
      totalPoints: 250,
      averagePoints: 50,
      percentage: 50
    }
  ],
  grantsByGranter: [
    {
      granterId: 'admin1',
      granterName: 'Admin User',
      count: 5,
      totalPoints: 250,
      averagePoints: 50,
      percentage: 50
    }
  ],
  trends: {
    mostUsedType: 'Excelência no Atendimento',
    mostActiveGranter: 'Admin User',
    averageGrantsPerGranter: 5
  }
};

describe('XpGrantHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('deve renderizar o componente corretamente', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            grants: mockGrants,
            pagination: {
              total: 1,
              page: 1,
              totalPages: 1,
              limit: 20
            }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockStatistics
        })
      });

    render(<XpGrantHistory />);

    expect(screen.getByText('Histórico de XP Avulso')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
  });

  it('deve fazer chamada para API com filtros corretos', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            grants: [],
            pagination: {
              total: 0,
              page: 1,
              totalPages: 0,
              limit: 20
            }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockStatistics
        })
      });

    render(<XpGrantHistory />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/gamification/xp-grants')
      );
    });
  });

  it('deve exibir mensagem de erro quando falha ao carregar dados', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<XpGrantHistory />);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Erro ao carregar histórico de concessões',
        variant: 'destructive'
      });
    });
  });
});