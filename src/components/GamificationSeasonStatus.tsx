
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, Trophy, CalendarClock } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "./ui/badge";

export default function GamificationSeasonStatus() {
    const { activeSeason, nextSeason } = useAuth();

    if (!activeSeason) {
         if (nextSeason) {
            const startDate = parseISO(nextSeason.startDate);
            const formattedStartDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
             return (
                 <Card className="bg-muted/50 border-dashed">
                     <CardHeader className="flex-row items-center justify-between">
                         <div className="flex items-center gap-4">
                            <CalendarClock className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <CardTitle>Próxima Temporada: {nextSeason.name}</CardTitle>
                                <CardDescription>Prepare-se! A próxima temporada começa em {formattedStartDate}.</CardDescription>
                            </div>
                         </div>
                     </CardHeader>
                 </Card>
             );
        }

        return (
            <Card className="bg-muted/50 border-dashed">
                <CardHeader className="flex-row items-center gap-4">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <CardTitle>Nenhuma Temporada Ativa</CardTitle>
                        <CardDescription>O ranking e o acúmulo de XP estão pausados. Um administrador pode iniciar uma nova temporada nas configurações.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        );
    }
    
    const endDate = parseISO(activeSeason.endDate);
    const daysRemaining = differenceInDays(endDate, new Date());
    const formattedEndDate = format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const getTimeRemainingText = () => {
        if (daysRemaining < 0) return "Encerrada";
        if (daysRemaining === 0) return "Termina hoje!";
        if (daysRemaining === 1) return "Termina amanhã!";
        return `Termina em ${daysRemaining} dias`;
    }

    return (
        <Card className="bg-card border-primary/20">
            <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                     <Trophy className="h-8 w-8 text-primary" />
                     <div>
                        <CardTitle className="text-xl">Temporada Atual: {activeSeason.name}</CardTitle>
                        <CardDescription>O ranking está ativo! A temporada termina em {formattedEndDate}.</CardDescription>
                    </div>
                </div>
                <Badge variant="secondary" className="text-base">
                    <Hourglass className="mr-2 h-4 w-4" />
                    {getTimeRemainingText()}
                </Badge>
            </CardHeader>
        </Card>
    );
}
