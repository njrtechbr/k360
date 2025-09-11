"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import { XPCounterProps } from "./types";

export default function XPCounter({
  xp,
  animated = true,
  showIcon = true,
  size = "md",
  className,
}: XPCounterProps) {
  const [displayXp, setDisplayXp] = useState(animated ? 0 : xp);

  const sizeClasses = {
    sm: {
      text: "text-sm font-medium",
      icon: "h-3 w-3",
    },
    md: {
      text: "text-lg font-bold",
      icon: "h-4 w-4",
    },
    lg: {
      text: "text-2xl font-bold",
      icon: "h-6 w-6",
    },
  };

  const classes = sizeClasses[size];

  useEffect(() => {
    if (!animated) {
      setDisplayXp(xp);
      return;
    }

    const duration = 1000; // 1 second
    const steps = 60;
    const stepValue = (xp - displayXp) / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const startValue = displayXp;

    const timer = setInterval(() => {
      currentStep++;

      if (currentStep >= steps) {
        setDisplayXp(xp);
        clearInterval(timer);
      } else {
        setDisplayXp(Math.round(startValue + stepValue * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [xp, animated, displayXp]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && <Zap className={cn("text-yellow-500", classes.icon)} />}
      <span className={cn("tabular-nums", classes.text)}>
        {displayXp.toLocaleString()}
      </span>
      <span className={cn("text-muted-foreground", classes.text)}>XP</span>
    </div>
  );
}
