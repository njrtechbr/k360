
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Check, Hourglass, Loader, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import React from "react";

export default function ImportProgressModal() {
    const { importStatus, setImportStatus } = useAuth();

    const Icon = React.useMemo(() => {
        switch (importStatus.status) {
            case 'processing':
                return <Loader className="h-6 w-6 animate-spin text-blue-500" />;
            case 'done':
                return <Check className="h-6 w-6 text-green-500" />;
            case 'error':
                return <X className="h-6 w-6 text-destructive" />;
            default:
                return <Hourglass className="h-6 w-6 text-muted-foreground" />;
        }
    }, [importStatus.status]);
    
    return (
        <Dialog open={importStatus.isOpen} onOpenChange={(isOpen) => {
            // Prevent closing the modal while processing
            if (importStatus.status !== 'processing') {
                setImportStatus(prev => ({ ...prev, isOpen }));
            }
        }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
                if (importStatus.status === 'processing') {
                    e.preventDefault();
                }
            }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                       {Icon}
                       {importStatus.title}
                    </DialogTitle>
                    <DialogDescription>
                        {importStatus.status === 'processing' && "Por favor, aguarde a conclusão do processo. Não feche esta aba."}
                        {importStatus.status === 'done' && "O processo foi concluído com sucesso."}
                        {importStatus.status === 'error' && "Ocorreu um erro durante o processo."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Progress value={importStatus.progress} className="w-full" />
                     <ScrollArea className="h-64 w-full rounded-md border p-4">
                        <div className="flex flex-col gap-2">
                            {importStatus.logs.map((log, index) => (
                                <p key={index} className="text-sm text-muted-foreground animate-in fade-in-0">
                                   &raquo; {log}
                                </p>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
