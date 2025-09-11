"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  QrCode,
  Link as LinkIcon,
} from "lucide-react";
import { UserCircle } from "lucide-react";

import Link from "next/link";
import { type Attendant } from "@/lib/types";
import {
  DataValidator,
  LoadingTable,
  ErrorTable,
  EmptyTable,
} from "@/components/ui/data-validator";
import {
  validateAttendantArray,
  isValidAttendant,
} from "@/lib/data-validation";

interface AttendantTableProps {
  attendants: Attendant[] | null | undefined;
  isLoading?: boolean;
  error?: string | null;
  onEdit: (attendant: Attendant) => void;
  onDelete: (attendant: Attendant) => void;
  onQrCode: (attendant: Attendant) => void;
  onCopyLink: (attendant: Attendant) => void;
  onRetry?: () => void;
}

/**
 * Componente interno que renderiza a tabela com dados validados
 */
function AttendantTableContent({
  attendants,
  onEdit,
  onDelete,
  onQrCode,
  onCopyLink,
}: {
  attendants: Attendant[];
  onEdit: (attendant: Attendant) => void;
  onDelete: (attendant: Attendant) => void;
  onQrCode: (attendant: Attendant) => void;
  onCopyLink: (attendant: Attendant) => void;
}) {
  // Validação e ordenação segura dos atendentes com memoização
  const sortedAttendants = useMemo(() => {
    // Validação adicional para garantir que todos os itens são atendentes válidos
    const validAttendants = attendants.filter((attendant) => {
      if (!isValidAttendant(attendant)) {
        console.warn(
          "AttendantTable: Atendente inválido removido da lista",
          attendant,
        );
        return false;
      }
      return true;
    });

    // Ordenação segura com fallback para propriedades undefined
    return validAttendants.sort((a, b) => {
      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB);
    });
  }, [attendants]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Função</TableHead>
          <TableHead>Setor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedAttendants.map((attendant) => (
          <TableRow key={attendant.id}>
            <TableCell className="font-medium flex items-center gap-3">
              <Avatar>
                <AvatarImage
                  src={attendant.avatarUrl}
                  alt={attendant.name || "Atendente"}
                />
                <AvatarFallback>
                  <UserCircle />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {attendant.name || "Nome não informado"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {attendant.email || "Email não informado"}
                </div>
              </div>
            </TableCell>
            <TableCell>{attendant.funcao || "Não informado"}</TableCell>
            <TableCell className="capitalize">
              {attendant.setor || "Não informado"}
            </TableCell>
            <TableCell>
              <Badge
                variant={attendant.status === "Ativo" ? "secondary" : "outline"}
              >
                {attendant.status || "Indefinido"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/rh/atendentes/${attendant.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> Ver Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onQrCode(attendant)}>
                    <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopyLink(attendant)}>
                    <LinkIcon className="mr-2 h-4 w-4" /> Copiar Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(attendant)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onDelete(attendant)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Componente principal da tabela de atendentes com validação robusta
 *
 * Este componente implementa validação completa de dados, tratamento de estados
 * de loading e error, e fallbacks seguros para prevenir erros de runtime.
 */
export default function AttendantTable({
  attendants,
  isLoading = false,
  error = null,
  onEdit,
  onDelete,
  onQrCode,
  onCopyLink,
  onRetry,
}: AttendantTableProps) {
  // Validador customizado para array de atendentes
  const attendantArrayValidator = useMemo(() => {
    return (data: any): data is Attendant[] => {
      const validation = validateAttendantArray(data);
      return validation.isValid;
    };
  }, []);

  // Componente de loading customizado para tabela
  const loadingComponent = useMemo(
    () => <LoadingTable rows={5} columns={5} />,
    [],
  );

  // Componente de erro customizado
  const errorComponent = useMemo(
    () => <ErrorTable error={error || "Erro desconhecido"} onRetry={onRetry} />,
    [error, onRetry],
  );

  // Componente de estado vazio customizado
  const emptyComponent = useMemo(
    () => (
      <EmptyTable
        message="Comece adicionando um novo atendente ou importando dados via CSV."
        onRetry={onRetry}
      />
    ),
    [onRetry],
  );

  return (
    <DataValidator
      data={attendants}
      fallback={[]}
      loading={isLoading}
      error={error}
      validator={attendantArrayValidator}
      loadingComponent={loadingComponent}
      errorComponent={errorComponent}
      emptyComponent={emptyComponent}
      onRetry={onRetry}
      emptyMessage="Nenhum atendente cadastrado"
      treatEmptyArrayAsEmpty={true}
      enableWarnings={true}
    >
      {(validAttendants) => (
        <AttendantTableContent
          attendants={validAttendants}
          onEdit={onEdit}
          onDelete={onDelete}
          onQrCode={onQrCode}
          onCopyLink={onCopyLink}
        />
      )}
    </DataValidator>
  );
}
