"use client";

import { useEffect, useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';

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

interface StoredNotification {
  id: string;
  data: XpAvulsoNotificationData;
  timestamp: Date;
  read: boolean;
}

export function useXpAvulsoNotifications(attendantId: string) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Carregar notificações do localStorage
  const loadNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem(`xp-avulso-notifications-${attendantId}`);
      if (stored) {
        const parsed = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: StoredNotification) => !n.read).length);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  }, [attendantId]);

  // Salvar notificações no localStorage
  const saveNotifications = useCallback((notifs: StoredNotification[]) => {
    try {
      localStorage.setItem(`xp-avulso-notifications-${attendantId}`, JSON.stringify(notifs));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    }
  }, [attendantId]);

  // Adicionar nova notificação
  const addNotification = useCallback((data: XpAvulsoNotificationData) => {
    const newNotification: StoredNotification = {
      id: Math.random().toString(36).substring(2, 15),
      data,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Manter apenas 50 notificações
      saveNotifications(updated);
      return updated;
    });

    // Mostrar toast para notificação principal
    toast({
      title: "🎁 XP Recebido!",
      description: `Você recebeu ${data.xpAmount} XP por "${data.typeName}"`,
      duration: 6000
    });

    // Mostrar toast para subida de nível
    if (data.levelUp) {
      setTimeout(() => {
        toast({
          title: "🎉 Subiu de Nível!",
          description: `Parabéns! Você alcançou o nível ${data.levelUp!.newLevel}!`,
          duration: 8000
        });
      }, 1000);
    }

    // Mostrar toasts para conquistas desbloqueadas
    if (data.achievementsUnlocked && data.achievementsUnlocked.length > 0) {
      data.achievementsUnlocked.forEach((achievement, index) => {
        setTimeout(() => {
          toast({
            title: "🏆 Conquista Desbloqueada!",
            description: `${achievement.title} - ${achievement.description}`,
            duration: 10000
          });
        }, (index + 2) * 1000); // Começar após a notificação de nível
      });
    }
  }, [saveNotifications]);

  // Marcar notificação como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Remover notificação
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Limpar todas as notificações
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(`xp-avulso-notifications-${attendantId}`);
  }, [attendantId]);

  // Listener para eventos de XP avulso
  useEffect(() => {
    loadNotifications();

    const handleXpAvulsoGranted = (event: CustomEvent<XpAvulsoNotificationData>) => {
      addNotification(event.detail);
    };

    window.addEventListener('xp-avulso-granted', handleXpAvulsoGranted as EventListener);

    return () => {
      window.removeEventListener('xp-avulso-granted', handleXpAvulsoGranted as EventListener);
    };
  }, [attendantId, loadNotifications, addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    loadNotifications
  };
}

// Função utilitária para disparar evento de notificação
export const triggerXpAvulsoNotification = (data: XpAvulsoNotificationData) => {
  const event = new CustomEvent('xp-avulso-granted', { detail: data });
  window.dispatchEvent(event);
};

// Hook para escutar notificações em tempo real (pode ser usado com WebSocket no futuro)
export function useXpAvulsoRealTimeNotifications(attendantId: string) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Aqui poderia ser implementado WebSocket ou Server-Sent Events
    // para notificações em tempo real
    
    // Por enquanto, simular conexão
    setIsConnected(true);

    // Cleanup
    return () => {
      setIsConnected(false);
    };
  }, [attendantId]);

  return {
    isConnected
  };
}