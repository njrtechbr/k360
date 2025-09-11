"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock, Unlock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { AchievementCardProps } from "./types";

const difficultyColors = {
  easy: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hard: "bg-orange-100 text-orange-800 border-orange-200",
  legendary: "bg-purple-100 text-purple-800 border-purple-200",
};

const difficultyLabels = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  legendary: "Lendário",
};

export default function AchievementCard({
  achievement,
  attendantAchievement,
  showProgress = true,
  showActions = false,
  onUnlock,
  className,
}: AchievementCardProps) {
  const isUnlocked = attendantAchievement?.unlockedAt != null;
  const progress = attendantAchievement
    ? (attendantAchievement.progress / attendantAchievement.maxProgress) * 100
    : 0;
  const canUnlock =
    attendantAchievement &&
    attendantAchievement.progress >= attendantAchievement.maxProgress &&
    !isUnlocked;

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isUnlocked && "border-yellow-200 bg-yellow-50/50",
        canUnlock && "border-green-200 bg-green-50/50",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                isUnlocked ? "bg-yellow-100" : "bg-muted",
              )}
            >
              {isUnlocked ? (
                <Trophy className="h-6 w-6 text-yellow-600" />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-1">
              <CardTitle
                className={cn(
                  "text-lg",
                  !isUnlocked && "text-muted-foreground",
                )}
              >
                {achievement.name}
              </CardTitle>
              <CardDescription
                className={cn(!isUnlocked && "text-muted-foreground/70")}
              >
                {achievement.description}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className={difficultyColors[achievement.difficulty]}
            >
              {difficultyLabels[achievement.difficulty]}
            </Badge>

            <div className="flex items-center gap-1 text-sm font-medium">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span>{achievement.xpReward} XP</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showProgress && attendantAchievement && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {attendantAchievement.progress} /{" "}
                {attendantAchievement.maxProgress}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {progress.toFixed(1)}% completo
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2 pt-2">
            {canUnlock && onUnlock && (
              <Button
                size="sm"
                onClick={() => onUnlock(achievement.id)}
                className="flex items-center gap-1"
              >
                <Unlock className="h-3 w-3" />
                Desbloquear
              </Button>
            )}

            {isUnlocked && (
              <Badge variant="default" className="bg-green-500">
                <Trophy className="h-3 w-3 mr-1" />
                Desbloqueado
              </Badge>
            )}
          </div>
        )}

        {achievement.category && (
          <div className="pt-2 border-t">
            <Badge variant="secondary" className="text-xs">
              {achievement.category}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
