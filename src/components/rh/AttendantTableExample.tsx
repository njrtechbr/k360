/**
 * Exemplo de uso do AttendantTable refatorado
 *
 * Este arquivo demonstra como usar o componente AttendantTable
 * com validação robusta implementada.
 */

import React from "react";
import AttendantTable from "./AttendantTable";
import { type Attendant } from "@/lib/types";

// Dados de exemplo para demonstração
const exampleAttendants: Attendant[] = [
  {
    id: "1",
    name: "João Silva",
    email: "joao@example.com",
    funcao: "Atendente",
    setor: "Vendas",
    status: "Ativo",
    telefone: "11999999999",
    dataAdmissao: "2023-01-01",
    dataNascimento: "1990-01-01",
    rg: "123456789",
    cpf: "12345678901",
    avatarUrl: null,
    portaria: null,
    createdAt: "2023-01-01",
    updatedAt: "2023-01-01",
    importId: null,
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "maria@example.com",
    funcao: "Supervisora",
    setor: "Atendimento",
    status: "Ativo",
    telefone: "11888888888",
    dataAdmissao: "2023-02-01",
    dataNascimento: "1985-05-15",
    rg: "987654321",
    cpf: "10987654321",
    avatarUrl: null,
    portaria: null,
    createdAt: "2023-02-01",
    updatedAt: "2023-02-01",
    importId: null,
  },
];

export default function AttendantTableExample() {
  const handleEdit = (attendant: Attendant) => {
    console.log("Editando atendente:", attendant.name);
  };

  const handleDelete = (attendant: Attendant) => {
    console.log("Excluindo atendente:", attendant.name);
  };

  const handleQrCode = (attendant: Attendant) => {
    console.log("Gerando QR Code para:", attendant.name);
  };

  const handleCopyLink = (attendant: Attendant) => {
    console.log("Copiando link para:", attendant.name);
  };

  const handleRetry = () => {
    console.log("Tentando novamente...");
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">
        Exemplos do AttendantTable Refatorado
      </h1>

      {/* Exemplo 1: Dados válidos */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          1. Tabela com dados válidos
        </h2>
        <AttendantTable
          attendants={exampleAttendants}
          isLoading={false}
          error={null}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQrCode={handleQrCode}
          onCopyLink={handleCopyLink}
          onRetry={handleRetry}
        />
      </section>

      {/* Exemplo 2: Estado de loading */}
      <section>
        <h2 className="text-xl font-semibold mb-4">2. Estado de loading</h2>
        <AttendantTable
          attendants={exampleAttendants}
          isLoading={true}
          error={null}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQrCode={handleQrCode}
          onCopyLink={handleCopyLink}
          onRetry={handleRetry}
        />
      </section>

      {/* Exemplo 3: Estado de erro */}
      <section>
        <h2 className="text-xl font-semibold mb-4">3. Estado de erro</h2>
        <AttendantTable
          attendants={exampleAttendants}
          isLoading={false}
          error="Erro ao carregar dados dos atendentes"
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQrCode={handleQrCode}
          onCopyLink={handleCopyLink}
          onRetry={handleRetry}
        />
      </section>

      {/* Exemplo 4: Dados null (validação robusta) */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          4. Dados null (validação robusta)
        </h2>
        <AttendantTable
          attendants={null}
          isLoading={false}
          error={null}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQrCode={handleQrCode}
          onCopyLink={handleCopyLink}
          onRetry={handleRetry}
        />
      </section>

      {/* Exemplo 5: Array vazio */}
      <section>
        <h2 className="text-xl font-semibold mb-4">5. Array vazio</h2>
        <AttendantTable
          attendants={[]}
          isLoading={false}
          error={null}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQrCode={handleQrCode}
          onCopyLink={handleCopyLink}
          onRetry={handleRetry}
        />
      </section>

      {/* Exemplo 6: Dados com propriedades undefined */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          6. Dados com propriedades undefined
        </h2>
        <AttendantTable
          attendants={[
            {
              ...exampleAttendants[0],
              name: undefined as any,
              email: undefined as any,
              funcao: undefined as any,
              setor: undefined as any,
              status: undefined as any,
            },
          ]}
          isLoading={false}
          error={null}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQrCode={handleQrCode}
          onCopyLink={handleCopyLink}
          onRetry={handleRetry}
        />
      </section>
    </div>
  );
}

/**
 * Resumo das melhorias implementadas no AttendantTable:
 *
 * 1. **Validação Robusta de Dados**:
 *    - Substituído spread operator direto por validação segura
 *    - Implementada verificação Array.isArray antes de operações
 *    - Adicionado tratamento para attendants null/undefined
 *
 * 2. **Memoização para Performance**:
 *    - useMemo para validação e ordenação de atendentes
 *    - useMemo para componentes de loading, error e empty
 *    - useMemo para validador customizado
 *
 * 3. **Componente DataValidator**:
 *    - Wrapper genérico para validação de dados
 *    - Estados de loading, error e empty padronizados
 *    - Fallbacks seguros para dados inválidos
 *
 * 4. **Tratamento de Propriedades Undefined**:
 *    - Fallbacks para name, email, funcao, setor, status
 *    - Verificação segura de avatarUrl
 *    - Mensagens informativas para dados não informados
 *
 * 5. **Interface Melhorada**:
 *    - Props opcionais para error e onRetry
 *    - Suporte a attendants null/undefined na interface
 *    - Componentes de estado padronizados
 *
 * 6. **Separação de Responsabilidades**:
 *    - AttendantTableContent para renderização da tabela
 *    - AttendantTable principal para validação e estados
 *    - Lógica de validação isolada em funções utilitárias
 */
