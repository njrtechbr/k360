import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { XpGrantInterface } from "@/components/gamification/xp/XpGrantInterface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Gift, AlertTriangle, Clock, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Conceder XP Avulso | Dashboard",
  description: "Conceda pontos de experiência extras para reconhecer ações excepcionais dos atendentes",
};

export default async function ConcederXpPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Verificar se usuário tem permissão (ADMIN ou SUPERADMIN)
  if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conceder XP Avulso</h1>
          <p className="text-muted-foreground">
            Reconheça ações e comportamentos excepcionais concedendo pontos de experiência extras
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Sistema de Reconhecimento
        </Badge>
      </div>

      {/* Alertas e Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> O XP avulso só pode ser concedido quando há uma temporada ativa. 
            Verifique se existe uma temporada em andamento antes de prosseguir.
          </AlertDescription>
        </Alert>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Limites diários:</strong> Cada administrador pode conceder até 1.000 pontos 
            e realizar até 50 concessões por dia para manter a integridade do sistema.
          </AlertDescription>
        </Alert>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atendentes Ativos</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Gift size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipos Disponíveis</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suas Concessões Hoje</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos Restantes</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface de Concessão */}
      <XpGrantInterface 
        userId={session.user.id}
        onGrantSuccess={() => {
          // Callback para atualizar estatísticas ou mostrar feedback adicional
          console.log("XP concedido com sucesso!");
        }}
      />

      {/* Informações Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Como Funciona</CardTitle>
            <CardDescription>
              Entenda o processo de concessão de XP avulso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Selecione o Atendente</p>
                <p className="text-sm text-muted-foreground">
                  Escolha o atendente que merece o reconhecimento
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Escolha o Tipo de XP</p>
                <p className="text-sm text-muted-foreground">
                  Selecione o tipo que melhor representa a ação realizada
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Adicione Justificativa</p>
                <p className="text-sm text-muted-foreground">
                  Descreva o motivo da concessão para auditoria
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Confirme a Concessão</p>
                <p className="text-sm text-muted-foreground">
                  Revise os dados e confirme para conceder o XP
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Boas Práticas</CardTitle>
            <CardDescription>
              Diretrizes para uso responsável do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="font-medium text-sm">✅ Faça</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Use tipos específicos para cada situação</li>
                <li>• Sempre adicione uma justificativa clara</li>
                <li>• Reconheça ações realmente excepcionais</li>
                <li>• Mantenha consistência nos critérios</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium text-sm">❌ Evite</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Conceder XP por ações rotineiras</li>
                <li>• Usar o sistema como compensação salarial</li>
                <li>• Conceder grandes quantidades sem justificativa</li>
                <li>• Favorecer sempre os mesmos atendentes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}