

"use client";

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { levelRewards } from '@/lib/achievements';
import { getLevelFromXp } from '@/lib/xp';
import { cn } from '@/lib/utils';
import { Shield, Trophy } from 'lucide-react';

type RewardTrackProps = {
    currentXp?: number;
    showAttendantProgress?: boolean;
}

const RewardTrack: React.FC<RewardTrackProps> = ({ currentXp = 0, showAttendantProgress = true }) => {

    const { level, progress, xpForNextLevel } = getLevelFromXp(currentXp);

    const levelMilestones = [...new Set([1, ...levelRewards.map(r => r.level), 50])].sort((a, b) => a - b);


    return (
        <div className="space-y-6">
            {showAttendantProgress && (
                 <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/50">
                    <div>
                        <p className="text-sm text-muted-foreground">Nível Atual</p>
                        <p className="text-2xl font-bold flex items-center gap-2">
                           <Shield className="h-6 w-6 text-blue-500"/> Nível {level}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Progresso para Nível {level + 1}</p>
                        <p className="text-lg font-bold">{currentXp} / {xpForNextLevel} XP</p>
                         <Progress value={progress} className="w-40 h-1.5 mt-1" />
                    </div>
                </div>
            )}
            
            <div className="relative w-full pt-4">
                {/* Progress Bar */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-2 bg-muted rounded-full">
                    <div 
                        className="h-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500" 
                        style={{ width: showAttendantProgress ? `${progress}%` : '0%' }}
                    ></div>
                </div>

                {/* Milestones */}
                <div className="relative flex justify-between items-start">
                    {levelMilestones.map((milestoneLevel) => {
                        const isUnlocked = level >= milestoneLevel;
                        const milestoneRewards = levelRewards.filter(a => a.level === milestoneLevel);
                        
                        if (milestoneRewards.length === 0 && milestoneLevel !== 50) return null;

                        if (milestoneLevel === 50) {
                             return (
                                 <div key={milestoneLevel} className="flex flex-col items-center z-10">
                                     <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border-4", isUnlocked ? `bg-amber-100 border-amber-400` : "bg-muted border-border")}>
                                        <Trophy className={cn("h-5 w-5", isUnlocked ? 'text-amber-500' : 'text-muted-foreground')} />
                                     </div>
                                     <span className={cn("mt-2 text-sm text-center font-semibold w-20", isUnlocked ? "text-primary" : "text-muted-foreground")}>
                                        Nível Máximo
                                    </span>
                                 </div>
                             )
                        }
                        
                        return (
                            <div key={milestoneLevel} className="flex flex-col items-center z-10">
                                <div className="flex -space-x-2">
                                     {milestoneRewards.map(reward => (
                                         <Tooltip key={reward.level}>
                                            <TooltipTrigger>
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center border-4",
                                                    isUnlocked ? `bg-amber-100 border-amber-400` : "bg-muted border-border",
                                                )}>
                                                    <reward.icon className={cn(
                                                        "h-5 w-5",
                                                        isUnlocked ? reward.color : "text-muted-foreground"
                                                    )} />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-bold">{reward.title}</p>
                                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                     ))}
                                </div>
                                <span className={cn(
                                    "mt-2 text-sm text-center font-semibold w-20",
                                    isUnlocked ? "text-primary" : "text-muted-foreground"
                                )}>
                                    Nível {milestoneLevel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RewardTrack;
