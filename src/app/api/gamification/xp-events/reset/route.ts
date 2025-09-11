import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// DELETE /api/gamification/xp-events/reset
// Resetar todos os dados de XP (eventos e conquistas desbloqueadas)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (apenas ADMIN e SUPERADMIN)
    // TODO: Implementar verificação de role quando o sistema de usuários estiver completo

    // Contar registros antes da exclusão
    const [xpEventsCount, unlockedAchievementsCount] = await Promise.all([
      prisma.xpEvent.count(),
      prisma.unlockedAchievement.count(),
    ]);

    // Deletar APENAS dados de gamificação (XP e conquistas) em uma transação
    // IMPORTANTE: Esta operação NÃO deleta avaliações, atendentes ou outras configurações
    await prisma.$transaction(async (tx) => {
      // Deletar conquistas desbloqueadas (troféus conquistados pelos atendentes)
      await tx.unlockedAchievement.deleteMany({});

      // Deletar eventos de XP (pontos ganhos/perdidos por avaliações e conquistas)
      await tx.xpEvent.deleteMany({});

      // NOTA: Avaliações, atendentes e configurações são mantidas intactas
    });

    return NextResponse.json({
      message: "Dados de XP resetados com sucesso",
      deletedXpEvents: xpEventsCount,
      deletedAchievements: unlockedAchievementsCount,
    });
  } catch (error) {
    console.error("Erro ao resetar dados de XP:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
