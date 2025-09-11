"use client";

import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Gift, Trophy, Award, Zap } from "lucide-react";

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

interface XpAvulsoToastProps {
  attendantId: string;
  attendantName?: string;
}

export default function XpAvulsoToast({
  attendantId,
  attendantName,
}: XpAvulsoToastProps) {
  useEffect(() => {
    const handleXpAvulsoGranted = (
      event: CustomEvent<XpAvulsoNotificationData>,
    ) => {
      const data = event.detail;

      // Toast principal de XP recebido
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-500" />
            <span>XP Recebido!</span>
          </div>
        ),
        description: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>
                {attendantName ? `${attendantName} recebeu` : "Você recebeu"}{" "}
                <strong>{data.xpAmount} XP</strong> por "{data.typeName}"
              </span>
            </div>
            {data.justification && (
              <div className="text-sm text-muted-foreground italic">
                "{data.justification}"
              </div>
            )}
          </div>
        ),
        duration: 6000,
        className: "border-l-4 border-l-blue-500",
      });

      // Toast de subida de nível (com delay)
      if (data.levelUp) {
        setTimeout(() => {
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>🎉 Subiu de Nível!</span>
              </div>
            ),
            description: (
              <div className="space-y-1">
                <div>
                  Parabéns!{" "}
                  {attendantName
                    ? `${attendantName} alcançou`
                    : "Você alcançou"}{" "}
                  o <strong>nível {data.levelUp.newLevel}</strong>!
                </div>
                <div className="text-sm text-muted-foreground">
                  Total de XP: {data.levelUp.totalXp.toLocaleString()}
                </div>
              </div>
            ),
            duration: 8000,
            className:
              "border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20",
          });
        }, 1500);
      }

      // Toasts de conquistas desbloqueadas (com delays escalonados)
      if (data.achievementsUnlocked && data.achievementsUnlocked.length > 0) {
        data.achievementsUnlocked.forEach((achievement, index) => {
          setTimeout(
            () => {
              toast({
                title: (
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-500" />
                    <span>🏆 Conquista Desbloqueada!</span>
                  </div>
                ),
                description: (
                  <div className="space-y-1">
                    <div className="font-semibold text-green-700 dark:text-green-300">
                      {achievement.title}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {achievement.description}
                    </div>
                    {attendantName && (
                      <div className="text-xs text-muted-foreground">
                        Desbloqueada por {attendantName}
                      </div>
                    )}
                  </div>
                ),
                duration: 10000,
                className:
                  "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
              });
            },
            (data.levelUp ? 3000 : 1500) + index * 1500,
          ); // Delay adicional se houver level up
        });
      }
    };

    // Adicionar listener
    window.addEventListener(
      "xp-avulso-granted",
      handleXpAvulsoGranted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "xp-avulso-granted",
        handleXpAvulsoGranted as EventListener,
      );
    };
  }, [attendantId, attendantName]);

  // Este componente não renderiza nada visualmente
  return null;
}

// Componente para usar em contextos administrativos
export function XpAvulsoAdminToast() {
  useEffect(() => {
    const handleXpAvulsoGranted = (
      event: CustomEvent<XpAvulsoNotificationData & { attendantName?: string }>,
    ) => {
      const data = event.detail;

      // Toast de confirmação para administrador
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-500" />
            <span>XP Concedido com Sucesso!</span>
          </div>
        ),
        description: (
          <div className="space-y-2">
            <div>
              <strong>{data.xpAmount} XP</strong> concedido para{" "}
              <strong>{data.attendantName || "atendente"}</strong>
            </div>
            <div className="text-sm text-muted-foreground">
              Tipo: {data.typeName}
            </div>
            {data.justification && (
              <div className="text-sm text-muted-foreground italic">
                "{data.justification}"
              </div>
            )}
            {data.levelUp && (
              <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                🎉 Atendente subiu para o nível {data.levelUp.newLevel}!
              </div>
            )}
            {data.achievementsUnlocked &&
              data.achievementsUnlocked.length > 0 && (
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  🏆 {data.achievementsUnlocked.length} conquista(s)
                  desbloqueada(s)!
                </div>
              )}
          </div>
        ),
        duration: 8000,
        className: "border-l-4 border-l-blue-500",
      });
    };

    // Adicionar listener
    window.addEventListener(
      "xp-avulso-admin-granted",
      handleXpAvulsoGranted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "xp-avulso-admin-granted",
        handleXpAvulsoGranted as EventListener,
      );
    };
  }, []);

  return null;
}

// Função para disparar notificação administrativa
export const triggerXpAvulsoAdminNotification = (
  data: XpAvulsoNotificationData & { attendantName?: string },
) => {
  const event = new CustomEvent("xp-avulso-admin-granted", { detail: data });
  window.dispatchEvent(event);
};
