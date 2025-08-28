
"use client";

import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { Button } from "./ui/button";
import { ShieldCheck, LogOut, UserCircle, LayoutDashboard } from "lucide-react";

export default function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>Controle de Acesso</span>
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, {user?.name}
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
               <Button variant="ghost" size="sm" asChild>
                <Link href="/perfil">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registrar">Registrar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
