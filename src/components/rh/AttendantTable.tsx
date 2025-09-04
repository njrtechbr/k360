"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Pencil, Trash2, Eye, QrCode, Link as LinkIcon } from "lucide-react";
import { UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { type Attendant } from "@/lib/types";

interface AttendantTableProps {
  attendants: Attendant[];
  isLoading?: boolean;
  onEdit: (attendant: Attendant) => void;
  onDelete: (attendant: Attendant) => void;
  onQrCode: (attendant: Attendant) => void;
  onCopyLink: (attendant: Attendant) => void;
}

export default function AttendantTable({
  attendants,
  isLoading = false,
  onEdit,
  onDelete,
  onQrCode,
  onCopyLink
}: AttendantTableProps) {
  const sortedAttendants = [...attendants].sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
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
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-10 w-48" /></TableCell>
              <TableCell><Skeleton className="h-6 w-32" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (sortedAttendants.length === 0) {
    return (
      <div className="text-center py-8">
        <UserCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum atendente cadastrado</h3>
        <p className="text-sm text-muted-foreground">
          Comece adicionando um novo atendente ou importando dados via CSV.
        </p>
      </div>
    );
  }

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
                <AvatarImage src={attendant.avatarUrl} alt={attendant.name}/>
                <AvatarFallback><UserCircle /></AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{attendant.name}</div>
                <div className="text-sm text-muted-foreground">{attendant.email}</div>
              </div>
            </TableCell>
            <TableCell>{attendant.funcao}</TableCell>
            <TableCell className="capitalize">{attendant.setor}</TableCell>
            <TableCell>
              <Badge variant={attendant.status === 'Ativo' ? "secondary" : "outline"}>
                {attendant.status}
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