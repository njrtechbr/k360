
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Attendant } from "@/lib/types";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import AttendantForm from "@/components/rh/AttendantForm";
import AttendantTable from "@/components/rh/AttendantTable";
import QRCodeDialog from "@/components/rh/QRCodeDialog";

export default function AtendentesPage() {
  const { 
    user, 
    isAuthenticated, 
    appLoading, 
    authLoading, 
    attendants, 
    addAttendant, 
    updateAttendant, 
    deleteAttendants, 
    funcoes, 
    setores 
  } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (selectedAttendant) {
        await updateAttendant(selectedAttendant.id, data);
        toast({ 
          title: "Atendente atualizado!", 
          description: "As informações foram salvas com sucesso." 
        });
      } else {
        await addAttendant(data);
        toast({ 
          title: "Atendente adicionado!", 
          description: "O novo atendente foi cadastrado com sucesso." 
        });
      }
      setIsFormDialogOpen(false);
      setSelectedAttendant(null);
    } catch (error) {
      // Error handling is done by the auth provider
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setIsFormDialogOpen(false);
    setSelectedAttendant(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAttendant) return;
    try {
      await deleteAttendants([selectedAttendant.id]);
      toast({ 
        title: "Atendente excluído!", 
        description: "O atendente foi removido do sistema." 
      });
      setIsDeleteDialogOpen(false);
      setSelectedAttendant(null);
    } catch(error) {
      // Error handling is done by the auth provider
    }
  };

  const handleEdit = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsFormDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedAttendant(null);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsDeleteDialogOpen(true);
  };
  
  const handleCopyLink = (attendant: Attendant) => {
    const url = `${window.location.origin}/survey?attendantId=${attendant.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ 
        title: "Link copiado!", 
        description: "O link de avaliação foi copiado para a área de transferência." 
      });
    });
  };
  
  const handleQrCode = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsQrCodeDialogOpen(true);
  };

  if (authLoading || !user) {
    return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atendentes</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de atendentes e funcionários do sistema
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          Adicionar Atendente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atendentes Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os atendentes cadastrados no sistema com suas informações principais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendantTable
            attendants={attendants}
            isLoading={appLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onQrCode={handleQrCode}
            onCopyLink={handleCopyLink}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAttendant ? 'Editar Atendente' : 'Adicionar Novo Atendente'}
            </DialogTitle>
            <DialogDescription>
              {selectedAttendant 
                ? 'Altere as informações do atendente conforme necessário.' 
                : 'Preencha os dados do novo atendente para cadastrá-lo no sistema.'
              }
            </DialogDescription>
          </DialogHeader>
          <AttendantForm
            attendant={selectedAttendant}
            funcoes={funcoes}
            setores={setores}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <QRCodeDialog
        isOpen={isQrCodeDialogOpen}
        onClose={() => setIsQrCodeDialogOpen(false)}
        attendant={selectedAttendant}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O atendente "{selectedAttendant?.name}" será 
              permanentemente removido do sistema, incluindo todas as suas avaliações e dados relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Atendente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
