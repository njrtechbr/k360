"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { triggerXpGrantedEvent, triggerLevelUpEvent } from "@/hooks/useXpNotifications";
import { Gift, Trophy, Zap } from "lucide-react";

interface XpNotificationDemoProps {
  attendantId: string;
}

export default function XpNotificationDemo({ attendantId }: XpNotificationDemoProps) {
  const handleTestXpGrant = () => {
    triggerXpGrantedEvent({
      attendantId,
      xpAmount: 50,
      typeName: "Excelência no Atendimento",
      justification: "Atendimento excepcional ao cliente"
    });
  };

  const handleTestLevelUp = () => {
    triggerLevelUpEvent(5, 2500);
  };

  const handleTestMultipleNotifications = () => {
    // XP Grant
    triggerXpGrantedEvent({
      attendantId,
      xpAmount: 100,
      typeName: "Iniciativa Própria",
      justification: "Proposta de melhoria implementada"
    });

    // Level up após 2 segundos
    setTimeout(() => {
      triggerLevelUpEvent(6, 3000);
    }, 2000);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Teste de Notificações
        </CardTitle>
        <CardDescription>
          Teste o sistema de notificações de XP
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Button
          onClick={handleTestXpGrant}
          className="w-full justify-start"
          variant="outline"
        >
          <Gift className="h-4 w-4 mr-2" />
          Testar XP Recebido
        </Button>

        <Button
          onClick={handleTestLevelUp}
          className="w-full justify-start"
          variant="outline"
        >
          <Trophy className="h-4 w-4 mr-2" />
          Testar Subida de Nível
        </Button>

        <Button
          onClick={handleTestMultipleNotifications}
          className="w-full justify-start"
          variant="outline"
        >
          <Zap className="h-4 w-4 mr-2" />
          Testar Múltiplas Notificações
        </Button>
      </CardContent>
    </Card>
  );
}