import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  DataValidator, 
  LoadingTable, 
  LoadingCard, 
  ErrorTable, 
  EmptyTable 
} from '@/components/ui/data-validator';

// Mock dos componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div data-testid="alert" {...props}>{children}</div>,
  AlertTitle: ({ children }: any) => <div data-testid="alert-title">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock dos ícones
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />
}));

describe('DataValidator', () => {
  const mockChildren = jest.fn((data) => <div data-testid="content">{JSON.stringify(data)}</div>);
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Silenciar console.warn e console.error para testes
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading state when loading is true', () => {
      render(
        <DataValidator
          data={null}
          fallback={[]}
          loading={true}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
      expect(mockChildren).not.toHaveBeenCalled();
    });

    it('should render custom loading component when provided', () => {
      const customLoading = <div data-testid="custom-loading">Custom Loading</div>;
      
      render(
        <DataValidator
          data={null}
          fallback={[]}
          loading={true}
          loadingComponent={customLoading}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error state when error is provided', () => {
      const errorMessage = 'Failed to fetch data';
      
      render(
        <DataValidator
          data={null}
          fallback={[]}
          error={errorMessage}
          onRetry={mockOnRetry}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
      expect(mockChildren).not.toHaveBeenCalled();
    });

    it('should call onRetry when retry button is clicked', () => {
      render(
        <DataValidator
          data={null}
          fallback={[]}
          error="Some error"
          onRetry={mockOnRetry}
        >
          {mockChildren}
        </DataValidator>
      );

      fireEvent.click(screen.getByText('Tentar novamente'));
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should render custom error component when provided', () => {
      const customError = <div data-testid="custom-error">Custom Error</div>;
      
      render(
        <DataValidator
          data={null}
          fallback={[]}
          error="Some error"
          errorComponent={customError}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state for empty array', () => {
      render(
        <DataValidator
          data={[]}
          fallback={[]}
          treatEmptyArrayAsEmpty={true}
          onRetry={mockOnRetry}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByText('Dados não encontrados')).toBeInTheDocument();
      expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
      expect(screen.getByText('Recarregar')).toBeInTheDocument();
      expect(mockChildren).not.toHaveBeenCalled();
    });

    it('should render custom empty message', () => {
      const customMessage = 'Nenhum atendente encontrado';
      
      render(
        <DataValidator
          data={[]}
          fallback={[]}
          emptyMessage={customMessage}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should render custom empty component when provided', () => {
      const customEmpty = <div data-testid="custom-empty">Custom Empty</div>;
      
      render(
        <DataValidator
          data={[]}
          fallback={[]}
          emptyComponent={customEmpty}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('Custom Empty')).toBeInTheDocument();
    });

    it('should not treat empty array as empty when treatEmptyArrayAsEmpty is false', () => {
      render(
        <DataValidator
          data={[]}
          fallback={[]}
          treatEmptyArrayAsEmpty={false}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(mockChildren).toHaveBeenCalledWith([]);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Valid State', () => {
    it('should render content with valid data', () => {
      const testData = [{ id: 1, name: 'Test' }];
      
      render(
        <DataValidator
          data={testData}
          fallback={[]}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(mockChildren).toHaveBeenCalledWith(testData);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should use fallback when data is null', () => {
      const fallback = [{ id: 0, name: 'Fallback' }];
      
      render(
        <DataValidator
          data={null}
          fallback={fallback}
          enableWarnings={false}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(mockChildren).toHaveBeenCalledWith(fallback);
    });

    it('should use fallback when data is undefined', () => {
      const fallback = [{ id: 0, name: 'Fallback' }];
      
      render(
        <DataValidator
          data={undefined}
          fallback={fallback}
          enableWarnings={false}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(mockChildren).toHaveBeenCalledWith(fallback);
    });
  });

  describe('Custom Validation', () => {
    it('should use custom validator', () => {
      const validator = jest.fn().mockReturnValue(true);
      const testData = [{ id: 1, name: 'Test' }];
      
      render(
        <DataValidator
          data={testData}
          fallback={[]}
          validator={validator}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(validator).toHaveBeenCalledWith(testData);
      expect(mockChildren).toHaveBeenCalledWith(testData);
    });

    it('should use fallback when custom validator fails', () => {
      const validator = jest.fn().mockReturnValue(false);
      const testData = [{ id: 1, name: 'Test' }];
      const fallback = [];
      
      render(
        <DataValidator
          data={testData}
          fallback={fallback}
          validator={validator}
          enableWarnings={false}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(validator).toHaveBeenCalledWith(testData);
      expect(mockChildren).toHaveBeenCalledWith(fallback);
    });

    it('should handle validator throwing error', () => {
      const validator = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });
      const testData = [{ id: 1, name: 'Test' }];
      const fallback = [];
      
      render(
        <DataValidator
          data={testData}
          fallback={fallback}
          validator={validator}
          enableWarnings={false}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(mockChildren).toHaveBeenCalledWith(fallback);
    });
  });

  describe('Warnings', () => {
    it('should log warning when data is null and enableWarnings is true', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      render(
        <DataValidator
          data={null}
          fallback={[]}
          enableWarnings={true}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'DataValidator: Dados são null ou undefined, usando fallback'
      );
    });

    it('should not log warning when enableWarnings is false', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      render(
        <DataValidator
          data={null}
          fallback={[]}
          enableWarnings={false}
        >
          {mockChildren}
        </DataValidator>
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('CSS Classes', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <DataValidator
          data={[1, 2, 3]}
          fallback={[]}
          className="custom-class"
        >
          {mockChildren}
        </DataValidator>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('LoadingTable', () => {
  it('should render loading table with default rows and columns', () => {
    render(<LoadingTable />);
    
    expect(screen.getByText('Carregando tabela...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    // 5 rows * 4 columns = 20 skeletons por linha, mais 4 no header
    expect(screen.getAllByTestId('skeleton')).toHaveLength(24);
  });

  it('should render loading table with custom rows and columns', () => {
    render(<LoadingTable rows={3} columns={2} />);
    
    // 3 rows * 2 columns = 6 skeletons por linha, mais 2 no header
    expect(screen.getAllByTestId('skeleton')).toHaveLength(8);
  });
});

describe('LoadingCard', () => {
  it('should render loading card', () => {
    render(<LoadingCard />);
    
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
  });
});

describe('ErrorTable', () => {
  it('should render error table', () => {
    const errorMessage = 'Database connection failed';
    const onRetry = jest.fn();
    
    render(<ErrorTable error={errorMessage} onRetry={onRetry} />);
    
    expect(screen.getByText('Erro ao carregar tabela')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });

  it('should call onRetry when button is clicked', () => {
    const onRetry = jest.fn();
    
    render(<ErrorTable error="Some error" onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyTable', () => {
  it('should render empty table with default message', () => {
    render(<EmptyTable />);
    
    expect(screen.getByText('Dados não encontrados')).toBeInTheDocument();
    expect(screen.getByText('Nenhum dado encontrado')).toBeInTheDocument();
  });

  it('should render empty table with custom message', () => {
    const customMessage = 'Nenhum atendente cadastrado';
    
    render(<EmptyTable message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should call onRetry when button is clicked', () => {
    const onRetry = jest.fn();
    
    render(<EmptyTable onRetry={onRetry} />);
    
    fireEvent.click(screen.getByText('Recarregar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});