# Guia de Testes para APIs

## Visão Geral

Este guia documenta as estratégias e padrões de teste para a arquitetura baseada em APIs. Cobrimos testes unitários, de integração e end-to-end para garantir a qualidade e confiabilidade do sistema.

## Estrutura de Testes

### Organização de Arquivos

```
src/
├── __tests__/
│   ├── setup.ts                    # Configuração global de testes
│   ├── mocks/                      # Mocks globais
│   │   ├── httpClient.mock.ts
│   │   ├── nextAuth.mock.ts
│   │   └── prisma.mock.ts
│   └── utils/                      # Utilitários de teste
│       ├── testUtils.tsx
│       ├── mockData.ts
│       └── apiMocks.ts
├── lib/
│   └── __tests__/
│       └── httpClient.test.ts      # Testes do HTTP client
├── hooks/
│   └── api/
│       └── __tests__/
│           ├── useApiQuery.test.ts
│           ├── useApiMutation.test.ts
│           └── useGamificationData.test.ts
├── services/
│   └── __tests__/
│       ├── userApiClient.test.ts
│       ├── attendantApiClient.test.ts
│       └── evaluationApiClient.test.ts
├── app/
│   └── api/
│       └── __tests__/
│           ├── integration.test.ts  # Testes de integração de APIs
│           └── users/
│               └── route.test.ts
└── components/
    └── __tests__/
        ├── UserForm.test.tsx
        └── integration/
            └── user-management.test.tsx
```

## Configuração de Testes

### Jest Setup

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Configurar MSW (Mock Service Worker)
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock do Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path',
}));

// Mock do NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      }
    },
    status: 'authenticated'
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Configurações globais
global.fetch = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    reload: jest.fn(),
  },
  writable: true,
});
```

### MSW (Mock Service Worker)

```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { mockUsers, mockAttendants, mockEvaluations } from './mockData';

export const handlers = [
  // Users API
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockUsers
      })
    );
  }),

  rest.post('/api/users', async (req, res, ctx) => {
    const userData = await req.json();
    const newUser = {
      id: 'new-user-id',
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: newUser,
        message: 'Usuário criado com sucesso'
      })
    );
  }),

  rest.put('/api/users/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const userData = await req.json();
    const updatedUser = {
      ...mockUsers.find(u => u.id === id),
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: updatedUser,
        message: 'Usuário atualizado com sucesso'
      })
    );
  }),

  rest.delete('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Usuário deletado com sucesso'
      })
    );
  }),

  // Attendants API
  rest.get('/api/attendants', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockAttendants
      })
    );
  }),

  // Evaluations API
  rest.get('/api/evaluations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockEvaluations
      })
    );
  }),

  // Error scenarios
  rest.get('/api/users/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Erro interno do servidor'
      })
    );
  }),

  rest.post('/api/users/validation-error', (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({
        success: false,
        error: 'Dados inválidos',
        details: {
          name: ['Nome é obrigatório'],
          email: ['Email deve ser válido']
        }
      })
    );
  }),
];

export const server = setupServer(...handlers);
```

### Mock Data

```typescript
// src/__tests__/mocks/mockData.ts
import { User, Attendant, Evaluation } from '@/lib/types';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'ADMIN',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    attendants: []
  },
  {
    id: 'user-2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    role: 'SUPERVISOR',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    attendants: []
  }
];

export const mockAttendants: Attendant[] = [
  {
    id: 'attendant-1',
    name: 'Carlos Oliveira',
    email: 'carlos@example.com',
    userId: 'user-1',
    funcaoId: 'funcao-1',
    setorId: 'setor-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    user: mockUsers[0],
    evaluations: []
  }
];

export const mockEvaluations: Evaluation[] = [
  {
    id: 'evaluation-1',
    attendantId: 'attendant-1',
    rating: 5,
    comment: 'Excelente atendimento',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    attendant: mockAttendants[0]
  }
];

// Factory functions para criar dados de teste
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: `user-${Date.now()}`,
  name: 'Test User',
  email: 'test@example.com',
  role: 'USUARIO',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  attendants: [],
  ...overrides
});

export const createMockAttendant = (overrides: Partial<Attendant> = {}): Attendant => ({
  id: `attendant-${Date.now()}`,
  name: 'Test Attendant',
  email: 'attendant@example.com',
  userId: 'user-1',
  funcaoId: 'funcao-1',
  setorId: 'setor-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: mockUsers[0],
  evaluations: [],
  ...overrides
});
```

## Testes Unitários

### HTTP Client Tests

```typescript
// src/lib/__tests__/httpClient.test.ts
import { HttpClient } from '../httpClient';
import { server } from '../../__tests__/mocks/server';
import { rest } from 'msw';

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient({
      baseURL: 'http://localhost:3000',
      timeout: 5000,
      retries: 3
    });
  });

  describe('GET requests', () => {
    it('should return success response for valid request', async () => {
      const response = await httpClient.get('/api/users');
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String)
        })
      ]));
    });

    it('should handle 404 errors gracefully', async () => {
      server.use(
        rest.get('/api/users/not-found', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({
            success: false,
            error: 'Usuário não encontrado'
          }));
        })
      );

      const response = await httpClient.get('/api/users/not-found');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Usuário não encontrado');
    });

    it('should retry on server errors', async () => {
      let attempts = 0;
      server.use(
        rest.get('/api/users/retry-test', (req, res, ctx) => {
          attempts++;
          if (attempts < 3) {
            return res(ctx.status(500));
          }
          return res(ctx.status(200), ctx.json({
            success: true,
            data: []
          }));
        })
      );

      const response = await httpClient.get('/api/users/retry-test');
      
      expect(response.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should timeout after configured time', async () => {
      const shortTimeoutClient = new HttpClient({ timeout: 100 });
      
      server.use(
        rest.get('/api/users/timeout-test', (req, res, ctx) => {
          return res(ctx.delay(200), ctx.json({ success: true, data: [] }));
        })
      );

      const response = await shortTimeoutClient.get('/api/users/timeout-test');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('timeout');
    });
  });

  describe('POST requests', () => {
    it('should send data correctly and return response', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        role: 'USUARIO'
      };

      const response = await httpClient.post('/api/users', userData);
      
      expect(response.success).toBe(true);
      expect(response.data).toMatchObject(userData);
      expect(response.message).toBe('Usuário criado com sucesso');
    });

    it('should handle validation errors', async () => {
      const response = await httpClient.post('/api/users/validation-error', {});
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Dados inválidos');
      expect(response.details).toEqual({
        name: ['Nome é obrigatório'],
        email: ['Email deve ser válido']
      });
    });
  });
});
```

### API Hooks Tests

```typescript
// src/hooks/api/__tests__/useApiQuery.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useApiQuery } from '../useApiQuery';
import { mockUsers } from '../../__tests__/mocks/mockData';

describe('useApiQuery', () => {
  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => 
      useApiQuery(['users'], '/api/users')
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => 
      useApiQuery(['users'], '/api/users/error')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe('Erro interno do servidor');
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() => 
      useApiQuery(['users'], '/api/users', { enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    const { result } = renderHook(() => 
      useApiQuery(['users'], '/api/users')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUsers);

    // Trigger refetch
    result.current.refetch();

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUsers);
  });
});
```

### Service Tests

```typescript
// src/services/__tests__/userApiClient.test.ts
import { UserApiClient } from '../userApiClient';
import { createMockUser } from '../../__tests__/mocks/mockData';

// Mock do httpClient
jest.mock('../../lib/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}));

import { httpClient } from '../../lib/httpClient';

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('UserApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return users when API call succeeds', async () => {
      const mockUsers = [createMockUser(), createMockUser()];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers
      });

      const result = await UserApiClient.findAll();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/users');
      expect(result).toEqual(mockUsers);
    });

    it('should throw error when API call fails', async () => {
      mockHttpClient.get.mockResolvedValue({
        success: false,
        error: 'Erro ao buscar usuários'
      });

      await expect(UserApiClient.findAll()).rejects.toThrow('Erro ao buscar usuários');
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        role: 'USUARIO' as const
      };
      const createdUser = createMockUser(userData);

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: createdUser
      });

      const result = await UserApiClient.create(userData);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/users', userData);
      expect(result).toEqual(createdUser);
    });

    it('should throw error when creation fails', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        role: 'USUARIO' as const
      };

      mockHttpClient.post.mockResolvedValue({
        success: false,
        error: 'Email já está em uso'
      });

      await expect(UserApiClient.create(userData)).rejects.toThrow('Email já está em uso');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userId = 'user-1';
      const updateData = { name: 'Updated Name' };
      const updatedUser = createMockUser({ id: userId, ...updateData });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: updatedUser
      });

      const result = await UserApiClient.update(userId, updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(`/api/users/${userId}`, updateData);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-1';

      mockHttpClient.delete.mockResolvedValue({
        success: true
      });

      await expect(UserApiClient.delete(userId)).resolves.not.toThrow();

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`/api/users/${userId}`);
    });

    it('should throw error when deletion fails', async () => {
      const userId = 'user-1';

      mockHttpClient.delete.mockResolvedValue({
        success: false,
        error: 'Usuário não pode ser deletado'
      });

      await expect(UserApiClient.delete(userId)).rejects.toThrow('Usuário não pode ser deletado');
    });
  });
});
```

## Testes de Integração

### API Route Tests

```typescript
// src/app/api/__tests__/integration.test.ts
import { GET, POST, PUT, DELETE } from '../users/route';
import { NextRequest } from 'next/server';
import { prismaMock } from '../../__tests__/mocks/prisma.mock';

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}));

describe('/api/users integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return users list', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com', role: 'ADMIN' },
        { id: '2', name: 'User 2', email: 'user2@test.com', role: 'USUARIO' }
      ];

      prismaMock.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUsers);
    });

    it('should handle database errors', async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Erro interno do servidor');
    });
  });

  describe('POST /api/users', () => {
    it('should create user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'new@test.com',
        role: 'USUARIO'
      };

      const createdUser = { id: 'new-id', ...userData };
      prismaMock.user.create.mockResolvedValue(createdUser);

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(createdUser);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: userData
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Nome vazio
        email: 'invalid-email', // Email inválido
        role: 'INVALID_ROLE' // Role inválida
      };

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Dados inválidos');
      expect(data.details).toBeDefined();
    });
  });
});
```

### Component Integration Tests

```typescript
// src/components/__tests__/integration/user-management.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagement } from '../../UserManagement';
import { ApiProvider } from '../../../providers/ApiProvider';
import { mockUsers } from '../../../__tests__/mocks/mockData';

// Wrapper com providers necessários
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiProvider>
    {children}
  </ApiProvider>
);

describe('UserManagement Integration', () => {
  it('should display users list on load', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    // Verificar loading state
    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    // Aguardar dados carregarem
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Verificar se usuários são exibidos
    mockUsers.forEach(user => {
      expect(screen.getByText(user.name)).toBeInTheDocument();
      expect(screen.getByText(user.email)).toBeInTheDocument();
    });
  });

  it('should create new user successfully', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    // Aguardar carregamento inicial
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Clicar no botão de criar usuário
    fireEvent.click(screen.getByText('Novo Usuário'));

    // Preencher formulário
    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'Novo Usuário' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'novo@test.com' }
    });
    fireEvent.change(screen.getByLabelText('Função'), {
      target: { value: 'USUARIO' }
    });

    // Submeter formulário
    fireEvent.click(screen.getByText('Salvar'));

    // Verificar loading state do formulário
    expect(screen.getByText('Salvando...')).toBeInTheDocument();

    // Aguardar sucesso
    await waitFor(() => {
      expect(screen.getByText('Usuário criado com sucesso!')).toBeInTheDocument();
    });

    // Verificar se o novo usuário aparece na lista
    expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.getByText('novo@test.com')).toBeInTheDocument();
  });

  it('should handle validation errors', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Tentar criar usuário sem dados
    fireEvent.click(screen.getByText('Novo Usuário'));
    fireEvent.click(screen.getByText('Salvar'));

    // Verificar mensagens de erro
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
      expect(screen.getByText('Email deve ser válido')).toBeInTheDocument();
    });
  });

  it('should update user successfully', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Clicar no botão de editar do primeiro usuário
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);

    // Modificar nome
    const nameInput = screen.getByDisplayValue(mockUsers[0].name);
    fireEvent.change(nameInput, {
      target: { value: 'Nome Atualizado' }
    });

    // Salvar alterações
    fireEvent.click(screen.getByText('Salvar'));

    // Verificar sucesso
    await waitFor(() => {
      expect(screen.getByText('Usuário atualizado com sucesso!')).toBeInTheDocument();
    });

    // Verificar se o nome foi atualizado na lista
    expect(screen.getByText('Nome Atualizado')).toBeInTheDocument();
  });

  it('should delete user successfully', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    const userToDelete = mockUsers[0];

    // Clicar no botão de deletar
    const deleteButtons = screen.getAllByText('Deletar');
    fireEvent.click(deleteButtons[0]);

    // Confirmar deleção
    fireEvent.click(screen.getByText('Confirmar'));

    // Verificar sucesso
    await waitFor(() => {
      expect(screen.getByText('Usuário deletado com sucesso!')).toBeInTheDocument();
    });

    // Verificar se o usuário foi removido da lista
    expect(screen.queryByText(userToDelete.name)).not.toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    // Simular erro de rede
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    // Verificar mensagem de erro
    await waitFor(() => {
      expect(screen.getByText(/Problema de conexão/)).toBeInTheDocument();
    });

    // Verificar botão de retry
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });
});
```

## Testes End-to-End

### Cypress Tests

```typescript
// cypress/e2e/user-management.cy.ts
describe('User Management E2E', () => {
  beforeEach(() => {
    // Login como admin
    cy.login('admin@test.com', 'password');
    cy.visit('/dashboard/usuarios');
  });

  it('should display users list', () => {
    cy.get('[data-testid="users-list"]').should('be.visible');
    cy.get('[data-testid="user-item"]').should('have.length.at.least', 1);
  });

  it('should create new user', () => {
    // Abrir formulário de criação
    cy.get('[data-testid="create-user-button"]').click();
    
    // Preencher formulário
    cy.get('[data-testid="user-name-input"]').type('E2E Test User');
    cy.get('[data-testid="user-email-input"]').type('e2e@test.com');
    cy.get('[data-testid="user-role-select"]').select('USUARIO');
    
    // Submeter
    cy.get('[data-testid="submit-button"]').click();
    
    // Verificar sucesso
    cy.get('[data-testid="success-message"]').should('contain', 'Usuário criado com sucesso');
    cy.get('[data-testid="users-list"]').should('contain', 'E2E Test User');
  });

  it('should handle validation errors', () => {
    cy.get('[data-testid="create-user-button"]').click();
    
    // Tentar submeter sem dados
    cy.get('[data-testid="submit-button"]').click();
    
    // Verificar erros de validação
    cy.get('[data-testid="name-error"]').should('contain', 'Nome é obrigatório');
    cy.get('[data-testid="email-error"]').should('contain', 'Email deve ser válido');
  });

  it('should update user', () => {
    // Clicar no primeiro usuário para editar
    cy.get('[data-testid="user-item"]').first().find('[data-testid="edit-button"]').click();
    
    // Modificar nome
    cy.get('[data-testid="user-name-input"]').clear().type('Updated Name');
    
    // Salvar
    cy.get('[data-testid="submit-button"]').click();
    
    // Verificar atualização
    cy.get('[data-testid="success-message"]').should('contain', 'Usuário atualizado');
    cy.get('[data-testid="users-list"]').should('contain', 'Updated Name');
  });

  it('should delete user', () => {
    // Obter nome do usuário a ser deletado
    cy.get('[data-testid="user-item"]').first().find('[data-testid="user-name"]').then(($name) => {
      const userName = $name.text();
      
      // Deletar usuário
      cy.get('[data-testid="user-item"]').first().find('[data-testid="delete-button"]').click();
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Verificar remoção
      cy.get('[data-testid="success-message"]').should('contain', 'Usuário deletado');
      cy.get('[data-testid="users-list"]').should('not.contain', userName);
    });
  });

  it('should handle network errors', () => {
    // Interceptar e simular erro
    cy.intercept('GET', '/api/users', { forceNetworkError: true }).as('getUsersError');
    
    cy.reload();
    
    // Verificar mensagem de erro
    cy.get('[data-testid="error-message"]').should('contain', 'Problema de conexão');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });
});
```

## Performance Tests

```typescript
// src/__tests__/performance/api-performance.test.ts
import { performance } from 'perf_hooks';
import { UserApiClient } from '../../services/userApiClient';

describe('API Performance Tests', () => {
  it('should fetch users within acceptable time', async () => {
    const start = performance.now();
    
    await UserApiClient.findAll();
    
    const end = performance.now();
    const duration = end - start;
    
    // API deve responder em menos de 1 segundo
    expect(duration).toBeLessThan(1000);
  });

  it('should handle concurrent requests efficiently', async () => {
    const start = performance.now();
    
    // Fazer 10 requests simultâneos
    const promises = Array.from({ length: 10 }, () => UserApiClient.findAll());
    await Promise.all(promises);
    
    const end = performance.now();
    const duration = end - start;
    
    // Requests concorrentes não devem demorar muito mais que um único request
    expect(duration).toBeLessThan(2000);
  });

  it('should cache repeated requests', async () => {
    // Primeira request
    const start1 = performance.now();
    await UserApiClient.findAll();
    const end1 = performance.now();
    const firstDuration = end1 - start1;
    
    // Segunda request (deveria usar cache)
    const start2 = performance.now();
    await UserApiClient.findAll();
    const end2 = performance.now();
    const secondDuration = end2 - start2;
    
    // Segunda request deve ser significativamente mais rápida
    expect(secondDuration).toBeLessThan(firstDuration * 0.5);
  });
});
```

## Utilitários de Teste

### Test Utils

```typescript
// src/__tests__/utils/testUtils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ApiProvider } from '../../providers/ApiProvider';
import { SessionProvider } from 'next-auth/react';

// Mock session
const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN'
  },
  expires: '2024-12-31'
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any;
}

// Wrapper customizado com todos os providers necessários
const AllTheProviders = ({ children, session = mockSession }: { children: React.ReactNode; session?: any }) => {
  return (
    <SessionProvider session={session}>
      <ApiProvider>
        {children}
      </ApiProvider>
    </SessionProvider>
  );
};

// Função de render customizada
const customRender = (
  ui: ReactElement,
  { session, ...options }: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} session={session} />,
    ...options,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Utilitários adicionais
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
  });
};

export const expectErrorMessage = (message: string) => {
  expect(screen.getByRole('alert')).toHaveTextContent(message);
};

export const expectSuccessMessage = (message: string) => {
  expect(screen.getByText(message)).toBeInTheDocument();
};
```

## Scripts de Teste

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:integration": "jest --testPathPattern=integration",
    "test:unit": "jest --testPathPattern=__tests__ --testPathIgnorePatterns=integration"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/app/api/**', // Excluir rotas de API dos testes de coverage
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
};
```

## Boas Práticas

### 1. Organize Tests por Funcionalidade

```
__tests__/
├── unit/           # Testes unitários isolados
├── integration/    # Testes de integração
├── e2e/           # Testes end-to-end
└── performance/   # Testes de performance
```

### 2. Use Mocks Apropriados

```typescript
// ✅ Mock específico para o que está sendo testado
jest.mock('../httpClient', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  }
}));

// ❌ Mock muito amplo
jest.mock('../lib', () => ({}));
```

### 3. Teste Cenários de Erro

```typescript
// ✅ Teste tanto sucesso quanto falha
it('should handle API errors', async () => {
  mockHttpClient.get.mockRejectedValue(new Error('Network error'));
  
  const { result } = renderHook(() => useUsers());
  
  await waitFor(() => {
    expect(result.current.error).toBe('Network error');
  });
});
```

### 4. Use Data-testid para E2E

```typescript
// ✅ Usar data-testid para elementos importantes
<button data-testid="submit-button">Salvar</button>

// ❌ Depender de texto que pode mudar
<button>Salvar</button>
```

### 5. Mantenha Tests Independentes

```typescript
// ✅ Cada teste é independente
beforeEach(() => {
  jest.clearAllMocks();
  // Reset state
});

// ❌ Tests que dependem uns dos outros
```