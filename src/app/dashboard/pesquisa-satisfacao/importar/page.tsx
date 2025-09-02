
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
import { FileUp, Users, Check, Wand2, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type CsvRow = {
    Data: string;
    Agente: string;
    Nota: string;
};

type MappedReview = {
    agentName: string;
    attendantId: string;
    date: string;
    rating: number;
}

export default function ImportarAvaliacoesPage() {
    const { user, isAuthenticated, loading, attendants, addEvaluation } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<CsvRow[]>([]);
    const [agentMap, setAgentMap] = useState<Record<string, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [importProgress, setImportProgress] = useState(0);

    const uniqueAgents = useMemo(() => {
        const agents = new Set(parsedData.map(row => row.Agente));
        return Array.from(agents);
    }, [parsedData]);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setParsedData([]);
            setAgentMap({});
        }
    };

    const handleParseFile = () => {
        if (!file) return;
        setIsProcessing(true);
        Papa.parse<CsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const validData = results.data.filter(row => row.Data && row.Agente && row.Nota);
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

    const handleMappingChange = (agentName: string, attendantId: string) => {
        setAgentMap(prev => ({ ...prev, [agentName]: attendantId }));
    };

    const mappedReviews: MappedReview[] = useMemo(() => {
        return parsedData
            .map(row => {
                const attendantId = agentMap[row.Agente];
                if (!attendantId) return null;
                
                const [datePart, timePart] = row.Data.split(', ');
                const [day, month, year] = datePart.split('/');
                const date = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);

                return {
                    agentName: row.Agente,
                    attendantId,
                    date: date.toISOString(),
                    rating: parseInt(row.Nota, 10),
                }
            })
            .filter((row): row is MappedReview => row !== null && !isNaN(row.rating));
    }, [parsedData, agentMap]);
    
    const handleImport = async () => {
        setIsProcessing(true);
        setImportProgress(0);

        const totalReviews = mappedReviews.length;
        let importedCount = 0;

        for (const review of mappedReviews) {
            try {
                await addEvaluation({
                    attendantId: review.attendantId,
                    nota: review.rating,
                    comentario: `Importado do WhatsApp em ${formatDate(review.date)}`,
                });
            } catch (error) {
                console.error(`Erro ao importar avaliação para ${review.agentName}`, error);
            }
             importedCount++;
             setImportProgress((importedCount / totalReviews) * 100);
             await new Promise(res => setTimeout(res, 50)); // Small delay to allow UI update
        }

        toast({
            title: "Importação Concluída!",
            description: `${importedCount} de ${totalReviews} avaliações foram importadas com sucesso.`,
        });
        
        setFile(null);
        setParsedData([]);
        setAgentMap({});
        setIsProcessing(false);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR');
        } catch {
            return 'Data inválida';
        }
    }
    
    if (loading) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const allAgentsMapped = uniqueAgents.length > 0 && uniqueAgents.every(agent => agentMap[agent]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Importar Avaliações de CSV</h1>
            
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileUp /> 1. Upload do Arquivo CSV</CardTitle>
                    <CardDescription>Selecione o arquivo CSV exportado da plataforma de WhatsApp.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv-file">Arquivo CSV</Label>
                        <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                    </div>
                    <Button onClick={handleParseFile} disabled={!file || isProcessing} className="self-end">
                        {isProcessing ? "Processando..." : "Ler Arquivo"}
                    </Button>
                </CardContent>
            </Card>

            {uniqueAgents.length > 0 && (
                <Card className="shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> 2. Mapeamento de Agentes</CardTitle>
                        <CardDescription>Associe cada agente do arquivo CSV a um atendente cadastrado no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {uniqueAgents.map(agent => (
                            <div key={agent} className="flex items-center gap-4 justify-between p-2 border rounded-md">
                                <span className="font-medium">{agent}</span>
                                <ArrowRight className="text-muted-foreground" />
                                <Select onValueChange={(attendantId) => handleMappingChange(agent, attendantId)} value={agentMap[agent]}>
                                    <SelectTrigger className="w-[250px]">
                                        <SelectValue placeholder="Selecione um atendente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {attendants.map(att => (
                                            <SelectItem key={att.id} value={att.id}>{att.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {allAgentsMapped && (
                <Card className="shadow-lg animate-in fade-in-0 slide-in-from-bottom-5 duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Check /> 3. Confirmar e Importar</CardTitle>
                        <CardDescription>Revise os dados que serão importados. Apenas avaliações com agentes mapeados serão salvas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agente (CSV)</TableHead>
                                        <TableHead>Atendente (Sistema)</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Nota</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mappedReviews.map((review, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Badge variant="outline">{review.agentName}</Badge></TableCell>
                                            <TableCell className="font-medium">{attendants.find(a => a.id === review.attendantId)?.name}</TableCell>
                                            <TableCell>{formatDate(review.date)}</TableCell>
                                            <TableCell className="text-right font-bold">{review.rating}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-4">
                        {isProcessing && <Progress value={importProgress} />}
                        <Button onClick={handleImport} disabled={!allAgentsMapped || isProcessing} size="lg" className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" />
                            {isProcessing ? `Importando... ${Math.round(importProgress)}%` : `Importar ${mappedReviews.length} Avaliações`}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

