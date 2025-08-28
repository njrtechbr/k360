
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-secondary/50">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-lg border-2 border-primary/10">
          <CardHeader className="text-center">
            <h1 className="text-4xl font-headline font-bold text-primary-foreground bg-primary -mx-6 -mt-6 py-4 rounded-t-lg mb-2">
              Bem-vindo ao Controle de Acesso
            </h1>
            <CardDescription className="text-lg">
              Um sistema robusto para gerenciar usuários e permissões com segurança e eficiência.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-8 text-muted-foreground">
              Acesse sua conta ou crie um novo registro para começar.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="font-bold text-lg">
                <Link href="/login">
                  <KeyRound className="mr-2 h-5 w-5" />
                  Login
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="font-bold text-lg">
                <Link href="/registrar">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Registrar
                </Link>
              </Button>
            </div>
            <div className="text-center mt-8">
              <Link href="/criar-superadmin" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                É o primeiro acesso? Crie um Super Admin.
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
