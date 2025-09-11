"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import { useToast } from "@/hooks/use-toast";
import { type Attendant } from "@/lib/types";

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attendant: Attendant | null;
}

export default function QRCodeDialog({
  isOpen,
  onClose,
  attendant,
}: QRCodeDialogProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getSurveyUrl = (attendantId: string) => {
    return `${window.location.origin}/survey?attendantId=${attendantId}`;
  };

  const handleDownloadQrCode = () => {
    if (!qrCodeRef.current || !attendant) return;

    toPng(qrCodeRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `qrcode-${attendant.name.toLowerCase().replace(/ /g, "-")}.png`;
        link.href = dataUrl;
        link.click();
        toast({
          title: "QR Code baixado!",
          description: "O arquivo foi salvo em sua pasta de downloads.",
        });
      })
      .catch((err) => {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Erro ao baixar QR Code",
          description: "Não foi possível gerar a imagem.",
        });
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code para Avaliação</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR Code para avaliar o atendente{" "}
            <span className="font-bold">{attendant?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center p-4 bg-white rounded-md">
          <div ref={qrCodeRef} className="p-4 bg-white">
            {attendant && (
              <QRCode
                value={getSurveyUrl(attendant.id)}
                size={256}
                level="M"
                includeMargin={true}
              />
            )}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Link: {attendant && getSurveyUrl(attendant.id)}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleDownloadQrCode}>
            <Download className="mr-2 h-4 w-4" /> Baixar QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
