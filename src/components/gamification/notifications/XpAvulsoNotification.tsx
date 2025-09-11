"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Trophy,
  Zap,
  CheckCircle,
  X,
  Bell,
  Star,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useXpAvulsoNotifications } from "@/hooks/useXpAvulsoNotifications";

interface XpAvulsoNotificationData {
  xpAmount: number;
  typeName: string;
  justification?: string;
  levelUp?: {
    previousLevel: number;
    newLevel: number;
    totalXp: number;
  };
  achievementsUnlocked?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

interface XpAvulsoNotificationProps {
  attendantId: string;
  onNotificationReceived?: (data: XpAvulsoNotificationData) => void;
  className?: string;
}

export default function XpAvulsoNotification({
  attendantId,
  onNotificationReceived,
  className,
}: XpAvulsoNotificationProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useXpAvulsoNotifications(attendantId);

  // Callback quando nova notificação é recebida
  useEffect(() => {
    if (notifications.length > 0 && onNotificationReceived) {
      const latestNotification = notifications[0];
      if (!latestNotification.read) {
        onNotificationReceived(latestNotification.data);
      }
    }
  }, [notifications, onNotificationReceived]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Botão de notificações */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Painel de notificações */}
      {showNotifications && (
        <Card className="absolute top-full right-0 mt-2 w-96 z-50 shadow-lg max-h-96 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gift className="h-4 w-4 text-blue-500" />
                  Notificações de XP
                </CardTitle>
                <CardDescription>
                  {unreadCount > 0 ? `${unreadCount} não lidas` : "Todas lidas"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs h-6 px-2"
                  >
                    Marcar todas como lidas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <div className="space-y-1">
              {notifications.map((notification, index) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onRemove={() => removeNotification(notification.id)}
                  isLast={index === notifications.length - 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: {
    id: string;
    data: XpAvulsoNotificationData;
    timestamp: Date;
    read: boolean;
  };
  onMarkAsRead: () => void;
  onRemove: () => void;
  isLast: boolean;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
  isLast,
}: NotificationItemProps) {
  const { data, timestamp, read } = notification;

  return (
    <div
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer transition-colors group",
        !read &&
          "bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-l-blue-500",
      )}
      onClick={onMarkAsRead}
    >
      <div className="space-y-3">
        {/* Notificação principal de XP */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Gift className="h-5 w-5 text-blue-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4
                className={cn("text-sm font-medium", !read && "font-semibold")}
              >
                XP Recebido!
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              Você recebeu{" "}
              <span className="font-semibold text-blue-600">
                {data.xpAmount} XP
              </span>{" "}
              por "{data.typeName}"
              {data.justification && (
                <span className="block text-xs mt-1 italic">
                  "{data.justification}"
                </span>
              )}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />+{data.xpAmount} XP
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              {format(timestamp, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
          </div>
        </div>

        {/* Notificação de subida de nível */}
        {data.levelUp && (
          <div className="flex items-start gap-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
            <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                🎉 Subiu de Nível!
              </h5>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Parabéns! Você alcançou o{" "}
                <strong>nível {data.levelUp.newLevel}</strong> com{" "}
                {data.levelUp.totalXp.toLocaleString()} XP!
              </p>
            </div>
          </div>
        )}

        {/* Notificações de conquistas desbloqueadas */}
        {data.achievementsUnlocked && data.achievementsUnlocked.length > 0 && (
          <div className="space-y-2">
            {data.achievementsUnlocked.map((achievement, index) => (
              <div
                key={achievement.id}
                className="flex items-start gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md"
              >
                <Award className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-1">
                    🏆 Conquista Desbloqueada!
                  </h5>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {achievement.title}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {achievement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLast && <div className="border-b border-muted mt-3" />}
    </div>
  );
}

// Função utilitária para disparar evento de notificação
export const triggerXpAvulsoNotification = (data: XpAvulsoNotificationData) => {
  const event = new CustomEvent("xp-avulso-granted", { detail: data });
  window.dispatchEvent(event);
};
