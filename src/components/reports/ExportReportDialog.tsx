"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Database,
  Calendar,
  Users,
  BarChart3,
} from "lucide-react";

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: "pdf" | "excel" | "csv") => void;
  reportData: {
    analytics: any;
    evaluations: any[];
    attendants: any[];
    filters: {
      timeRange: string;
      dateRange: any;
      selectedAttendants: string[];
    };
  };
}

export function ExportReportDialog({
  open,
  onOpenChange,
  onExport,
  reportData,
}: ExportReportDialogProps) {
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "csv">(
    "pdf",
  );
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeAttendantDetails, setIncludeAttendantDetails] = useState(true);
  const [includeSentimentAnalysis, setIncludeSentimentAnalysis] =
    useState(true);

  const handleExport = () => {
    onExport(exportFormat);
  };

  const formatOptions = [
    {
      value: "pdf" as const,
      label: "PDF",
      description: "Relatório completo com gráficos e formatação",
      icon: FileText,
      recommended: true,
    },
    {
      value: "excel" as const,
      label: "Excel",
      description: "Planilha com dados e gráficos editáveis",
      icon: FileSpreadsheet,
      recommended: false,
    },
    {
      value: "csv" as const,
      label: "CSV",
      description: "Dados brutos para análise externa",
      icon: Database,
      recommended: false,
    },
  ];

  const getPreviewInfo = () => {
    const { analytics, evaluations, attendants, filters } = reportData;

    return {
      totalEvaluations: evaluations.length,
      totalAttendants: attendants.length,
      averageRating: analytics.averageRating || 0,
      timeRange: filters.timeRange,
      hasDateFilter: filters.dateRange?.from && filters.dateRange?.to,
      hasAttendantFilter: filters.selectedAttendants.length > 0,
    };
  };

  const preview = getPreviewInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Relatório
          </DialogTitle>
          <DialogDescription>
            Configure as opções de exportação do relatório de satisfação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prévia do Relatório</CardTitle>
              <CardDescription>
                Dados que serão incluídos no relatório
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span>{preview.totalEvaluations} avaliações</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span>{preview.totalAttendants} atendentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span>Período: {preview.timeRange}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>Nota média: {preview.averageRating.toFixed(2)}</span>
                </div>
              </div>

              {(preview.hasDateFilter || preview.hasAttendantFilter) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Filtros aplicados:
                  </p>
                  <div className="space-y-1 text-xs">
                    {preview.hasDateFilter && (
                      <div>• Período personalizado selecionado</div>
                    )}
                    {preview.hasAttendantFilter && (
                      <div>
                        • {reportData.filters.selectedAttendants.length}{" "}
                        atendente(s) específico(s)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Formato de Exportação
            </Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value: any) => setExportFormat(value)}
            >
              {formatOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.label}</span>
                          {option.recommended && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Opções de Conteúdo</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="charts"
                  checked={includeCharts}
                  onCheckedChange={(checked) =>
                    setIncludeCharts(checked as boolean)
                  }
                  disabled={exportFormat === "csv"}
                />
                <Label htmlFor="charts" className="text-sm">
                  Incluir gráficos e visualizações
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attendant-details"
                  checked={includeAttendantDetails}
                  onCheckedChange={(checked) =>
                    setIncludeAttendantDetails(checked as boolean)
                  }
                />
                <Label htmlFor="attendant-details" className="text-sm">
                  Incluir detalhes por atendente
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sentiment"
                  checked={includeSentimentAnalysis}
                  onCheckedChange={(checked) =>
                    setIncludeSentimentAnalysis(checked as boolean)
                  }
                />
                <Label htmlFor="sentiment" className="text-sm">
                  Incluir análise de sentimentos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="raw-data"
                  checked={includeRawData}
                  onCheckedChange={(checked) =>
                    setIncludeRawData(checked as boolean)
                  }
                />
                <Label htmlFor="raw-data" className="text-sm">
                  Incluir dados brutos (todas as avaliações)
                </Label>
              </div>
            </div>
          </div>

          {/* Format-specific notes */}
          {exportFormat === "csv" && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> O formato CSV incluirá apenas dados
                tabulares. Gráficos e formatação visual não estarão disponíveis.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar {exportFormat.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
