"use client";

import { cn } from "@/lib/utils";
import { getLevelFromXp } from "@/lib/xp";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp } from "lucide-react";
import { XPDisplayProps } from "./types";

export default function XPDisplay({
    currentXp,
    showLevel = true,
    showProgress = true,
    size = 'md',
    variant = 'default',
    className
}: XPDisplayProps) {
    const { level, progress, xpForNextLevel } = getLevelFromXp(currentXp);
    
    const sizeClasses = {
        sm: {
            container: "text-sm",
            xp: "text-lg font-semibold",
            level: "text-xs",
            progress: "h-1"
        },
        md: {
            container: "text-base",
            xp: "text-xl font-bold",
            level: "text-sm",
            progress: "h-2"
        },
        lg: {
            container: "text-lg",
            xp: "text-2xl font-bold",
            level: "text-base",
            progress: "h-3"
        }
    };
    
    const classes = sizeClasses[size];
    
    if (variant === 'compact') {
        return (
            <div className={cn("flex items-center gap-2", classes.container, className)}>
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className={classes.xp}>{currentXp.toLocaleString()} XP</span>
                {showLevel && (
                    <Badge variant="secondary" className={classes.level}>
                        Nível {level}
                    </Badge>
                )}
            </div>
        );
    }
    
    if (variant === 'detailed') {
        return (
            <div className={cn("space-y-3 p-4 border rounded-lg bg-muted/50", className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        <span className={cn("font-medium", classes.container)}>Experiência</span>
                    </div>
                    {showLevel && (
                        <Badge variant="default" className={classes.level}>
                            Nível {level}
                        </Badge>
                    )}
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className={classes.xp}>{currentXp.toLocaleString()} XP</span>
                        {showProgress && (
                            <span className={cn("text-muted-foreground", classes.level)}>
                                {xpForNextLevel.toLocaleString()} XP para próximo nível
                            </span>
                        )}
                    </div>
                    
                    {showProgress && (
                        <div className="space-y-1">
                            <Progress value={progress} className={classes.progress} />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{progress.toFixed(1)}% completo</span>
                                <span>Nível {level + 1}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Default variant
    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className={classes.xp}>{currentXp.toLocaleString()} XP</span>
                {showLevel && (
                    <Badge variant="secondary" className={classes.level}>
                        Nível {level}
                    </Badge>
                )}
            </div>
            
            {showProgress && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso para Nível {level + 1}</span>
                        <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className={classes.progress} />
                </div>
            )}
        </div>
    );
}