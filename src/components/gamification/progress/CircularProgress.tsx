"use client";

import { cn } from "@/lib/utils";
import { CircularProgressProps } from "./types";

export default function CircularProgress({
    current,
    max,
    size = 120,
    strokeWidth = 8,
    color,
    backgroundColor = "#e5e7eb",
    showValue = true,
    showPercentage = true,
    label,
    animated = true,
    className
}: CircularProgressProps) {
    const percentage = Math.min((current / max) * 100, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    const getColor = () => {
        if (color) return color;
        
        if (percentage >= 100) return "#10b981"; // green-500
        if (percentage >= 75) return "#3b82f6"; // blue-500
        if (percentage >= 50) return "#eab308"; // yellow-500
        if (percentage >= 25) return "#f97316"; // orange-500
        return "#ef4444"; // red-500
    };
    
    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    className="transform -rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={backgroundColor}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={getColor()}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={cn(
                            animated && "transition-all duration-500 ease-out"
                        )}
                        style={{
                            filter: percentage >= 100 ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' : 'none'
                        }}
                    />
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {showValue && (
                        <div className="font-bold text-lg">
                            {current.toLocaleString()}
                        </div>
                    )}
                    {showPercentage && (
                        <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}%
                        </div>
                    )}
                </div>
            </div>
            
            {label && (
                <div className="text-sm text-muted-foreground text-center">
                    {label}
                </div>
            )}
        </div>
    );
}