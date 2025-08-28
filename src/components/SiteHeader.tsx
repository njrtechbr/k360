
"use client";

import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { Button } from "./ui/button";
import { ShieldCheck, LogOut, UserCircle } from "lucide-react";
import { SidebarTrigger } from "./ui/sidebar";

export default function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-card border-b sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden"/>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                <ShieldCheck className="h-6 w-6" />
                <span className="hidden sm:inline">Controle de Acesso</span>
            </Link>
        </div>
        <nav className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, {user.name}
              </span>
               <Button variant="ghost" size="icon" asChild>
                <Link href="/perfil" title="Perfil">
                  <UserCircle />
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={logout} title="Sair">
                <LogOut/>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/registrar">Registrar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
