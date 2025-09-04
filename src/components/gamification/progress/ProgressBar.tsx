"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ProgressBarProps } from "./types";

export default function ProgressBar({
    current,
    max,
    label,
    showNumbers = true,
    showPercentage = true,
    color,
    height = 8,
    animated = true,
    className
}: ProgressBarProps) {
    const percentage = Math.min((current / max) * 100, 100);
    
    const getColorClasses = () => {
        if (color) return color;
        
        if (percentage >= 100) return "bg-green-500";
        if (percentage >= 75) return "bg-blue-500";
        if (percentage >= 50) return "bg-yellow-500";
        if (percentage >= 25) return "bg-orange-500";
        return "bg-red-500";
    };
    
    return (
        <div className={cn("space-y-2", className)}>
            {(label || showNumbers || showPercentage) && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                        {showNumbers && (
                            <span className="font-medium">
                                {current.toLocaleString()} / {max.toLocaleString()}
                            </span>
                        )}
                        {showPercentage && (
                            <span className="text-muted-foreground">
                                {percentage.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            <div className="relative">
                <div 
                    className="w-full bg-muted rounded-full overflow-hidden"
                    style={{ height: `${height}px` }}
                >
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out",
                            getColorClasses(),
                            animated && "transition-all duration-500"
                        )}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                
                {/* Glow effect for completed progress */}
                {percentage >= 100 && (
                    <div 
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                            background: `linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.3), transparent)`,
                            height: `${height}px`
                        }}
                    />
                )}
            </div>
        </div>
    );
}