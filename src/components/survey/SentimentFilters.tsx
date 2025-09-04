"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Filter,
  X,
  Calendar as CalendarIcon,
  Search,
  RotateCcw,
  Users,
  Star,
  Brain,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SentimentBadge from './SentimentBadge';

export interface SentimentFilterOptions {
  searchTerm?: string;
  sentiments?: Array<'Positivo' | 'Negativo' | 'Neutro'>;
  confidenceRange?: [number, number];
  ratingRange?: [number, number];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  attendants?: string[];
  hasConflicts?: boolean;
  minAnalysisLength?: number;
  sortBy?: 'date' | 'confidence' | 'rating' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

export interface AttendantOption {
  id: string;
  name: string;
  totalAnalyses: number;
}

export interface SentimentFiltersProps {
  filters: SentimentFilterOptions;
  onFiltersChange: (filters: SentimentFilterOptions) => void;
  attendants?: AttendantOption[];
  totalResults?: number;
  className?: string;
}

const SentimentFilters: React.FC<SentimentFiltersProps> = ({
  filters,
  onFiltersChange,
  attendants = [],
  totalResults = 0,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(filters.dateRange?.from);
  const [dateTo, setDateTo] = useState<Date | undefined>(filters.dateRange?.to);

  const updateFilter = useCallback(<K extends keyof SentimentFilterOptions>(
    key: K,
    value: SentimentFilterOptions[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  const toggleSentiment = useCallback((sentiment: 'Positivo' | 'Negativo' | 'Neutro') => {
    const currentSentiments = filters.sentiments || [];
    const newSentiments = currentSentiments.includes(sentiment)
      ? currentSentiments.filter(s => s !== sentiment)
      : [...currentSentiments, sentiment];
    
    updateFilter('sentiments', newSentiments.length > 0 ? newSentiments : undefined);
  }, [filters.sentiments, updateFilter]);

  const toggleAttendant = useCallback((attendantId: string) => {
    const currentAttendants = filters.attendants || [];
    const newAttendants = currentAttendants.includes(attendantId)
      ? currentAttendants.filter(id => id !== attendantId)
      : [...currentAttendants, attendantId];
    
    updateFilter('attendants', newAttendants.length > 0 ? newAttendants : undefined);
  }, [filters.attendants, updateFilter]);

  const handleDateRangeChange = useCallback(() => {
    if (dateFrom || dateTo) {
      updateFilter('dateRange', {
        from: dateFrom,
        to: dateTo
      });
    } else {
      updateFilter('dateRange', undefined);
    }
  }, [dateFrom, dateTo, updateFilter]);

  const clearAllFilters = useCallback(() => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({});
  }, [onFiltersChange]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.sentiments?.length) count++;
    if (filters.confidenceRange) count++;
    if (filters.ratingRange) count++;
    if (filters.dateRange) count++;
    if (filters.attendants?.length) count++;
    if (filters.hasConflicts) count++;
    if (filters.minAnalysisLength) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Análise
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {totalResults} resultado{totalResults !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Menos' : 'Mais'} filtros
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Busca por texto */}
        <div className="space-y-2">
          <Label htmlFor="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Buscar em comentários
          </Label>
          <Input
            id="search"
            placeholder="Digite palavras-chave..."
            value={filters.searchTerm || ''}
            onChange={(e) => updateFilter('searchTerm', e.target.value || undefined)}
          />
        </div>

        {/* Filtros de sentimento */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Sentimentos
          </Label>
          <div className="flex flex-wrap gap-2">
            {(['Positivo', 'Negativo', 'Neutro'] as const).map((sentiment) => {
              const isSelected = filters.sentiments?.includes(sentiment);
              return (
                <Button
                  key={sentiment}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSentiment(sentiment)}
                  className="h-8"
                >
                  <SentimentBadge 
                    sentiment={sentiment} 
                    size="sm" 
                    showIcon={false}
                    className="mr-2"
                  />
                  {sentiment}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Filtros expandidos */}
        {isExpanded && (
          <>
            <Separator />
            
            {/* Faixa de confiança */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Confiança da IA ({((filters.confidenceRange?.[0] || 0) * 100).toFixed(0)}% - {((filters.confidenceRange?.[1] || 1) * 100).toFixed(0)}%)
              </Label>
              <Slider
                value={filters.confidenceRange || [0, 1]}
                onValueChange={(value) => updateFilter('confidenceRange', value as [number, number])}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Faixa de avaliação */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Nota da Avaliação ({filters.ratingRange?.[0] || 1} - {filters.ratingRange?.[1] || 5} estrelas)
              </Label>
              <Slider
                value={filters.ratingRange || [1, 5]}
                onValueChange={(value) => updateFilter('ratingRange', value as [number, number])}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Período */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Período
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDateRangeChange}
                  disabled={!dateFrom && !dateTo}
                >
                  Aplicar
                </Button>
              </div>
            </div>

            {/* Atendentes */}
            {attendants.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Atendentes ({filters.attendants?.length || 0} selecionados)
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                  {attendants.map((attendant) => {
                    const isSelected = filters.attendants?.includes(attendant.id);
                    return (
                      <div key={attendant.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`attendant-${attendant.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleAttendant(attendant.id)}
                        />
                        <Label 
                          htmlFor={`attendant-${attendant.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex justify-between items-center">
                            <span>{attendant.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {attendant.totalAnalyses}
                            </Badge>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filtros adicionais */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conflicts"
                  checked={filters.hasConflicts || false}
                  onCheckedChange={(checked) => updateFilter('hasConflicts', checked || undefined)}
                />
                <Label htmlFor="conflicts" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="h-4 w-4" />
                  Apenas análises conflitantes
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minLength">
                  Tamanho mínimo do comentário (caracteres)
                </Label>
                <Input
                  id="minLength"
                  type="number"
                  min="0"
                  placeholder="Ex: 50"
                  value={filters.minAnalysisLength || ''}
                  onChange={(e) => updateFilter('minAnalysisLength', 
                    e.target.value ? parseInt(e.target.value) : undefined
                  )}
                />
              </div>
            </div>

            {/* Ordenação */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select
                  value={filters.sortBy || 'date'}
                  onValueChange={(value) => updateFilter('sortBy', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="confidence">Confiança</SelectItem>
                    <SelectItem value="rating">Nota</SelectItem>
                    <SelectItem value="sentiment">Sentimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Select
                  value={filters.sortOrder || 'desc'}
                  onValueChange={(value) => updateFilter('sortOrder', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Decrescente</SelectItem>
                    <SelectItem value="asc">Crescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SentimentFilters;