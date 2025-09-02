
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, Users, Check, Wand2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ATTENDANT_STATUS, FUNCOES, SETORES, type Attendant, type Funcao, type Setor } from "@/lib/types";

type CsvRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarUrl: string;
    telefone: string;
    portaria: string;
    situacao: string;
    dataAdmissao: string;
    dataNascimento: string;
    rg: string;
    cpf: string;
};

export default function ImportarAtendentesPage() {
    const { user, isAuthenticated, loading, attendants, addAttendant } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<CsvRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [defaultSetor, setDefaultSetor] = useState<Setor | null>(null);

    const existingEmails = useMemo(() => new Set(attendants.map(a => a.email.toLowerCase())), [attendants]);
    const existingCpfs = useMemo(() => new Set(attendants.map(a => a.cpf)), [attendants]);

    const attendantsToImport = useMemo(() => {
        return parsedData.filter(row => 
            !existingEmails.has(row.email.toLowerCase()) && 
            !existingCpfs.has(row.cpf)
        );
    }, [parsedData, existingEmails, existingCpfs]);


    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setParsedData([]);
        }
    };

    const handleParseFile = () => {
        if (!file) return;
        setIsProcessing(true);
        Papa.parse<CsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const validData = results.data.filter(row => row.name && row.email && row.cpf);
                setParsedData(validData);
                setIsProcessing(false);
            },
            error: (error) => {
                console.error("CSV Parsing Error:", error);
                toast({ variant: "destructive", title: "Erro ao ler o arquivo", description: "Verifique o formato do CSV." });
                setIsProcessing(false);
            }
        });
    };
    
    const handleImport = async () => {
        if (!user || !defaultSetor) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um setor padrão para continuar."});
            return;
        }

        setIsProcessing(true);
        setImportProgress(0);

        const totalToImport = attendantsToImport.length;
        let importedCount = 0;

        for (const row of attendantsToImport) {
            try {
                 const newAttendant: Omit<Attendant, 'id'> = {
                    name: row.name || "Nome não informado",
                    email: row.email || `sem-email-${importedCount}@invalido.com`,
                    funcao: (FUNCOES.find(f => f.toLowerCase() === row.role?.toLowerCase()) || "Atendente") as Funcao,
                    setor: defaultSetor,
                    status: row.status?.toLowerCase() === 'ativo' ? ATTENDANT_STATUS.ACTIVE : ATTENDANT_STATUS.INACTIVE,
                    avatarUrl: row.avatarUrl || "",
                    telefone: row.telefone || "00000000000",
                    portaria: row.portaria || "N/A",
                    situacao: row.situacao || "N/A",
                    dataAdmissao: row.dataAdmissao ? new Date(row.dataAdmissao).toISOString() : new Date().toISOString(),
                    dataNascimento: row.dataNascimento ? new Date(row.dataNascimento).toISOString() : new Date().toISOString(),
                    rg: row.rg || "000000000",
                    cpf: row.cpf || `00000000000${importedCount}`,
                };

                await addAttendant(newAttendant);

            } catch (error) {
                console.error(`Erro ao importar atendente ${row.name}`, error);
            }
             importedCount++;
             setImportProgress((importedCount / totalToImport) * 100);
             await new Promise(res => setTimeout(res, 100)); // Small delay to allow UI update
        }

        toast({
            title: "Importação Concluída!",
            description: `${importedCount} de ${totalToImport} novos atendentes foram importados.`,
        });
        
        setFile(null);
        setParsedData([]);
        setIsProcessing(false);
    };
    
    if (loading) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }
    
    const hasDataToImport = parsedData.length > 0;
    const newAttendantsCount = attendantsToImport.length;
    const skippedAttendantsCount = parsedData.length - newAttendantsCount;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Importar Atendentes de CSV</h1>
            
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                 <Card className="lg:col-span-1 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileUp /> 1. Upload do Arquivo CSV</CardTitle>
                        <CardDescription>Selecione o arquivo CSV com os dados dos atendentes.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="csv-file">Arquivo CSV</Label>
                            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                        </div>
                        <Button onClick={handleParseFile} disabled={!file || isProcessing} className="w-full">
                            {isProcessing ? "Processando..." : "Ler Arquivo"}
                        </Button>
                    </CardContent>
                </Card>

                 {hasDataToImport && (
                    <Card className="lg:col-span-2 shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Check /> 2. Confirmar e Importar</CardTitle>
                            <CardDescription>
                                Revise os atendentes que serão adicionados. Atendentes com email ou CPF já existentes serão ignorados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTitle className="flex items-center gap-2"><Users /> Resumo da Importação</AlertTitle>
                                <AlertDescription>
                                    <p>Serão importados <strong>{newAttendantsCount}</strong> novos atendentes.</p>
                                    <p>Serão ignorados <strong>{skippedAttendantsCount}</strong> atendentes (e-mail ou CPF já existente).</p>
                                </AlertDescription>
                            </Alert>
                             <div className="my-4">
                                <Label>Setor Padrão</Label>
                                <Select onValueChange={(value) => setDefaultSetor(value as Setor)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um setor para os novos atendentes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SETORES.map(setor => (
                                            <SelectItem key={setor} value={setor} className="capitalize">{setor}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="max-h-60 overflow-y-auto mt-4 border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Função</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendantsToImport.map((row, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell><Badge variant="outline">{row.role}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-4">
                            {isProcessing && <Progress value={importProgress} />}
                            <Button onClick={handleImport} disabled={newAttendantsCount === 0 || isProcessing || !defaultSetor} size="lg" className="w-full">
                                <Wand2 className="mr-2 h-4 w-4" />
                                {isProcessing ? `Importando... ${Math.round(importProgress)}%` : `Importar ${newAttendantsCount} Atendentes`}
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}
