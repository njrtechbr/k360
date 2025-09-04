"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaderboardCardProps } from "./types";

const getPositionIcon = (position: number) => {
    switch (position) {
        case 1:
            return <Trophy className="h-5 w-5 text-yellow-500" />;
        case 2:
            return <Medal className="h-5 w-5 text-gray-400" />;
        case 3:
            return <Award className="h-5 w-5 text-amber-600" />;
        default:
            return null;
    }
};

const getPositionColor = (position: number) => {
    switch (position) {
        case 1:
            return "text-yellow-600 bg-yellow-50 border-yellow-200";
        case 2:
            return "text-gray-600 bg-gray-50 border-gray-200";
        case 3:
            return "text-amber-600 bg-amber-50 border-amber-200";
        default:
            return "text-muted-foreground";
    }
};

export default function LeaderboardCard({
    entries,
    title = "Ranking",
    currentAttendantId,
    showViewAll = false,
    onViewAll,
    className
}: LeaderboardCardProps) {
    const topEntries = entries.slice(0, 5);
    const currentUserEntry = currentAttendantId ? 
        entries.find(entry => entry.attendantId === currentAttendantId) : null;
    
    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-primary" />
                            {title}
                        </CardTitle>
                        <CardDescription>
                            {entries.length} participantes
                        </CardDescription>
                    </div>
                    
                    {showViewAll && onViewAll && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onViewAll}
                            className="flex items-center gap-1"
                        >
                            Ver todos
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
                {topEntries.map((entry, index) => {
                    const isCurrentUser = entry.attendantId === currentAttendantId;
                    
                    return (
                        <div
                            key={entry.attendantId}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                isCurrentUser && "bg-primary/5 border border-primary/20",
                                !isCurrentUser && "hover:bg-muted/50"
                            )}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    {getPositionIcon(entry.position) || (
                                        <div className="w-5 h-5 flex items-center justify-center">
                                            <span className="text-sm font-bold text-muted-foreground">
                                                {entry.position}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                        {entry.attendantName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        "font-medium truncate",
                                        isCurrentUser && "text-primary"
                                    )}>
                                        {entry.attendantName}
                                        {isCurrentUser && " (Você)"}
                                    </p>
                                    {entry.department && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {entry.department}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-yellow-500" />
                                    <span className="font-medium">
                                        {entry.totalXp.toLocaleString()}
                                    </span>
                                </div>
                                
                                <Badge variant="outline" className="text-xs">
                                    Nível {entry.level}
                                </Badge>
                                
                                {entry.achievementCount > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Trophy className="h-3 w-3" />
                                        <span>{entry.achievementCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Show current user if not in top 5 */}
                {currentUserEntry && !topEntries.some(entry => entry.attendantId === currentAttendantId) && (
                    <>
                        <div className="border-t pt-3">
                            <p className="text-xs text-muted-foreground mb-2">Sua posição:</p>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <span className="text-sm font-bold text-primary">
                                            {currentUserEntry.position}
                                        </span>
                                    </div>
                                    
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                            {currentUserEntry.attendantName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate text-primary">
                                            {currentUserEntry.attendantName} (Você)
                                        </p>
                                        {currentUserEntry.department && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {currentUserEntry.department}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-yellow-500" />
                                        <span className="font-medium">
                                            {currentUserEntry.totalXp.toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    <Badge variant="outline" className="text-xs">
                                        Nível {currentUserEntry.level}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}