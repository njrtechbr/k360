import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeyRound, UserPlus } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 pb-4">
          Koerner 360
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Uma plataforma robusta e moderna para gerenciar equipes, permissões,
          módulos e avaliações com total segurança e eficiência.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            asChild
            size="lg"
            className="font-bold text-lg w-full sm:w-auto"
          >
            <Link href="/login">
              <KeyRound className="mr-2 h-5 w-5" />
              Entrar
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="font-bold text-lg w-full sm:w-auto"
          >
            <Link href="/registrar">
              <UserPlus className="mr-2 h-5 w-5" />
              Registrar Nova Conta
            </Link>
          </Button>
        </div>
        <div className="mt-12">
          <Link
            href="/criar-superadmin"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            É o primeiro acesso? Configure o Super Admin para iniciar.
          </Link>
        </div>
      </div>
    </div>
  );
}
