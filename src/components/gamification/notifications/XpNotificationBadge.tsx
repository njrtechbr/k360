"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Gift, 
  Trophy, 
  X, 
  CheckCircle,
  Calendar,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface XpNotification {
  id: string;
  type: 'xp_grant' | 'level_up' | 'achievement';
  title: string;
  message: string;
  xpAmount?: number;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface XpNotificationBadgeProps {
  attendantId: string;
  className?: string;
}

export default function XpNotificationBadge({ attendantId, className }: XpNotificationBadgeProps) {
  const [notifications, setNotifications] = useState<XpNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Carregar notificações do localStorage
    loadNotifications();

    // Listener para novos eventos de XP
    const handleXpGranted = (event: CustomEvent) => {
      const { xpAmount, typeName, justification } = event.detail;
      addNotification({
        type: 'xp_grant',
        title: 'XP Recebido!',
        message: `Você recebeu ${xpAmount} XP por "${typeName}"${justification ? ` - ${justification}` : ''}`,
        xpAmount,
        data: event.detail
      });
    };

    const handleLevelUp = (event: CustomEvent) => {
      const { level, xp } = event.detail;
      addNotification({
        type: 'level_up',
        title: 'Subiu de Nível!',
        message: `Parabéns! Você alcançou o nível ${level}!`,
        data: { level, xp }
      });
    };

    window.addEventListener('xp-granted', handleXpGranted as EventListener);
    window.addEventListener('level-up', handleLevelUp as EventListener);

    return () => {
      window.removeEventListener('xp-granted', handleXpGranted as EventListener);
      window.removeEventListener('level-up', handleLevelUp as EventListener);
    };
  }, [attendantId]);

  const loadNotifications = () => {
    const stored = localStorage.getItem(`xp-notifications-${attendantId}`);
    if (stored) {
      const parsed = JSON.parse(stored).map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: XpNotification) => !n.read).length);
    }
  };

  const saveNotifications = (newNotifications: XpNotification[]) => {
    localStorage.setItem(`xp-notifications-${attendantId}`, JSON.stringify(newNotifications));
    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  };

  const addNotification = (notification: Omit<XpNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: XpNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date(),
      read: false
    };

    const updated = [newNotification, ...notifications].slice(0, 50); // Manter apenas 50 notificações
    saveNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const getIcon = (type: XpNotification['type']) => {
    switch (type) {
      case 'xp_grant':
        return <Gift className="h-4 w-4 text-blue-500" />;
      case 'level_up':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'achievement':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notificações de XP</CardTitle>
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
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {notifications.length > 0 && (
              <CardDescription>
                {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma notificação ainda
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={cn(
                          "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                          !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={cn(
                                "text-sm font-medium",
                                !notification.read && "font-semibold"
                              )}>
                                {notification.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearNotification(notification.id);
                                }}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            
                            {notification.xpAmount && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  +{notification.xpAmount} XP
                                </Badge>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(notification.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}