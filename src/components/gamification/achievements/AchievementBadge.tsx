"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { AchievementBadgeProps } from "./types";

const difficultyColors = {
    easy: "border-green-400 bg-green-100",
    medium: "border-yellow-400 bg-yellow-100",
    hard: "border-orange-400 bg-orange-100",
    legendary: "border-purple-400 bg-purple-100"
};

const difficultyLabels = {
    easy: "Fácil",
    medium: "Médio",
    hard: "Difícil",
    legendary: "Lendário"
};

export default function AchievementBadge({
    achievement,
    isUnlocked = false,
    size = 'md',
    showTooltip = true,
    className
}: AchievementBadgeProps) {
    const sizeClasses = {
        sm: {
            container: "h-8 w-8",
            icon: "h-3 w-3"
        },
        md: {
            container: "h-12 w-12",
            icon: "h-5 w-5"
        },
        lg: {
            container: "h-16 w-16",
            icon: "h-7 w-7"
        }
    };
    
    const classes = sizeClasses[size];
    
    const badgeContent = (
        <div className={cn(
            "rounded-full border-2 flex items-center justify-center transition-all duration-200",
            classes.container,
            isUnlocked 
                ? difficultyColors[achievement.difficulty]
                : "border-muted bg-muted/50",
            isUnlocked && "hover:scale-105 cursor-pointer",
            className
        )}>
            {isUnlocked ? (
                <Trophy className={cn(
                    classes.icon,
                    achievement.difficulty === 'easy' && "text-green-600",
                    achievement.difficulty === 'medium' && "text-yellow-600",
                    achievement.difficulty === 'hard' && "text-orange-600",
                    achievement.difficulty === 'legendary' && "text-purple-600"
                )} />
            ) : (
                <Lock className={cn(classes.icon, "text-muted-foreground")} />
            )}
        </div>
    );
    
    if (!showTooltip) {
        return badgeContent;
    }
    
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {badgeContent}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{achievement.name}</p>
                        <div className="flex items-center gap-1 text-xs">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            <span>{achievement.xpReward}</span>
                        </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                        {achievement.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            {difficultyLabels[achievement.difficulty]}
                        </span>
                        
                        {achievement.category && (
                            <span className="text-muted-foreground">
                                {achievement.category}
                            </span>
                        )}
                    </div>
                    
                    {isUnlocked && (
                        <div className="text-xs text-green-600 font-medium">
                            ✓ Desbloqueado
                        </div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}