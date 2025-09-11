"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Star,
  TrendingDown,
  TrendingUp,
  Award,
  BarChart,
  BadgeCent,
  Crown,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Rocket,
  StarHalf,
  Users,
  Smile,
  HeartHandshake,
  Gem,
  Medal,
  MessageSquareQuote,
  MessageSquarePlus,
  MessageSquareHeart,
  MessageSquareWarning,
  ShieldCheck,
  Component,
  Braces,
  UserCheck,
} from "lucide-react";
import React from "react";
import { INITIAL_ACHIEVEMENTS as achievements } from "@/lib/achievements";
import Link from "next/link";
import { SeasonStatus } from "@/components/gamification";
import { useApi } from "@/providers/ApiProvider";

// Mapeamento de ícones para achievements
const iconMap: Record<string, any> = {
  Award,
  BarChart,
  BadgeCent,
  Crown,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Rocket,
  StarHalf,
  Users,
  Smile,
  HeartHandshake,
  Gem,
  Medal,
  MessageSquareQuote,
  MessageSquarePlus,
  MessageSquareHeart,
  MessageSquareWarning,
  TrendingUp,
  ShieldCheck,
  Star,
  Component,
  Braces,
  UserCheck,
  BookOpen,
};

const getIconComponent = (iconName: string | React.ElementType) => {
  // Se já é um componente React, retorna diretamente
  if (typeof iconName === "function") {
    return iconName;
  }
  // Se é uma string, busca no mapeamento
  if (typeof iconName === "string") {
    return iconMap[iconName] || Trophy;
  }
  // Fallback para Trophy
  return Trophy;
};

export default function ManualGamificacaoPage() {
  const { activeSeason, nextSeason } = useApi();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <BookOpen /> Manual da Gamificação
        </h1>
        <p className="text-lg text-muted-foreground">
          Bem-vindo ao guia completo do nosso sistema de gamificação! Aqui você
          aprenderá como funciona o sistema de Pontos de Experiência (XP),
          Níveis e Troféus.
        </p>
      </div>

      <SeasonStatus activeSeason={activeSeason} nextSeason={nextSeason} />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">O que é Gamificação?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gamificação é o uso de elementos de jogos em contextos que não são
            de jogos, como o nosso ambiente de trabalho. O objetivo é aumentar o
            engajamento, a motivação e o reconhecimento pelo excelente trabalho
            que vocês fazem. Nosso sistema foi projetado para ser divertido,
            justo e para recompensar a busca contínua pela qualidade no
            atendimento.
          </p>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-xl font-semibold">
            Como ganhar e perder Pontos de Experiência (XP)?
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              O XP é o coração do nosso sistema de gamificação. Você ganha (ou
              perde) XP com base nas avaliações de satisfação que recebe dos
              clientes. Além disso, desbloquear Troféus concede um bônus de XP.
            </p>
            <h4 className="font-semibold">Pontuação por Avaliação:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800">
                <CardTitle className="flex items-center gap-2">
                  <Star className="text-yellow-400 fill-yellow-400" /> 5
                  Estrelas
                </CardTitle>
                <CardContent className="p-0 pt-2 flex items-center gap-2 text-lg font-bold text-green-600 dark:text-green-400">
                  <TrendingUp /> +5 XP
                </CardContent>
              </Card>
              <Card className="p-4 bg-lime-50 dark:bg-lime-950/50 border-lime-200 dark:border-lime-800">
                <CardTitle className="flex items-center gap-2">
                  <Star className="text-yellow-400 fill-yellow-400" /> 4
                  Estrelas
                </CardTitle>
                <CardContent className="p-0 pt-2 flex items-center gap-2 text-lg font-bold text-lime-600 dark:text-lime-400">
                  <TrendingUp /> +3 XP
                </CardContent>
              </Card>
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
                <CardTitle className="flex items-center gap-2">
                  <Star className="text-yellow-400 fill-yellow-400" /> 3
                  Estrelas
                </CardTitle>
                <CardContent className="p-0 pt-2 flex items-center gap-2 text-lg font-bold text-blue-600 dark:text-blue-400">
                  <TrendingUp /> +1 XP
                </CardContent>
              </Card>
              <Card className="p-4 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800">
                <CardTitle className="flex items-center gap-2">
                  <Star className="text-yellow-400 fill-yellow-400" /> 2
                  Estrelas
                </CardTitle>
                <CardContent className="p-0 pt-2 flex items-center gap-2 text-lg font-bold text-orange-600 dark:text-orange-400">
                  <TrendingDown /> -2 XP
                </CardContent>
              </Card>
              <Card className="p-4 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800">
                <CardTitle className="flex items-center gap-2">
                  <Star className="text-yellow-400 fill-yellow-400" /> 1 Estrela
                </CardTitle>
                <CardContent className="p-0 pt-2 flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400">
                  <TrendingDown /> -5 XP
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger className="text-xl font-semibold">
            O que são os Níveis e como funcionam?
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              Ao acumular XP, você sobe de nível. Cada nível requer uma
              quantidade maior de XP para ser alcançado, criando uma jornada de
              progressão contínua. Em certos níveis, você desbloqueia
              recompensas especiais, como selos e reconhecimento. Você pode
              acompanhar seu progresso e as próximas recompensas na página de{" "}
              <Link
                href="/dashboard/gamificacao/niveis"
                className="underline font-semibold"
              >
                Níveis e Progresso
              </Link>
              .
            </p>
            <div className="p-4 border rounded-lg flex items-center gap-4">
              <div className="text-blue-500 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 14 4-4" />
                  <path d="M12 14v4" />
                  <path d="M12 14H8" />
                  <path d="M17.5 19.5 19 18l1.5 1.5" />
                  <path d="m12 2-7.89 7.89a2 2 0 0 0 0 2.83L12 22l7.89-7.89a2 2 0 0 0 0-2.83L12 2Z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">Trilha de Recompensas</h4>
                <p className="text-sm text-muted-foreground">
                  Sua jornada de XP desbloqueia níveis e recompensas, desde o
                  Nível 1 até o Nível 50 (Lenda do Atendimento). Acompanhe o{" "}
                  <Link href="/dashboard/gamificacao" className="underline">
                    Leaderboard
                  </Link>{" "}
                  para ver sua posição e continue se esforçando para alcançar o
                  topo!
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger className="text-xl font-semibold">
            O que são os Troféus?
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              Troféus (ou conquistas) são desafios especiais que você pode
              completar para ganhar um **bônus de XP**. Eles reconhecem marcos e
              feitos incríveis, como manter uma alta média de notas ou receber
              muitos feedbacks positivos. Desbloquear troféus é uma ótima
              maneira de acelerar sua progressão de nível.
            </p>
            <h4 className="font-semibold">Exemplos de Troféus:</h4>
            <div className="space-y-2">
              {achievements.slice(0, 4).map((ach) => (
                <Card key={ach.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-muted rounded-full ${ach.color}`}>
                        {React.createElement(getIconComponent(ach.icon), {
                          className: "h-5 w-5",
                        })}
                      </div>
                      <div>
                        <p className="font-semibold">{ach.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">+{ach.xp} XP</Badge>
                  </div>
                </Card>
              ))}
              <p className="text-center text-sm text-muted-foreground pt-2">
                ... e muitos outros! Explore a{" "}
                <Link
                  href="/dashboard/gamificacao"
                  className="underline font-semibold"
                >
                  Galeria de Troféus
                </Link>{" "}
                para ver todos.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
