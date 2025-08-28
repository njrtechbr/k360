
"use client";

import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { Button } from "./ui/button";
import { ShieldCheck, LogOut, UserCircle, PanelLeft } from "lucide-react";
import { useSidebar } from "./ui/sidebar";

export default function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <Button size="icon" variant="outline" className="sm:hidden" onClick={toggleSidebar}>
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
              <ShieldCheck className="h-6 w-6" />
              <span className="hidden sm:inline">Controle de Acesso</span>
          </Link>
      </div>
      <div className="ml-auto flex items-center gap-2">
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
      </div>
    </header>
  );
}
