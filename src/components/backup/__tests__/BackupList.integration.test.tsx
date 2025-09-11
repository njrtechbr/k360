import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BackupList } from "../BackupList";
import type { BackupMetadata } from "@/hooks/useBackupManager";

// Mock dos componentes UI necessários
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    variant,
    className,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({ children }: { children: React.ReactNode }) => (
    <td>{children}</td>
  ),
  TableHead: ({ children, onClick, className }: any) => (
    <th onClick={onClick} className={className}>
      {children}
    </th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select
      data-testid="status-filter"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => (
    <span>{placeholder}</span>
  ),
}));

jest.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="confirm-delete">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="cancel-delete">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("lucide-react", () => ({
  Download: () => <span data-testid="download-icon">Download</span>,
  Trash2: () => <span data-testid="trash-icon">Delete</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Filter: () => <span data-testid="filter-icon">Filter</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
  CheckCircle: () => <span data-testid="success-icon">Success</span>,
  XCircle: () => <span data-testid="error-icon">Error</span>,
  Clock: () => <span data-testid="progress-icon">Progress</span>,
  FileText: () => <span data-testid="file-icon">File</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  HardDrive: () => <span data-testid="drive-icon">Drive</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
}));

const createMockBackup = (
  overrides: Partial<BackupMetadata> = {},
): BackupMetadata => ({
  id: "1",
  filename: "backup_2025-01-09_14-30-00.sql",
  filepath: "/backups/backup_2025-01-09_14-30-00.sql",
  size: 1024000,
  checksum: "abc123def456",
  createdAt: new Date("2025-01-09T14:30:00Z"),
  createdBy: "admin@test.com",
  status: "success",
  duration: 120,
  databaseVersion: "15.0",
  schemaVersion: "1.0.0",
  ...overrides,
});

describe("BackupList Integration Tests", () => {
  const mockProps = {
    backups: [],
    isLoading: false,
    canDelete: true,
    onDownload: jest.fn(),
    onDelete: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Fluxo completo de gerenciamento de backups", () => {
    it("deve permitir buscar, filtrar e interagir com backups", async () => {
      const backups = [
        createMockBackup({
          id: "1",
          filename: "backup_success.sql",
          status: "success",
          createdBy: "admin@test.com",
        }),
        createMockBackup({
          id: "2",
          filename: "backup_failed.sql",
          status: "failed",
          createdBy: "user@test.com",
        }),
        createMockBackup({
          id: "3",
          filename: "backup_progress.sql",
          status: "in_progress",
          createdBy: "admin@test.com",
        }),
      ];

      render(<BackupList {...mockProps} backups={backups} />);

      // Verificar se todos os backups são exibidos inicialmente
      expect(screen.getByText("backup_success.sql")).toBeInTheDocument();
      expect(screen.getByText("backup_failed.sql")).toBeInTheDocument();
      expect(screen.getByText("backup_progress.sql")).toBeInTheDocument();

      // Testar busca por nome
      const searchInput = screen.getByPlaceholderText(
        /Buscar por nome do arquivo/,
      );
      fireEvent.change(searchInput, { target: { value: "success" } });

      await waitFor(() => {
        expect(screen.getByText("backup_success.sql")).toBeInTheDocument();
        expect(screen.queryByText("backup_failed.sql")).not.toBeInTheDocument();
        expect(
          screen.queryByText("backup_progress.sql"),
        ).not.toBeInTheDocument();
      });

      // Limpar busca
      fireEvent.change(searchInput, { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByText("backup_success.sql")).toBeInTheDocument();
        expect(screen.getByText("backup_failed.sql")).toBeInTheDocument();
        expect(screen.getByText("backup_progress.sql")).toBeInTheDocument();
      });

      // Testar filtro por status
      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "success" } });

      await waitFor(() => {
        expect(screen.getByText("backup_success.sql")).toBeInTheDocument();
        expect(screen.queryByText("backup_failed.sql")).not.toBeInTheDocument();
        expect(
          screen.queryByText("backup_progress.sql"),
        ).not.toBeInTheDocument();
      });
    });

    it("deve permitir download de backup bem-sucedido", () => {
      const backups = [
        createMockBackup({ id: "1", status: "success" }),
        createMockBackup({ id: "2", status: "failed" }),
      ];

      render(<BackupList {...mockProps} backups={backups} />);

      // Encontrar botões de download
      const downloadButtons = screen.getAllByTestId("download-icon");

      // Verificar se há pelo menos um botão habilitado (backup success)
      const buttons = downloadButtons.map((icon) => icon.closest("button")!);
      const enabledButton = buttons.find(
        (btn) => !btn.hasAttribute("disabled"),
      );
      const disabledButton = buttons.find((btn) =>
        btn.hasAttribute("disabled"),
      );

      expect(enabledButton).toBeTruthy();
      expect(disabledButton).toBeTruthy();

      // Clicar no botão habilitado
      if (enabledButton) {
        fireEvent.click(enabledButton);
        expect(mockProps.onDownload).toHaveBeenCalledWith("1");
      }
    });

    it("deve permitir exclusão de backup com confirmação", () => {
      const backups = [createMockBackup({ id: "1" })];

      render(<BackupList {...mockProps} backups={backups} />);

      // Clicar no botão de exclusão
      const deleteButton = screen.getByTestId("trash-icon").closest("button")!;
      fireEvent.click(deleteButton);

      // Verificar se o dialog de confirmação aparece
      expect(screen.getByText("Confirmar Exclusão")).toBeInTheDocument();
      expect(
        screen.getByText(/Tem certeza que deseja excluir/),
      ).toBeInTheDocument();

      // Confirmar exclusão
      const confirmButton = screen.getByTestId("confirm-delete");
      fireEvent.click(confirmButton);

      expect(mockProps.onDelete).toHaveBeenCalledWith("1");
    });

    it("deve permitir cancelar exclusão", () => {
      const backups = [createMockBackup({ id: "1" })];

      render(<BackupList {...mockProps} backups={backups} />);

      // Clicar no botão de exclusão
      const deleteButton = screen.getByTestId("trash-icon").closest("button")!;
      fireEvent.click(deleteButton);

      // Cancelar exclusão
      const cancelButton = screen.getByTestId("cancel-delete");
      fireEvent.click(cancelButton);

      expect(mockProps.onDelete).not.toHaveBeenCalled();
    });

    it("deve permitir atualizar lista de backups", () => {
      render(<BackupList {...mockProps} />);

      const refreshButton = screen
        .getByTestId("refresh-icon")
        .closest("button")!;
      fireEvent.click(refreshButton);

      expect(mockProps.onRefresh).toHaveBeenCalled();
    });
  });

  describe("Ordenação de backups", () => {
    it("deve ordenar backups por diferentes campos", async () => {
      const backups = [
        createMockBackup({
          id: "1",
          filename: "backup_a.sql",
          createdAt: new Date("2025-01-09T10:00:00Z"),
          size: 1000,
        }),
        createMockBackup({
          id: "2",
          filename: "backup_b.sql",
          createdAt: new Date("2025-01-09T12:00:00Z"),
          size: 2000,
        }),
      ];

      render(<BackupList {...mockProps} backups={backups} />);

      // Por padrão, deve estar ordenado por data (desc)
      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("backup_b.sql"); // Mais recente primeiro
      expect(rows[2]).toHaveTextContent("backup_a.sql");

      // Clicar para ordenar por nome
      const filenameHeader = screen.getByText(/Arquivo/);
      fireEvent.click(filenameHeader);

      await waitFor(() => {
        const updatedRows = screen.getAllByRole("row");
        expect(updatedRows[1]).toHaveTextContent("backup_b.sql"); // B vem depois de A em desc
        expect(updatedRows[2]).toHaveTextContent("backup_a.sql");
      });

      // Clicar novamente para inverter ordem
      fireEvent.click(filenameHeader);

      await waitFor(() => {
        const updatedRows = screen.getAllByRole("row");
        expect(updatedRows[1]).toHaveTextContent("backup_a.sql"); // A vem antes de B em asc
        expect(updatedRows[2]).toHaveTextContent("backup_b.sql");
      });
    });
  });

  describe("Estados especiais", () => {
    it("deve exibir estado de carregamento", () => {
      render(<BackupList {...mockProps} isLoading={true} />);

      expect(screen.getByText("Carregando backups...")).toBeInTheDocument();
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });

    it("deve exibir mensagem quando não há backups", () => {
      render(<BackupList {...mockProps} backups={[]} />);

      expect(screen.getByText(/Nenhum backup encontrado/)).toBeInTheDocument();
    });

    it("deve exibir mensagem quando filtros não retornam resultados", async () => {
      const backups = [createMockBackup({ filename: "backup_test.sql" })];

      render(<BackupList {...mockProps} backups={backups} />);

      // Buscar por algo que não existe
      const searchInput = screen.getByPlaceholderText(
        /Buscar por nome do arquivo/,
      );
      fireEvent.change(searchInput, { target: { value: "inexistente" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Nenhum backup corresponde aos filtros/),
        ).toBeInTheDocument();
      });
    });

    it("deve ocultar botões de exclusão quando canDelete é false", () => {
      const backups = [createMockBackup()];

      render(<BackupList {...mockProps} backups={backups} canDelete={false} />);

      expect(screen.queryByTestId("trash-icon")).not.toBeInTheDocument();
    });
  });
});
