"use client";

import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelBadgeProps } from "./types";

const getLevelColor = (level: number) => {
    if (level >= 50) return "bg-purple-100 text-purple-800 border-purple-300";
    if (level >= 40) return "bg-pink-100 text-pink-800 border-pink-300";
    if (level >= 30) return "bg-red-100 text-red-800 border-red-300";
    if (level >= 20) return "bg-orange-100 text-orange-800 border-orange-300";
    if (level >= 10) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (level >= 5) return "bg-green-100 text-green-800 border-green-300";
    return "bg-blue-100 text-blue-800 border-blue-300";
};

export default function LevelBadge({
    level,
    size = 'md',
    variant = 'default',
    showIcon = true,
    className
}: LevelBadgeProps) {
    const sizeClasses = {
        sm: {
            badge: "text-xs px-2 py-1",
            icon: "h-3 w-3"
        },
        md: {
            badge: "text-sm px-3 py-1",
            icon: "h-4 w-4"
        },
        lg: {
            badge: "text-base px-4 py-2",
            icon: "h-5 w-5"
        }
    };
    
    const classes = sizeClasses[size];
    
    const getVariantClasses = () => {
        switch (variant) {
            case 'outlined':
                return cn(
                    "bg-transparent border-2",
                    getLevelColor(level).replace('bg-', 'border-').replace('text-', 'text-')
                );
            case 'filled':
                return getLevelColor(level);
            default:
                return getLevelColor(level);
        }
    };
    
    return (
        <Badge 
            variant="outline"
            className={cn(
                "font-semibold flex items-center gap-1",
                classes.badge,
                getVariantClasses(),
                className
            )}
        >
            {showIcon && (
                <Shield className={classes.icon} />
            )}
            Nível {level}
        </Badge>
    );
}