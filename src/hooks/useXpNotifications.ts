"use client";

import { useEffect, useCallback } from 'react';
import { useNotifications } from '@/providers/NotificationProvider';

interface XpNotificationData {
  attendantId: string;
  xpAmount: number;
  typeName: string;
  justification?: string;
  achievementsUnlocked?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

export function useXpNotifications() {
  const { notifyXpReceived, addNotification } = useNotifications();

  const notifyXpGrant = useCallback((data: XpNotificationData) => {
    // Notificar XP recebido
    notifyXpReceived(data.xpAmount, data.typeName, data.justification);

    // Notificar conquistas desbloqueadas se houver
    if (data.achievementsUnlocked && data.achievementsUnlocked.length > 0) {
      data.achievementsUnlocked.forEach((achievement, index) => {
        setTimeout(() => {
          addNotification({
            type: 'success',
            title: '🏆 Conquista Desbloqueada!',
            message: `${achievement.title} - ${achievement.description}`,
            duration: 10000,
            data: { achievement }
          });
        }, (index + 1) * 1000); // Escalonar notificações de conquistas
      });
    }
  }, [notifyXpReceived, addNotification]);

  const notifyLevelUp = useCallback((newLevel: number, xpAmount: number) => {
    addNotification({
      type: 'success',
      title: '🎉 Subiu de Nível!',
      message: `Parabéns! Você alcançou o nível ${newLevel} com ${xpAmount} XP!`,
      duration: 8000,
      data: { newLevel, xpAmount }
    });
  }, [addNotification]);

  // Listener para eventos de XP (pode ser usado com WebSocket ou polling)
  useEffect(() => {
    // Aqui poderia ser implementado um listener para eventos em tempo real
    // Por exemplo, WebSocket ou Server-Sent Events
    
    const handleXpEvent = (event: CustomEvent<XpNotificationData>) => {
      notifyXpGrant(event.detail);
    };

    const handleLevelUpEvent = (event: CustomEvent<{ level: number; xp: number }>) => {
      notifyLevelUp(event.detail.level, event.detail.xp);
    };

    // Adicionar listeners para eventos customizados
    window.addEventListener('xp-granted', handleXpEvent as EventListener);
    window.addEventListener('level-up', handleLevelUpEvent as EventListener);

    return () => {
      window.removeEventListener('xp-granted', handleXpEvent as EventListener);
      window.removeEventListener('level-up', handleLevelUpEvent as EventListener);
    };
  }, [notifyXpGrant, notifyLevelUp]);

  return {
    notifyXpGrant,
    notifyLevelUp
  };
}

// Funções utilitárias para disparar eventos de XP
export const triggerXpGrantedEvent = (data: XpNotificationData) => {
  const event = new CustomEvent('xp-granted', { detail: data });
  window.dispatchEvent(event);
};

export const triggerLevelUpEvent = (level: number, xp: number) => {
  const event = new CustomEvent('level-up', { detail: { level, xp } });
  window.dispatchEvent(event);
};