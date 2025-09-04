"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Play, Edit, Trash2, Users } from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SeasonCardProps } from "./types";

export default function SeasonCard({
    season,
    isActive = false,
    showActions = false,
    onActivate,
    onEdit,
    onDelete,
    className
}: SeasonCardProps) {
    const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
    const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
    const now = new Date();
    
    const isUpcoming = isAfter(startDate, now);
    const isEnded = isBefore(endDate, now);
    const canActivate = !isActive && !isEnded && onActivate;
    
    const getStatusBadge = () => {
        if (isActive) {
            return <Badge variant="default" className="bg-green-500">Ativa</Badge>;
        }
        if (isUpcoming) {
            return <Badge variant="secondary">Próxima</Badge>;
        }
        if (isEnded) {
            return <Badge variant="outline">Encerrada</Badge>;
        }
        return <Badge variant="secondary">Inativa</Badge>;
    };
    
    return (
        <Card className={cn(
            "transition-all duration-200 hover:shadow-md",
            isActive && "border-primary/50 bg-primary/5",
            className
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        {season.description && (
                            <CardDescription>{season.description}</CardDescription>
                        )}
                    </div>
                    {getStatusBadge()}
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                            {format(startDate, "dd/MM/yyyy", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                    </div>
                </div>
                
                {showActions && (
                    <div className="flex items-center gap-2 pt-2">
                        {canActivate && (
                            <Button
                                size="sm"
                                onClick={() => onActivate(season.id)}
                                className="flex items-center gap-1"
                            >
                                <Play className="h-3 w-3" />
                                Ativar
                            </Button>
                        )}
                        
                        {onEdit && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit(season)}
                                className="flex items-center gap-1"
                            >
                                <Edit className="h-3 w-3" />
                                Editar
                            </Button>
                        )}
                        
                        {onDelete && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDelete(season.id)}
                                className="flex items-center gap-1 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-3 w-3" />
                                Excluir
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}